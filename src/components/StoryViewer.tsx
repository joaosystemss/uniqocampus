import { useState, useEffect, useCallback, useRef } from "react";
import { Music, X, ChevronLeft, ChevronRight, Pause, Play, Trash2, Eye } from "lucide-react";
import { motion } from "framer-motion";
import StoryViewersModal from "@/components/StoryViewersModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StoryGroup {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  is_anonymous: boolean;
  stories: any[];
}

const STORY_DURATION = 6000;

export default function StoryViewer({
  groups,
  initialGroupIndex,
  onClose,
  onDeleted,
  currentUserId,
}: {
  groups: StoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onDeleted: () => void;
  currentUserId: string | undefined;
}) {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewCount, setViewCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());
  const elapsedRef = useRef(0);
  const viewRecordedRef = useRef<Set<string>>(new Set());

  const group = groups[groupIdx];
  const story = group?.stories[storyIdx];

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    elapsedRef.current = 0;
    startTimeRef.current = Date.now();
    setProgress(0);
  }, []);

  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx((s) => s + 1);
      resetTimer();
    } else if (groupIdx < groups.length - 1) {
      setGroupIdx((g) => g + 1);
      setStoryIdx(0);
      resetTimer();
    } else {
      onClose();
    }
  }, [group, storyIdx, groupIdx, groups.length, onClose, resetTimer]);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((s) => s - 1);
      resetTimer();
    } else if (groupIdx > 0) {
      setGroupIdx((g) => g - 1);
      setStoryIdx(0);
      resetTimer();
    }
  }, [storyIdx, groupIdx, resetTimer]);

  useEffect(() => {
    if (paused || viewersOpen) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    startTimeRef.current = Date.now() - elapsedRef.current;
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      elapsedRef.current = elapsed;
      const pct = Math.min(elapsed / STORY_DURATION, 1);
      setProgress(pct);
      if (pct >= 1) {
        goNext();
      }
    }, 30);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, viewersOpen, goNext, groupIdx, storyIdx]);

  useEffect(() => {
    resetTimer();
  }, [groupIdx, storyIdx, resetTimer]);

  useEffect(() => {
    if (!story || !currentUserId) return;
    const isOwner = story.user_id === currentUserId;
    if (isOwner) {
      supabase
        .from("story_views")
        .select("id", { count: "exact", head: true })
        .eq("story_id", story.id)
        .then(({ count }) => setViewCount(count || 0));
    } else {
      if (!viewRecordedRef.current.has(story.id)) {
        viewRecordedRef.current.add(story.id);
        supabase
          .from("story_views")
          .upsert(
            { story_id: story.id, viewer_id: currentUserId },
            { onConflict: "story_id,viewer_id" }
          )
          .then(() => {});
      }
    }
    setViewersOpen(false);
  }, [story?.id, currentUserId]);

  const isMyStory = currentUserId && story?.user_id === currentUserId;

  const handleDeleteStory = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir este story?")) return;
    const { error } = await supabase.from("stories").delete().eq("id", story.id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Story excluído 🗑️");
    onDeleted();
    onClose();
  };

  if (!story) return null;

  const handleTap = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.3) goPrev();
    else if (x > rect.width * 0.7) goNext();
    else setPaused((p) => !p);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
    >
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        {isMyStory && (
          <button className="text-red-400 hover:text-red-300" onClick={handleDeleteStory}>
            <Trash2 className="h-5 w-5" />
          </button>
        )}
        <button className="text-white/80 hover:text-white" onClick={onClose}>
          <X className="h-6 w-6" />
        </button>
      </div>

      <div
        className="relative w-full max-w-sm aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer"
        onClick={handleTap}
      >
        <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 px-2 pt-2">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-none"
                style={{ width: `${i < storyIdx ? 100 : i === storyIdx ? progress * 100 : 0}%` }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-5 left-0 right-0 z-20 flex items-center gap-2.5 px-3 pt-2">
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-white/20">
            {group.avatar_url ? (
              <img src={group.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white">
                {group.is_anonymous ? "?" : group.display_name?.[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-sm font-semibold text-white drop-shadow">{group.display_name}</span>
          <span className="text-[10px] text-white/60">
            {new Date(story.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            className="ml-auto text-white/70"
            onClick={(e) => { e.stopPropagation(); setPaused((p) => !p); }}
          >
            {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
        </div>

        {story.image_url ? (
          story.media_type === "video" ? (
            <video key={story.id} src={story.image_url} className="absolute inset-0 w-full h-full object-cover" autoPlay loop playsInline muted={false} />
          ) : (
            <img key={story.id} src={story.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )
        ) : (
          <div className={`absolute inset-0 ${story.is_anonymous ? "gradient-anonymous" : "gradient-story"}`} />
        )}

        {story.text && (
          <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
            <p className="text-xl font-display font-bold text-white text-center drop-shadow-lg">{story.text}</p>
          </div>
        )}

        {story.song_title && (
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-4 py-2"
          >
            <div className="h-5 w-5 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center animate-spin" style={{ animationDuration: "3s" }}>
              <Music className="h-2.5 w-2.5 text-white" />
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-white leading-tight">{story.song_title}</p>
              <p className="text-[10px] text-white/70 leading-tight">{story.song_artist}</p>
            </div>
          </motion.div>
        )}

        {(groupIdx > 0 || storyIdx > 0) && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-white/30 pointer-events-none">
            <ChevronLeft className="h-6 w-6" />
          </div>
        )}
        {(groupIdx < groups.length - 1 || storyIdx < group.stories.length - 1) && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-white/30 pointer-events-none">
            <ChevronRight className="h-6 w-6" />
          </div>
        )}

        {isMyStory && (
          <button
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-full px-4 py-2"
            onClick={(e) => { e.stopPropagation(); setPaused(true); setViewersOpen(true); }}
          >
            <Eye className="h-4 w-4 text-white" />
            <span className="text-sm font-medium text-white">{viewCount}</span>
          </button>
        )}

        {isMyStory && (
          <StoryViewersModal
            open={viewersOpen}
            onClose={() => { setViewersOpen(false); setPaused(false); }}
            storyId={story.id}
          />
        )}
      </div>
    </motion.div>
  );
}
