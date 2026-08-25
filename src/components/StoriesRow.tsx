import { useState, useEffect, useCallback } from "react";
import { Plus, Music } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CreateStoryModal from "@/components/CreateStoryModal";
import StoryViewer, { StoryGroup } from "@/components/StoryViewer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function StoriesRow() {
  const user = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [viewingGroupIdx, setViewingGroupIdx] = useState<number | null>(null);

  const fetchStories = useCallback(async () => {
    const { data } = await supabase
      .from("stories")
      .select("*")
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }) as any;

    if (!data || data.length === 0) { setStoryGroups([]); return; }

    const userIds = [...new Set(data.filter((s: any) => !s.is_anonymous).map((s: any) => s.user_id))] as string[];
    let profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds);
      if (profiles) profiles.forEach((p: any) => { profilesMap[p.user_id] = p; });
    }

    const grouped: Record<string, StoryGroup> = {};
    data.forEach((story: any) => {
      const key = story.is_anonymous ? `anon-${story.id}` : story.user_id;
      if (!grouped[key]) {
        const profile = profilesMap[story.user_id];
        grouped[key] = {
          user_id: story.user_id,
          display_name: story.is_anonymous ? "Anônimo" : (profile?.display_name || profile?.username || "Usuário"),
          username: story.is_anonymous ? "?" : (profile?.username || ""),
          avatar_url: story.is_anonymous ? null : (profile?.avatar_url || null),
          is_anonymous: story.is_anonymous,
          stories: [],
        };
      }
      grouped[key].stories.push(story);
    });

    setStoryGroups(Object.values(grouped));
  }, []);

  useEffect(() => { fetchStories(); }, [fetchStories]);

  useEffect(() => {
    const channel = supabase
      .channel("stories-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => {
        fetchStories();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchStories]);

  return (
    <>
      <div className="flex gap-3 overflow-x-auto px-4 py-3 hide-scrollbar">
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setCreateOpen(true)}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className="relative h-16 w-16 rounded-full p-[2px] border-2 border-dashed border-muted-foreground">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-card text-sm font-bold font-display">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground">Seu Story</span>
        </motion.button>

        {storyGroups.map((group, i) => (
          <motion.button
            key={group.user_id + i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: (i + 1) * 0.05 }}
            onClick={() => setViewingGroupIdx(i)}
            className="flex flex-col items-center gap-1 flex-shrink-0"
          >
            <div className={`relative h-16 w-16 rounded-full p-[2px] ${group.is_anonymous ? "gradient-anonymous" : "gradient-story"}`}>
              <div className="flex h-full w-full items-center justify-center rounded-full bg-card text-sm font-bold font-display overflow-hidden">
                {group.stories[0]?.image_url ? (
                  group.stories[0]?.media_type === "video" ? (
                    <video src={group.stories[0].image_url} className="h-full w-full rounded-full object-cover" autoPlay muted loop playsInline />
                  ) : (
                    <img src={group.stories[0].image_url} alt="" className="h-full w-full rounded-full object-cover" />
                  )
                ) : (
                  <span className={group.is_anonymous ? "text-neon-orange" : "text-foreground"}>
                    {group.is_anonymous ? "?" : group.display_name[0]?.toUpperCase()}
                  </span>
                )}
              </div>
              {group.stories[0]?.song_title && (
                <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 bg-neon-pink rounded-full px-1.5 py-0.5">
                  <span className="text-[8px] text-white font-bold">♪</span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground max-w-[60px] truncate">
              {group.display_name}
            </span>
          </motion.button>
        ))}
      </div>

      <CreateStoryModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={fetchStories} />

      <AnimatePresence>
        {viewingGroupIdx !== null && (
          <StoryViewer
            groups={storyGroups}
            initialGroupIndex={viewingGroupIdx}
            onClose={() => setViewingGroupIdx(null)}
            onDeleted={fetchStories}
            currentUserId={user?.id}
          />
        )}
      </AnimatePresence>
    </>
  );
}
