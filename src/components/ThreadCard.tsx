import { useState, useEffect, useCallback } from "react";
import { Heart, MessageCircle, Share2, Bookmark, Send, X, Trash2, UserPlus, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import VerifiedBadge from "@/components/VerifiedBadge";
import { BadgeRow, useNameColor } from "@/components/BadgeDisplay";
import { getCourseColor } from "@/config/badges";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ThreadCardProps {
  id: string;
  author: string;
  authorUsername?: string;
  postUserId?: string;
  course: string;
  time: string;
  content: string;
  likes: number;
  comments: number;
  isAnonymous?: boolean;
  tags?: string[];
  mediaUrl?: string | null;
  mediaType?: string | null;
  avatarUrl?: string | null;
  onUpdate?: () => void;
}

interface Comment {
  id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
  user_id: string;
  profile?: { display_name: string | null; username: string | null; avatar_url: string | null } | null;
}

export default function ThreadCard({
  id,
  author,
  authorUsername,
  postUserId,
  course,
  time,
  content,
  likes: initialLikes,
  comments: initialComments,
  isAnonymous,
  tags,
  mediaUrl,
  mediaType,
  avatarUrl,
  onUpdate,
}: ThreadCardProps) {
  const user = useAuth();
  const nameColor = useNameColor(isAnonymous ? undefined : authorUsername);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [likesCount, setLikesCount] = useState(initialLikes);
  const [commentsCount, setCommentsCount] = useState(initialComments);
  const [showComments, setShowComments] = useState(false);
  const [commentsList, setCommentsList] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Check if user already liked/saved this post
  useEffect(() => {
    if (!user) return;
    const sb = supabase as any;
    sb.from("post_likes")
      .select("id")
      .eq("post_id", id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => { if (data) setLiked(true); });

    sb.from("saved_posts")
      .select("id")
      .eq("post_id", id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => { if (data) setSaved(true); });

    // Check if following post author
    if (postUserId && postUserId !== user.id) {
      sb.from("followers")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", postUserId)
        .maybeSingle()
        .then(({ data }: any) => { if (data) setFollowing(true); });
    }
  }, [user, id, postUserId]);

  const handleLike = async () => {
    if (!user) { toast.error("Faça login primeiro"); return; }
    const sb = supabase as any;

    if (liked) {
      await sb.from("post_likes").delete().eq("post_id", id).eq("user_id", user.id);
      setLiked(false);
      setLikesCount((c: number) => Math.max(0, c - 1));
    } else {
      await sb.from("post_likes").insert({ post_id: id, user_id: user.id });
      setLiked(true);
      setLikesCount((c: number) => c + 1);
    }
  };

  const handleSave = async () => {
    if (!user) { toast.error("Faça login primeiro"); return; }
    const sb = supabase as any;

    if (saved) {
      await sb.from("saved_posts").delete().eq("post_id", id).eq("user_id", user.id);
      setSaved(false);
      toast.success("Removido dos salvos");
    } else {
      await sb.from("saved_posts").insert({ post_id: id, user_id: user.id });
      setSaved(true);
      toast.success("Post salvo! 🔖");
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/?post=${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Uniqo", text: content?.slice(0, 100), url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado! 📋");
      }
    } catch {
      // user cancelled share
    }
  };

  const handleDeletePost = async () => {
    if (!user) return;
    const confirmed = window.confirm("Tem certeza que deseja excluir este post?");
    if (!confirmed) return;
    const sb = supabase as any;
    const { error } = await sb.from("posts").delete().eq("id", id).eq("user_id", user.id);
    if (error) {
      toast.error("Erro ao excluir post");
      return;
    }
    toast.success("Post excluído 🗑️");
    onUpdate?.();
  };

  const handleFollow = async () => {
    if (!user || !postUserId || postUserId === user.id) return;
    const sb = supabase as any;
    if (following) {
      await sb.from("followers").delete().eq("follower_id", user.id).eq("following_id", postUserId);
      setFollowing(false);
    } else {
      await sb.from("followers").insert({ follower_id: user.id, following_id: postUserId });
      setFollowing(true);
    }
  };

  const isOwner = user?.id === postUserId;

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    const sb = supabase as any;
    const { data } = await sb
      .from("comments")
      .select("*")
      .eq("post_id", id)
      .order("created_at", { ascending: true });

    if (!data) { setCommentsList([]); setLoadingComments(false); return; }

    // Get profiles
    const userIds = [...new Set(data.filter((c: any) => !c.is_anonymous).map((c: any) => c.user_id))] as string[];
    let profilesMap: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await sb
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", userIds);
      if (profiles) profiles.forEach((p: any) => { profilesMap[p.user_id] = p; });
    }

    setCommentsList(data.map((c: any) => ({
      ...c,
      profile: profilesMap[c.user_id] || null,
    })));
    setLoadingComments(false);
  }, [id]);

  const handleOpenComments = () => {
    setShowComments(true);
    fetchComments();
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) return;
    setSubmitting(true);
    const sb = supabase as any;
    const { error } = await sb.from("comments").insert({
      post_id: id,
      user_id: user.id,
      content: newComment.trim(),
      is_anonymous: false,
    });
    setSubmitting(false);
    if (error) { toast.error("Erro ao comentar"); return; }
    setNewComment("");
    setCommentsCount((c) => c + 1);
    fetchComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    const sb = supabase as any;
    await sb.from("comments").delete().eq("id", commentId);
    setCommentsCount((c) => Math.max(0, c - 1));
    fetchComments();
  };

  function commentTimeAgo(date: string) {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-border px-4 py-3.5"
      >
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-display font-bold text-sm overflow-hidden ${
              isAnonymous
                ? "gradient-anonymous text-background"
                : avatarUrl
                ? ""
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {isAnonymous ? (
              "?"
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              author[0]
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`font-semibold text-sm font-display ${isAnonymous ? "text-neon-orange" : nameColor || "text-foreground"}`}>
                {isAnonymous ? "Anônimo" : author}
              </span>
              {!isAnonymous && authorUsername && <VerifiedBadge username={authorUsername} />}
              {course && <span className={`text-xs font-medium ${getCourseColor(course)}`}>· {course}</span>}
              <span className="text-xs text-muted-foreground">· {time}</span>
              {isOwner && (
                <motion.button whileTap={{ scale: 0.85 }} onClick={handleDeletePost} className="ml-auto text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </motion.button>
              )}
              {!isOwner && !isAnonymous && postUserId && (
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={handleFollow}
                  className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full transition-colors ${
                    following
                      ? "bg-secondary text-muted-foreground"
                      : "bg-primary/15 text-primary"
                  }`}
                >
                  {following ? <UserCheck className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                </motion.button>
              )}
            </div>
            {!isAnonymous && authorUsername && <BadgeRow username={authorUsername} />}
            {content && <p className="mt-1 text-sm leading-relaxed text-foreground/90">{content}</p>}

            {/* Media */}
            {mediaUrl && (
              <div className="mt-2 rounded-xl overflow-hidden border border-border">
                {mediaType === "video" ? (
                  <video src={mediaUrl} className="w-full max-h-80 object-cover" controls playsInline />
                ) : (
                  <img src={mediaUrl} alt="" className="w-full max-h-80 object-cover" />
                )}
              </div>
            )}

            {tags && tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[10px] px-2 py-0 bg-secondary text-primary border-none"
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-3 flex items-center gap-5 text-muted-foreground">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleLike}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  liked ? "text-neon-pink" : "hover:text-neon-pink"
                }`}
              >
                <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
                {likesCount > 0 && likesCount}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleOpenComments}
                className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                {commentsCount > 0 && commentsCount}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleShare}
                className="flex items-center gap-1.5 text-xs hover:text-accent transition-colors"
              >
                <Share2 className="h-4 w-4" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleSave}
                className={`ml-auto flex items-center gap-1.5 text-xs transition-colors ${
                  saved ? "text-primary" : "hover:text-primary"
                }`}
              >
                <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.article>

      {/* Comments Sheet */}
      <AnimatePresence>
        {showComments && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-background/80 backdrop-blur-sm"
            onClick={() => setShowComments(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 left-0 right-0 max-h-[75vh] rounded-t-2xl bg-card border-t border-border flex flex-col"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
              </div>

              <div className="flex items-center justify-between px-4 pb-3">
                <h3 className="text-base font-bold font-display text-foreground">
                  Comentários ({commentsCount})
                </h3>
                <button onClick={() => setShowComments(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Comments list */}
              <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-3">
                {loadingComments ? (
                  <div className="flex justify-center py-8">
                    <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : commentsList.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum comentário ainda. Seja o primeiro!</p>
                ) : (
                  commentsList.map((comment) => (
                    <div key={comment.id} className="flex gap-2.5">
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold overflow-hidden ${
                        comment.is_anonymous ? "gradient-anonymous text-background" : comment.profile?.avatar_url ? "" : "bg-secondary text-secondary-foreground"
                      }`}>
                        {comment.is_anonymous ? "?" : comment.profile?.avatar_url ? (
                          <img src={comment.profile.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          (comment.profile?.display_name?.[0] || "U").toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {comment.is_anonymous ? "Anônimo" : (comment.profile?.display_name || comment.profile?.username || "Usuário")}
                          </span>
                          <span className="text-[10px] text-muted-foreground">{commentTimeAgo(comment.created_at)}</span>
                          {user && comment.user_id === user.id && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="ml-auto text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-foreground/90 mt-0.5">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment input */}
              <div className="border-t border-border px-4 py-3 flex items-center gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSubmitComment())}
                  placeholder="Escreva um comentário..."
                  className="flex-1 bg-secondary rounded-full px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleSubmitComment}
                  disabled={!newComment.trim() || submitting}
                  className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-50"
                >
                  {submitting ? (
                    <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
