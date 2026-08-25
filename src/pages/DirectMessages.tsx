import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Send, Search, Inbox, Check, X as XIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "react-router-dom";

interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  status: string;
  other_user: {
    user_id: string;
    display_name: string;
    username: string;
    avatar_url: string | null;
  };
  last_message?: string;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export default function DirectMessages() {
  const user = useAuth();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [requests, setRequests] = useState<Conversation[]>([]);
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;
    const { data: convos } = await supabase
      .from("conversations")
      .select("*")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (!convos || convos.length === 0) { setConversations([]); setRequests([]); return; }

    const otherIds = convos.map((c: any) => c.user1_id === user.id ? c.user2_id : c.user1_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", otherIds);

    const profileMap: Record<string, any> = {};
    profiles?.forEach((p: any) => { profileMap[p.user_id] = p; });

    const enriched: Conversation[] = [];
    for (const c of convos as any[]) {
      const otherId = c.user1_id === user.id ? c.user2_id : c.user1_id;
      const { data: lastMsg } = await supabase
        .from("messages")
        .select("content")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", c.id)
        .eq("read", false)
        .neq("sender_id", user.id);

      enriched.push({
        ...c,
        status: (c as any).status || "accepted",
        other_user: profileMap[otherId] || { user_id: otherId, display_name: "Usuário", username: "", avatar_url: null },
        last_message: lastMsg?.[0]?.content || "",
        unread_count: count ?? 0,
      });
    }

    // Separate accepted conversations from pending requests (where I'm the receiver)
    const accepted = enriched.filter(c => c.status === "accepted");
    const pending = enriched.filter(c => {
      if (c.status !== "pending") return false;
      // Show as request only if the OTHER person initiated it
      // The initiator can still see it in their normal list
      // We check: did I send a message? If no messages, I'm the receiver of the request
      return true;
    });

    // For pending: check who initiated by looking at first message or creation
    const myRequests: Conversation[] = [];
    const theirRequests: Conversation[] = [];
    for (const p of pending) {
      const { data: firstMsg } = await supabase
        .from("messages")
        .select("sender_id")
        .eq("conversation_id", p.id)
        .order("created_at", { ascending: true })
        .limit(1);
      
      if (firstMsg && firstMsg.length > 0 && firstMsg[0].sender_id === user.id) {
        // I sent the request - show in my conversations
        accepted.push(p);
      } else {
        // They sent it - show as request to me
        theirRequests.push(p);
      }
    }

    setConversations(accepted);
    setRequests(theirRequests);
  }, [user]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Handle navigation state (open specific conversation)
  useEffect(() => {
    const state = location.state as any;
    if (state?.openConvoId && state?.otherUser) {
      const convo: Conversation = {
        id: state.openConvoId,
        user1_id: "",
        user2_id: "",
        last_message_at: new Date().toISOString(),
        status: "accepted",
        other_user: state.otherUser,
        last_message: "",
        unread_count: 0,
      };
      openConversation(convo);
      // Clear state
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dm-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (activeConvo && msg.conversation_id === activeConvo.id) {
          setMessages((prev) => [...prev, msg]);
          if (msg.sender_id !== user.id) {
            supabase.from("messages").update({ read: true }).eq("id", msg.id).then(() => {});
          }
        }
        fetchConversations();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeConvo, fetchConversations]);

  const openConversation = async (convo: Conversation) => {
    setActiveConvo(convo);
    setLoading(true);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", convo.id)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);
    setLoading(false);
    if (user) {
      await supabase.from("messages").update({ read: true })
        .eq("conversation_id", convo.id)
        .neq("sender_id", user.id)
        .eq("read", false);
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const sendMessage = async () => {
    if (!user || !activeConvo || !newMsg.trim()) return;
    const content = newMsg.trim();
    setNewMsg("");
    await supabase.from("messages").insert({
      conversation_id: activeConvo.id,
      sender_id: user.id,
      content,
    } as any);
    await supabase.from("conversations")
      .update({ last_message_at: new Date().toISOString() } as any)
      .eq("id", activeConvo.id);
  };

  const acceptRequest = async (convo: Conversation) => {
    await supabase.from("conversations")
      .update({ status: "accepted" } as any)
      .eq("id", convo.id);
    toast.success("Solicitação aceita! ✅");
    fetchConversations();
    openConversation({ ...convo, status: "accepted" });
    setShowRequests(false);
  };

  const declineRequest = async (convo: Conversation) => {
    // Delete conversation and its messages
    await supabase.from("messages").delete().eq("conversation_id", convo.id);
    await supabase.from("conversations").delete().eq("id", convo.id);
    toast.success("Solicitação recusada");
    fetchConversations();
  };

  const searchUsers = async (q: string) => {
    setSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
      .neq("user_id", user?.id || "")
      .limit(10);
    setSearchResults(data || []);
  };

  const startConversation = async (otherUser: any) => {
    if (!user) return;
    const ids = [user.id, otherUser.user_id].sort();
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .eq("user1_id", ids[0])
      .eq("user2_id", ids[1])
      .limit(1);

    if (existing && existing.length > 0) {
      const convo: Conversation = {
        ...(existing[0] as any),
        status: (existing[0] as any).status || "accepted",
        other_user: otherUser,
        last_message: "",
        unread_count: 0,
      };
      openConversation(convo);
      setSearch("");
      setSearchResults([]);
      return;
    }

    // Check if they follow us
    const { data: theyFollowUs } = await supabase
      .from("followers")
      .select("id")
      .eq("follower_id", otherUser.user_id)
      .eq("following_id", user.id)
      .maybeSingle();

    const status = theyFollowUs ? "accepted" : "pending";

    const { data: newConvo, error } = await supabase
      .from("conversations")
      .insert({ user1_id: ids[0], user2_id: ids[1], status } as any)
      .select()
      .single();

    if (error) { toast.error("Erro ao iniciar conversa"); return; }

    if (status === "pending") {
      toast.info("Solicitação de mensagem enviada! 📩");
    }

    const convo: Conversation = {
      ...(newConvo as any),
      status,
      other_user: otherUser,
      last_message: "",
      unread_count: 0,
    };
    openConversation(convo);
    setSearch("");
    setSearchResults([]);
    fetchConversations();
  };

  // ===== CHAT VIEW =====
  if (activeConvo) {
    const isPending = activeConvo.status === "pending";
    return (
      <div className="min-h-screen bg-background flex flex-col pb-20">
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => { setActiveConvo(null); fetchConversations(); }} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {activeConvo.other_user.avatar_url ? (
              <img src={activeConvo.other_user.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-foreground">
                {activeConvo.other_user.display_name?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{activeConvo.other_user.display_name}</p>
            {activeConvo.other_user.username && (
              <p className="text-[11px] text-muted-foreground">@{activeConvo.other_user.username}</p>
            )}
          </div>
          {isPending && (
            <span className="ml-auto text-[10px] bg-neon-orange/15 text-neon-orange px-2 py-1 rounded-full font-semibold">
              Pendente
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
          {isPending && messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">Solicitação de mensagem enviada</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Aguardando aprovação...</p>
            </div>
          )}
          {messages.map((msg) => {
            const isMine = msg.sender_id === user?.id;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-secondary text-foreground rounded-bl-md"
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className={`text-[9px] mt-0.5 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="sticky bottom-20 bg-card/95 backdrop-blur-lg border-t border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Mensagem..."
              className="flex-1 rounded-full bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={sendMessage}
              disabled={!newMsg.trim()}
              className="h-10 w-10 rounded-full bg-primary flex items-center justify-center disabled:opacity-50"
            >
              <Send className="h-4 w-4 text-primary-foreground" />
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  // ===== REQUESTS VIEW =====
  if (showRequests) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-lg border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setShowRequests(false)} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold font-display text-foreground">Solicitações</h1>
        </div>

        <div className="px-4 py-2">
          {requests.length === 0 && (
            <div className="text-center py-16">
              <Inbox className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma solicitação</p>
            </div>
          )}
          {requests.map((req) => (
            <div key={req.id} className="flex items-center gap-3 py-3 border-b border-border/50">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {req.other_user.avatar_url ? (
                  <img src={req.other_user.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-foreground">
                    {req.other_user.display_name?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{req.other_user.display_name}</p>
                {req.other_user.username && <p className="text-xs text-muted-foreground">@{req.other_user.username}</p>}
                {req.last_message && <p className="text-xs text-muted-foreground/80 truncate mt-0.5">"{req.last_message}"</p>}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => acceptRequest(req)}
                  className="h-9 w-9 rounded-full bg-primary flex items-center justify-center"
                >
                  <Check className="h-4 w-4 text-primary-foreground" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => declineRequest(req)}
                  className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center border border-border"
                >
                  <XIcon className="h-4 w-4 text-muted-foreground" />
                </motion.button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ===== CONVERSATIONS LIST =====
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold font-display text-foreground">Mensagens</h1>
          {requests.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowRequests(true)}
              className="flex items-center gap-1.5 rounded-full bg-neon-orange/10 border border-neon-orange/20 px-3 py-1.5"
            >
              <Inbox className="h-3.5 w-3.5 text-neon-orange" />
              <span className="text-xs font-bold text-neon-orange">{requests.length} solicitação{requests.length > 1 ? "ões" : ""}</span>
            </motion.button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => searchUsers(e.target.value)}
            placeholder="Buscar usuário..."
            className="w-full rounded-xl bg-secondary pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="px-4 py-2 border-b border-border">
          <p className="text-xs text-muted-foreground mb-2">Resultados</p>
          {searchResults.map((u) => (
            <button
              key={u.user_id}
              onClick={() => startConversation(u)}
              className="w-full flex items-center gap-3 py-2.5 hover:bg-secondary/50 rounded-lg px-2 transition-colors"
            >
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-foreground">{u.display_name?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">{u.display_name}</p>
                {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="px-4 py-2">
        {conversations.length === 0 && !search && (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm">Nenhuma conversa ainda</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Busque alguém para começar!</p>
          </div>
        )}
        {conversations.map((convo) => (
          <motion.button
            key={convo.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => openConversation(convo)}
            className="w-full flex items-center gap-3 py-3 border-b border-border/50 last:border-0"
          >
            <div className="relative h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {convo.other_user.avatar_url ? (
                <img src={convo.other_user.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-foreground">
                  {convo.other_user.display_name?.[0]?.toUpperCase()}
                </span>
              )}
              {convo.unread_count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                  {convo.unread_count}
                </span>
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{convo.other_user.display_name}</p>
                  {convo.unread_count > 0 && (
                    <span className="flex-shrink-0 h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                      {convo.unread_count}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">
                  {formatDistanceToNow(new Date(convo.last_message_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {convo.status === "pending" && (
                  <span className="text-[9px] text-neon-orange font-bold">Pendente · </span>
                )}
                {convo.last_message && (
                  <p className={`text-xs truncate ${convo.unread_count > 0 ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{convo.last_message}</p>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
