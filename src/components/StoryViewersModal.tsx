import { useEffect, useState } from "react";
import { X, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Viewer {
  viewer_id: string;
  viewed_at: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
}

export default function StoryViewersModal({
  open,
  onClose,
  storyId,
}: {
  open: boolean;
  onClose: () => void;
  storyId: string;
}) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open || !storyId) return;
    setLoading(true);
    
    supabase
      .from("story_views")
      .select("viewer_id, viewed_at")
      .eq("story_id", storyId)
      .order("viewed_at", { ascending: false })
      .then(async ({ data }) => {
        if (!data || data.length === 0) {
          setViewers([]);
          setLoading(false);
          return;
        }
        const ids = [...new Set(data.map((v) => v.viewer_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", ids);
        
        const profileMap: Record<string, any> = {};
        profiles?.forEach((p) => { profileMap[p.user_id] = p; });

        const mapped = data.map((v) => {
          const p = profileMap[v.viewer_id];
          return {
            viewer_id: v.viewer_id,
            viewed_at: v.viewed_at,
            display_name: p?.display_name || p?.username || "Usuário",
            username: p?.username || "",
            avatar_url: p?.avatar_url || null,
          };
        });
        // Deduplicate by viewer_id (keep first = most recent)
        const seen = new Set<string>();
        const unique = mapped.filter((v) => {
          if (seen.has(v.viewer_id)) return false;
          seen.add(v.viewer_id);
          return true;
        });
        setViewers(unique);
        setLoading(false);
      });
  }, [open, storyId]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="absolute bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-xl rounded-t-2xl max-h-[60%] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              {loading ? "..." : `${viewers.length} visualização${viewers.length !== 1 ? "ões" : ""}`}
            </span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-4 py-2">
          {loading ? (
            <div className="text-center text-muted-foreground text-sm py-6">Carregando...</div>
          ) : viewers.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-6">Nenhuma visualização ainda</div>
          ) : (
            viewers.map((v) => (
              <div key={v.viewer_id} className="flex items-center gap-3 py-2">
                <Avatar className="h-9 w-9">
                  {v.avatar_url ? (
                    <AvatarImage src={v.avatar_url} />
                  ) : null}
                  <AvatarFallback className="text-xs bg-muted">
                    {v.display_name?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{v.display_name}</p>
                  {v.username && (
                    <p className="text-[11px] text-muted-foreground truncate">@{v.username}</p>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(v.viewed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

