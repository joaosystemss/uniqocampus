import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, LogIn, LogOut, Send, Image, Mic, Square, Trash2, Play, Pause } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CommunityMessage {
  id: string;
  community_id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string;
  is_anonymous: boolean;
  created_at: string;
}

interface ProfileInfo {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function CommunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuth();
  const [community, setCommunity] = useState<any>(null);
  const [isMember, setIsMember] = useState(false);
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileInfo>>({});
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchData = useCallback(async () => {
    if (!id) return;
    const [{ data: comm }, { data: members }] = await Promise.all([
      supabase.from("communities").select("*").eq("id", id).single(),
      supabase.from("community_members").select("user_id").eq("community_id", id),
    ]);
    setCommunity(comm);
    setIsMember(!!members?.some((m: any) => m.user_id === user?.id));

    // Fetch messages
    const { data: msgs } = await (supabase as any)
      .from("community_messages")
      .select("*")
      .eq("community_id", id)
      .order("created_at", { ascending: true })
      .limit(200);

    const messageList = (msgs ?? []) as CommunityMessage[];
    setMessages(messageList);

    // Fetch profiles for message authors
    const userIds = [...new Set(messageList.map((m) => m.user_id))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds);
      const profileMap: Record<string, ProfileInfo> = {};
      profs?.forEach((p: any) => { profileMap[p.user_id] = p; });
      setProfiles(profileMap);
    }

    setLoading(false);
  }, [id, user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Mark community as visited for unread tracking
  useEffect(() => {
    if (!id || !user) return;
    const key = `community_visits_${user.id}`;
    const stored = localStorage.getItem(key);
    const visits = stored ? JSON.parse(stored) : {};
    visits[id] = new Date().toISOString();
    localStorage.setItem(key, JSON.stringify(visits));
  }, [id, user, messages.length]);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`community-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages", filter: `community_id=eq.${id}` },
        async (payload) => {
          const newMsg = payload.new as CommunityMessage;
          setMessages((prev) => [...prev, newMsg]);
          // Fetch profile if missing
          if (!profiles[newMsg.user_id]) {
            const { data } = await supabase
              .from("profiles")
              .select("user_id, display_name, username, avatar_url")
              .eq("user_id", newMsg.user_id)
              .single();
            if (data) {
              setProfiles((prev) => ({ ...prev, [data.user_id]: data as ProfileInfo }));
            }
          }
          setTimeout(scrollToBottom, 100);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "community_messages", filter: `community_id=eq.${id}` },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== (payload.old as any).id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => { scrollToBottom(); }, [messages.length]);

  const handleJoin = async () => {
    if (!user || !id) return;
    const { error } = await supabase.from("community_members").insert({
      community_id: id,
      user_id: user.id,
    } as any);
    if (error) { toast.error("Erro ao entrar"); return; }
    toast.success("Você entrou na comunidade! 🎉");
    if (community) {
      await supabase.from("communities").update({
        members_count: (community.members_count || 1) + 1,
      } as any).eq("id", id);
    }
    fetchData();
  };

  const handleLeave = async () => {
    if (!user || !id) return;
    const { error } = await supabase.from("community_members")
      .delete()
      .eq("community_id", id)
      .eq("user_id", user.id);
    if (error) { toast.error("Erro ao sair"); return; }
    toast.success("Você saiu da comunidade");
    if (community) {
      await supabase.from("communities").update({
        members_count: Math.max(0, (community.members_count || 1) - 1),
      } as any).eq("id", id);
    }
    fetchData();
  };

  const uploadMedia = async (file: Blob, type: "image" | "audio"): Promise<string | null> => {
    if (!user) return null;
    const ext = type === "image" ? "jpg" : "webm";
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("community-media")
      .upload(path, file, { contentType: type === "image" ? "image/jpeg" : "audio/webm" });
    if (error) { toast.error("Erro ao enviar mídia"); return null; }
    const { data } = supabase.storage.from("community-media").getPublicUrl(path);
    return data.publicUrl;
  };

  const sendMessage = async (content: string | null, mediaUrl: string | null, mediaType: string) => {
    if (!user || !id) return;
    setSending(true);
    const { error } = await (supabase as any).from("community_messages").insert({
      community_id: id,
      user_id: user.id,
      content,
      media_url: mediaUrl,
      media_type: mediaType,
    });
    if (error) {
      console.error("Send error:", error);
      toast.error("Erro ao enviar mensagem");
    }
    setSending(false);
  };

  const handleSendText = async () => {
    if (!text.trim()) return;
    const msg = text.trim();
    setText("");
    await sendMessage(msg, null, "text");
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSending(true);
    const url = await uploadMedia(file, "image");
    if (url) await sendMessage(null, url, "image");
    setSending(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size > 0) {
          setSending(true);
          const url = await uploadMedia(blob, "audio");
          if (url) await sendMessage(null, url, "audio");
          setSending(false);
        }
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      toast.error("Permissão de microfone negada");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    setRecordingTime(0);
  };

  const handleDeleteMessage = async (msgId: string) => {
    await (supabase as any).from("community_messages").delete().eq("id", msgId);
  };

  const toggleAudio = (url: string) => {
    if (playingAudio === url) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(url);
      audio.onended = () => setPlayingAudio(null);
      audio.play();
      audioRef.current = audio;
      setPlayingAudio(url);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const getProfileName = (userId: string) => {
    const p = profiles[userId];
    return p?.display_name || p?.username || "Usuário";
  };

  const getProfileAvatar = (userId: string) => profiles[userId]?.avatar_url || "";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-muted-foreground">
        <p>Comunidade não encontrada</p>
        <button onClick={() => navigate("/communities")} className="text-primary mt-2 text-sm">Voltar</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/communities")} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-2xl">{community.emoji || "💬"}</span>
            <div className="min-w-0">
              <h1 className="text-base font-bold font-display text-foreground truncate">{community.name}</h1>
              <p className="text-xs text-muted-foreground">{community.members_count} membros</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={isMember ? handleLeave : handleJoin}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
              isMember ? "bg-secondary text-muted-foreground" : "bg-primary text-primary-foreground"
            }`}
          >
            {isMember ? <><LogOut className="h-3.5 w-3.5" /> Sair</> : <><LogIn className="h-3.5 w-3.5" /> Entrar</>}
          </motion.button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3">{community.emoji || "💬"}</span>
            <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {isMember ? "Seja o primeiro a enviar!" : "Entre no grupo para conversar!"}
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.user_id === user?.id;
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
            >
              {!isOwn && (
                <Avatar className="h-7 w-7 mt-1 shrink-0">
                  <AvatarImage src={getProfileAvatar(msg.user_id)} />
                  <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                    {getProfileName(msg.user_id).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className={`max-w-[75%] ${isOwn ? "items-end" : "items-start"} flex flex-col`}>
                {!isOwn && (
                  <span className="text-[10px] text-muted-foreground mb-0.5 px-1 font-medium">
                    {getProfileName(msg.user_id)}
                  </span>
                )}
                <div
                  className={`rounded-2xl px-3 py-2 text-sm relative group ${
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-tr-md"
                      : "bg-secondary text-secondary-foreground rounded-tl-md"
                  }`}
                >
                  {/* Text */}
                  {msg.media_type === "text" && msg.content && (
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}

                  {/* Image */}
                  {msg.media_type === "image" && msg.media_url && (
                    <img
                      src={msg.media_url}
                      alt="Imagem"
                      className="rounded-lg max-w-full max-h-60 object-cover"
                      loading="lazy"
                    />
                  )}

                  {/* Audio */}
                  {msg.media_type === "audio" && msg.media_url && (
                    <button
                      onClick={() => toggleAudio(msg.media_url!)}
                      className={`flex items-center gap-2 min-w-[120px] ${
                        isOwn ? "text-primary-foreground" : "text-foreground"
                      }`}
                    >
                      {playingAudio === msg.media_url ? (
                        <Pause className="h-5 w-5 shrink-0" />
                      ) : (
                        <Play className="h-5 w-5 shrink-0" />
                      )}
                      <div className="flex-1 h-1 rounded-full bg-current/30 relative overflow-hidden">
                        <div className={`h-full bg-current rounded-full ${
                          playingAudio === msg.media_url ? "animate-pulse w-full" : "w-0"
                        }`} />
                      </div>
                      <span className="text-xs">🎤</span>
                    </button>
                  )}

                  {/* Delete button for own messages */}
                  {isOwn && (
                    <button
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="absolute -top-2 -left-2 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground/60 mt-0.5 px-1">
                  {format(new Date(msg.created_at), "HH:mm", { locale: ptBR })}
                </span>
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      {isMember ? (
        <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-lg px-3 py-2 pb-safe">
          {recording ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive animate-pulse" />
                <span className="text-sm text-destructive font-medium">Gravando {formatTime(recordingTime)}</span>
              </div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={stopRecording}
                className="h-10 w-10 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <Square className="h-4 w-4" />
              </motion.button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => fileInputRef.current?.click()}
                className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary shrink-0"
                disabled={sending}
              >
                <Image className="h-5 w-5" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={startRecording}
                className="h-9 w-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary shrink-0"
                disabled={sending}
              >
                <Mic className="h-5 w-5" />
              </motion.button>

              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendText()}
                placeholder="Mensagem..."
                className="flex-1 bg-secondary rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none"
                disabled={sending}
              />

              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleSendText}
                disabled={!text.trim() || sending}
                className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 shrink-0"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            </div>
          )}
        </div>
      ) : (
        <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur-lg px-4 py-4 text-center">
          <p className="text-sm text-muted-foreground mb-2">Entre no grupo para enviar mensagens</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleJoin}
            className="bg-primary text-primary-foreground rounded-full px-6 py-2 text-sm font-semibold"
          >
            <LogIn className="h-4 w-4 inline mr-2" />
            Entrar no grupo
          </motion.button>
        </div>
      )}
    </div>
  );
}
