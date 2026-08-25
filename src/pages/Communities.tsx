import { useState, useEffect, useCallback } from "react";
import { Search, Plus, X, Users } from "lucide-react";
import CommunityCard from "@/components/CommunityCard";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

const gradients = ["gradient-primary", "gradient-story", "gradient-match", "gradient-anonymous"];

export default function Communities() {
  const user = useAuth();
  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("💬");
  const [lastMessages, setLastMessages] = useState<Record<string, { content: string | null; created_at: string; media_type: string | null }>>({});
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [lastVisits, setLastVisits] = useState<Record<string, string>>({});

  const fetchCommunities = useCallback(async () => {
    const { data } = await supabase
      .from("communities")
      .select("*")
      .order("members_count", { ascending: false }) as any;
    setCommunities(data ?? []);
    setLoading(false);
  }, []);

  // Fetch last message for each community
  const fetchLastMessages = useCallback(async (communityIds: string[]) => {
    if (!communityIds.length) return;
    const sb = supabase as any;
    const msgs: Record<string, any> = {};
    
    // Fetch last message per community
    const promises = communityIds.map(async (cid) => {
      const { data } = await sb
        .from("community_messages")
        .select("content, created_at, media_type")
        .eq("community_id", cid)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data?.[0]) msgs[cid] = data[0];
    });
    await Promise.all(promises);
    setLastMessages(msgs);
  }, []);

  // Track unread via localStorage
  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(`community_visits_${user.id}`);
    if (stored) setLastVisits(JSON.parse(stored));
  }, [user]);

  // Calculate unread counts
  const fetchUnreadCounts = useCallback(async (communityIds: string[], visits: Record<string, string>) => {
    if (!communityIds.length || !user) return;
    const sb = supabase as any;
    const counts: Record<string, number> = {};
    
    const promises = communityIds.map(async (cid) => {
      const lastVisit = visits[cid] || "1970-01-01T00:00:00Z";
      const { count } = await sb
        .from("community_messages")
        .select("id", { count: "exact", head: true })
        .eq("community_id", cid)
        .gt("created_at", lastVisit)
        .neq("user_id", user.id);
      counts[cid] = count ?? 0;
    });
    await Promise.all(promises);
    setUnreadCounts(counts);
  }, [user]);

  useEffect(() => { fetchCommunities(); }, [fetchCommunities]);

  useEffect(() => {
    if (communities.length > 0) {
      const ids = communities.map((c: any) => c.id);
      fetchLastMessages(ids);
      if (user) fetchUnreadCounts(ids, lastVisits);
    }
  }, [communities, fetchLastMessages, fetchUnreadCounts, user, lastVisits]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("community-list-messages")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "community_messages",
      }, (payload: any) => {
        const msg = payload.new;
        setLastMessages(prev => ({
          ...prev,
          [msg.community_id]: { content: msg.content, created_at: msg.created_at, media_type: msg.media_type }
        }));
        if (user && msg.user_id !== user.id) {
          setUnreadCounts(prev => ({
            ...prev,
            [msg.community_id]: (prev[msg.community_id] || 0) + 1
          }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleCreate = async () => {
    if (!name.trim() || !user) return;
    const { error } = await supabase.from("communities").insert({
      name: name.trim(),
      description: description.trim() || null,
      emoji,
      created_by: user.id,
    } as any);
    if (error) { toast.error("Erro ao criar comunidade"); return; }
    toast.success("Comunidade criada! 🎉");
    setName(""); setDescription(""); setEmoji("💬"); setShowCreate(false);
    fetchCommunities();
  };

  const getPreviewText = (msg: { content: string | null; media_type: string | null } | undefined) => {
    if (!msg) return null;
    if (msg.media_type === "audio") return "🎤 Áudio";
    if (msg.media_type === "image") return "📷 Imagem";
    return msg.content;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold font-display text-foreground">Comunidades</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3 px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : communities.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">Nenhuma comunidade ainda.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Crie a primeira! 🚀</p>
          </div>
        ) : (
          communities.map((c: any, i: number) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <CommunityCard
                id={c.id}
                name={c.name}
                members={c.members_count}
                description={c.description || ""}
                emoji={c.emoji || "💬"}
                gradient={gradients[i % gradients.length]}
                lastMessage={getPreviewText(lastMessages[c.id])}
                lastMessageTime={lastMessages[c.id]?.created_at}
                unreadCount={unreadCounts[c.id] || 0}
              />
            </motion.div>
          ))
        )}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <button onClick={() => setShowCreate(false)} className="text-muted-foreground">
                <X className="h-6 w-6" />
              </button>
              <h2 className="text-base font-bold font-display text-foreground">Nova Comunidade</h2>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleCreate}
                disabled={!name.trim()}
                className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                Criar
              </motion.button>
            </div>
            <div className="flex-1 px-4 pt-6 space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Emoji</label>
                <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-20 text-2xl text-center" maxLength={2} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Eng. de Software" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Do que é essa comunidade?" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
