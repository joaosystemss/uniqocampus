import { useState, useEffect, useCallback } from "react";
import { Flame, PenSquare } from "lucide-react";
import ThreadCard from "@/components/ThreadCard";
import CreatePostModal from "@/components/CreatePostModal";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function Anonymous() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("is_anonymous", true)
      .order("created_at", { ascending: false })
      .limit(50) as any;
    setPosts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-neon-orange" />
            <h1 className="text-xl font-bold font-display text-foreground">Anônimo</h1>
          </div>
        </div>
      </header>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mx-4 mt-3 rounded-xl gradient-anonymous p-4"
      >
        <p className="text-sm font-semibold text-background font-display">🔥 Fale sem filtro</p>
        <p className="text-xs text-background/80 mt-1">Seus posts são 100% anônimos. Ninguém sabe quem você é.</p>
      </motion.div>

      <div className="px-4 py-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setCreateOpen(true)}
          className="flex w-full items-center gap-3 rounded-xl border border-neon-orange/30 bg-card px-4 py-3 text-sm text-muted-foreground hover:border-neon-orange/50 transition-colors"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full gradient-anonymous">
            <PenSquare className="h-4 w-4 text-background" />
          </div>
          Desabafe anonimamente...
        </motion.button>
      </div>

      <section>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center py-16 px-4 text-center">
            <Flame className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">Nenhum desabafo ainda.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Seja o primeiro a desabafar! 🔥</p>
          </div>
        ) : (
          posts.map((post: any) => (
            <ThreadCard
              key={post.id}
              id={post.id}
              author="Anônimo"
              course=""
              time={timeAgo(post.created_at)}
              content={post.content}
              likes={post.likes_count}
              comments={post.comments_count}
              isAnonymous
              tags={post.tags}
              postUserId={post.user_id}
              onUpdate={fetchPosts}
            />
          ))
        )}
      </section>

      <CreatePostModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchPosts}
        forceAnonymous
      />
    </div>
  );
}
