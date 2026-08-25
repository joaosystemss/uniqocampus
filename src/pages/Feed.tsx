import { useState, useEffect, useCallback } from "react";
import { Search, PenSquare, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import ThreadCard from "@/components/ThreadCard";
import StoriesRow from "@/components/StoriesRow";
import CreatePostModal from "@/components/CreatePostModal";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import uniqoLogo from "@/assets/uniqo-logo-new.png";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function Feed() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [dmPending, setDmPending] = useState(0);
  const user = useAuth();
  const navigate = useNavigate();

  const fetchPosts = useCallback(async () => {
    // Only show posts from the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .gte("created_at", twentyFourHoursAgo)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!postsData) { setPosts([]); setLoading(false); return; }

    // Get unique user_ids for non-anonymous posts
    const userIds = [...new Set(postsData.filter(p => !p.is_anonymous).map(p => p.user_id))];
    
    let profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, course, avatar_url")
        .in("user_id", userIds);
      if (profiles) {
        profiles.forEach(p => { profilesMap[p.user_id] = p; });
      }
    }

    const enriched = postsData.map(post => ({
      ...post,
      profile: profilesMap[post.user_id] || null,
    }));

    setPosts(enriched);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Realtime: auto-refresh feed on new/updated/deleted posts
  useEffect(() => {
    const channel = supabase
      .channel("feed-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        fetchPosts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPosts]);

  const fetchDmPending = useCallback(async () => {
    if (!user) {
      setDmPending(0);
      return;
    }

    const { data: convos } = await supabase
      .from("conversations")
      .select("id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

    const convoIds = (convos ?? []).map((c: any) => c.id);
    if (convoIds.length === 0) {
      setDmPending(0);
      return;
    }

    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convoIds)
      .neq("sender_id", user.id)
      .eq("read", false);

    setDmPending(count ?? 0);
  }, [user]);

  useEffect(() => {
    fetchDmPending();
  }, [fetchDmPending]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`feed-dm-pending-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, fetchDmPending)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, fetchDmPending)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversations" }, fetchDmPending)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchDmPending]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img src={uniqoLogo} alt="Uniqo" className="h-8 w-8 object-contain" />
            <span className="text-xl font-bold tracking-tight text-foreground">Uniqo</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/search")} className="text-muted-foreground hover:text-foreground transition-colors">
              <Search className="h-[22px] w-[22px] stroke-[1.5]" />
            </button>
            <button onClick={() => navigate("/dm")} className="relative text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="h-[22px] w-[22px] stroke-[1.5]" />
              {dmPending > 0 && (
                <span className="absolute -right-1.5 -top-1.5 h-[18px] min-w-[18px] rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground flex items-center justify-center">
                  {dmPending > 9 ? "9+" : dmPending}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Stories */}
      <section className="border-b border-border">
        <StoriesRow />
      </section>

      {/* New Post Button */}
      <div className="px-4 py-3 border-b border-border">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setCreateOpen(true)}
          className="flex w-full items-center gap-3 px-1 py-1 text-sm text-muted-foreground transition-colors"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
            <PenSquare className="h-4 w-4 text-foreground" />
          </div>
          <span className="text-muted-foreground">No que você tá pensando?</span>
        </motion.button>
      </div>

      {/* Feed */}
      <section>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center py-16 px-4 text-center">
            <PenSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-sm">Nenhum post ainda.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Seja o primeiro a postar! 🚀</p>
          </div>
        ) : (
          posts.map((post) => (
            <ThreadCard
              key={post.id}
              id={post.id}
              author={post.is_anonymous ? "Anônimo" : (post.profile?.display_name || post.profile?.username || "Usuário")}
              authorUsername={post.is_anonymous ? undefined : (post.profile?.username || undefined)}
              course={post.is_anonymous ? "" : (post.profile?.course || "")}
              time={timeAgo(post.created_at)}
              content={post.content}
              likes={post.likes_count}
              comments={post.comments_count}
              isAnonymous={post.is_anonymous}
              tags={post.tags}
              mediaUrl={post.media_url}
              mediaType={post.media_type}
              avatarUrl={post.is_anonymous ? null : post.profile?.avatar_url}
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
      />
    </div>
  );
}
