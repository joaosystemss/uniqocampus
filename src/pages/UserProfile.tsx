import { useState, useEffect, useCallback } from "react";
import FollowersModal from "@/components/FollowersModal";
import StoryViewer, { StoryGroup } from "@/components/StoryViewer";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, MessageCircle, UserPlus, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import VerifiedBadge from "@/components/VerifiedBadge";
import { BadgeNameList, useNameColor } from "@/components/BadgeDisplay";
import { getCourseColor } from "@/config/badges";
import { avatarBorders, avatarEffects, profileThemes } from "@/config/decorations";

export default function UserProfile() {
  const user = useAuth();
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [followModal, setFollowModal] = useState<{ type: "followers" | "following"; title: string } | null>(null);
  const [deco, setDeco] = useState<{ border: typeof avatarBorders[0]; effect: typeof avatarEffects[0]; theme: typeof profileThemes[0] }>({
    border: avatarBorders[0], effect: avatarEffects[0], theme: profileThemes[0],
  });
  const [userStoryGroups, setUserStoryGroups] = useState<StoryGroup[]>([]);
  const [viewingStory, setViewingStory] = useState(false);

  const fetchUserStories = useCallback(async () => {
    if (!userId || !profile) return;
    const { data } = await supabase
      .from("stories")
      .select("*")
      .eq("user_id", userId)
      .eq("is_anonymous", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (data && data.length > 0) {
      setUserStoryGroups([{
        user_id: userId,
        display_name: profile.display_name || profile.username || "Usuário",
        username: profile.username || "",
        avatar_url: profile.avatar_url || null,
        is_anonymous: false,
        stories: data,
      }]);
    } else {
      setUserStoryGroups([]);
    }
  }, [userId, profile]);

  const hasStories = userStoryGroups.length > 0 && userStoryGroups[0].stories.length > 0;

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data);
    setLoading(false);
  }, [userId]);

  const fetchStats = useCallback(async () => {
    if (!userId) return;
    const sb = supabase as any;

    sb.from("followers")
      .select("id", { count: "exact", head: true })
      .eq("following_id", userId)
      .then(({ count }: any) => setFollowersCount(count ?? 0));

    sb.from("followers")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", userId)
      .then(({ count }: any) => setFollowingCount(count ?? 0));

    sb.from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_anonymous", false)
      .then(({ count }: any) => setPostCount(count ?? 0));
  }, [userId]);

  const checkFollowing = useCallback(async () => {
    if (!user || !userId) return;
    const { data } = await supabase
      .from("followers")
      .select("id")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .maybeSingle();
    setIsFollowing(!!data);
  }, [user, userId]);

  useEffect(() => {
    fetchProfile();
    fetchStats();
    checkFollowing();
    // Load decorations
    if (userId) {
      supabase.from("user_decorations").select("border_id, effect_id, theme_id")
        .eq("user_id", userId).maybeSingle().then(({ data }) => {
          if (data) {
            setDeco({
              border: avatarBorders.find(b => b.id === data.border_id) || avatarBorders[0],
              effect: avatarEffects.find(e => e.id === data.effect_id) || avatarEffects[0],
              theme: profileThemes.find(t => t.id === data.theme_id) || profileThemes[0],
            });
          }
        });
    }
  }, [fetchProfile, fetchStats, checkFollowing, userId]);

  useEffect(() => { fetchUserStories(); }, [fetchUserStories]);

  const handleFollow = async () => {
    if (!user || !userId || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase.from("followers").delete()
          .eq("follower_id", user.id)
          .eq("following_id", userId);
        if (error) throw error;
        setIsFollowing(false);
        setFollowersCount((c) => Math.max(0, c - 1));
      } else {
        const { error } = await supabase.from("followers").insert({
          follower_id: user.id,
          following_id: userId,
        });
        if (error) throw error;
        setIsFollowing(true);
        setFollowersCount((c) => c + 1);
      }
    } catch (err: any) {
      console.error("Follow error:", err);
      toast.error("Erro ao seguir/deixar de seguir");
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!user || !userId) return;
    // Check if they follow us (if so, conversation is auto-accepted)
    const { data: theyFollowUs } = await supabase
      .from("followers")
      .select("id")
      .eq("follower_id", userId)
      .eq("following_id", user.id)
      .maybeSingle();

    const ids = [user.id, userId].sort();
    // Check existing conversation
    const { data: existing } = await supabase
      .from("conversations")
      .select("*")
      .eq("user1_id", ids[0])
      .eq("user2_id", ids[1])
      .maybeSingle();

    if (existing) {
      navigate("/dm", { state: { openConvoId: existing.id, otherUser: { user_id: userId, display_name: profile?.display_name, username: profile?.username, avatar_url: profile?.avatar_url } } });
      return;
    }

    // Create new conversation
    const status = theyFollowUs ? "accepted" : "pending";
    const { data: newConvo, error } = await supabase
      .from("conversations")
      .insert({ user1_id: ids[0], user2_id: ids[1], status } as any)
      .select()
      .single();

    if (error) { toast.error("Erro ao iniciar conversa"); return; }

    if (status === "pending") {
      toast.success("Solicitação de mensagem enviada! 📩");
    }

    navigate("/dm", { state: { openConvoId: (newConvo as any).id, otherUser: { user_id: userId, display_name: profile?.display_name, username: profile?.username, avatar_url: profile?.avatar_url } } });
  };

  const username = profile?.username || "";
  const nameColor = useNameColor(username);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Usuário não encontrado</p>
        <button onClick={() => navigate(-1)} className="text-primary text-sm">Voltar</button>
      </div>
    );
  }

  const initial = (profile.display_name?.[0] || profile.username?.[0] || "U").toUpperCase();
  const isMe = user?.id === userId;

  return (
    <div className={`min-h-screen pb-24 ${deco.theme.gradient || "bg-background"}`}>
      {/* Animated Banner */}
      {deco.theme.banner && (
        <div className={`h-28 w-full ${deco.theme.banner}`} />
      )}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold font-display text-foreground">
            {profile.username ? `@${profile.username}` : "Perfil"}
          </h1>
        </div>
      </header>

      <div className="flex flex-col items-center px-4 pt-8">
        {/* Avatar with decorations - clickable for stories */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`relative ${deco.effect.className}`}
        >
          {/* Story ring */}
          {hasStories && (
            <div className="absolute -inset-[3px] rounded-full gradient-story z-0" />
          )}
          <div
            onClick={hasStories ? () => setViewingStory(true) : undefined}
            className={`relative h-24 w-24 rounded-full overflow-hidden flex items-center justify-center ${deco.border.style} ${profile.avatar_url ? "" : "gradient-primary"} ${hasStories ? "cursor-pointer p-[2px]" : ""}`}
          >
            <div className={`h-full w-full rounded-full overflow-hidden flex items-center justify-center ${hasStories ? "border-2 border-background" : ""} ${profile.avatar_url ? "" : "gradient-primary"}`}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-display font-bold text-background">{initial}</span>
              )}
            </div>
          </div>
          {deco.border.rarity === "lendário" && !hasStories && (
            <motion.div
              className="absolute -inset-1 rounded-full opacity-30 -z-10"
              style={{
                background: "conic-gradient(from 0deg, hsl(var(--neon-pink)), hsl(var(--primary)), hsl(var(--neon-orange)), hsl(var(--neon-pink)))",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          )}
        </motion.div>

        <div className="flex flex-col items-center mt-4">
          <div className="flex items-center gap-1">
            <h2 className={`text-xl font-bold font-display ${nameColor || "text-foreground"}`}>
              {profile.display_name || profile.username || "Usuário"}
            </h2>
            <VerifiedBadge username={username} size={20} />
          </div>
          {profile.username && (
            <p className="text-xs text-muted-foreground mt-0.5">@{profile.username}</p>
          )}
          {(profile as any).university && (
            <p className="text-xs font-medium mt-1 text-muted-foreground flex items-center gap-1">
              🏛️ {(profile as any).university}
            </p>
          )}
          {(profile.course || profile.semester) && (
            <p className={`text-sm font-medium mt-0.5 ${profile.course ? getCourseColor(profile.course) : "text-primary"}`}>
              {[profile.course, profile.semester ? `${profile.semester}º período` : null].filter(Boolean).join(" · ")}
            </p>
          )}
          {profile.bio && (
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs">{profile.bio}</p>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 mt-4">
          <div className="text-center">
            <p className="text-lg font-bold font-display text-foreground">{postCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Posts</p>
          </div>
          <div className="h-6 w-px bg-border" />
          <button
            onClick={() => setFollowModal({ type: "followers", title: "Seguidores" })}
            className="text-center hover:opacity-70 transition-opacity"
          >
            <p className="text-lg font-bold font-display text-foreground">{followersCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Seguidores</p>
          </button>
          <div className="h-6 w-px bg-border" />
          <button
            onClick={() => setFollowModal({ type: "following", title: "Seguindo" })}
            className="text-center hover:opacity-70 transition-opacity"
          >
            <p className="text-lg font-bold font-display text-foreground">{followingCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Seguindo</p>
          </button>
        </div>

        {/* Actions */}
        {!isMe && (
          <div className="flex items-center gap-3 mt-5 w-full max-w-xs">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                isFollowing
                  ? "bg-secondary text-foreground border border-border"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
              {isFollowing ? "Seguindo" : "Seguir"}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleMessage}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold bg-secondary text-foreground border border-border"
            >
              <MessageCircle className="h-4 w-4" />
              Mensagem
            </motion.button>
          </div>
        )}
      </div>

      {/* Badges */}
      <div className="px-4 mt-6">
        <h3 className="text-sm font-semibold font-display text-muted-foreground mb-3">Insígnias</h3>
        <div className="rounded-xl bg-card border border-border p-4">
          <BadgeNameList username={username} />
        </div>
      </div>
      {followModal && userId && (
        <FollowersModal
          isOpen={!!followModal}
          onClose={() => setFollowModal(null)}
          userId={userId}
          type={followModal.type}
          title={followModal.title}
        />
      )}
      <AnimatePresence>
        {viewingStory && hasStories && (
          <StoryViewer
            groups={userStoryGroups}
            initialGroupIndex={0}
            onClose={() => setViewingStory(false)}
            onDeleted={() => { fetchUserStories(); setViewingStory(false); }}
            currentUserId={user?.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
