import { useState, useEffect } from "react";
import { Bell, Heart, MessageCircle, UserPlus, UserCheck, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  actor_id: string;
  post_id: string | null;
  read: boolean;
  created_at: string;
  actor?: { display_name: string | null; username: string | null; avatar_url: string | null };
  post?: { content: string } | null;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function Notifications() {
  const user = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  const fetchFollowing = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", user.id);
    if (data) {
      setFollowingSet(new Set(data.map((f: any) => f.following_id)));
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    const sb = supabase as any;

    const { data } = await sb
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data) { setNotifications([]); setLoading(false); return; }

    const actorIds = [...new Set(data.map((n: any) => n.actor_id))] as string[];
    const postIds = [...new Set(data.map((n: any) => n.post_id).filter(Boolean))] as string[];

    const [{ data: profiles }, { data: posts }] = await Promise.all([
      actorIds.length > 0
        ? sb.from("profiles").select("user_id, display_name, username, avatar_url").in("user_id", actorIds)
        : { data: [] },
      postIds.length > 0
        ? sb.from("posts").select("id, content").in("id", postIds)
        : { data: [] },
    ]);

    const profileMap: Record<string, any> = {};
    (profiles ?? []).forEach((p: any) => { profileMap[p.user_id] = p; });
    const postMap: Record<string, any> = {};
    (posts ?? []).forEach((p: any) => { postMap[p.id] = p; });

    setNotifications(data.map((n: any) => ({
      ...n,
      actor: profileMap[n.actor_id] || null,
      post: n.post_id ? postMap[n.post_id] || null : null,
    })));
    setLoading(false);

    const unreadIds = data.filter((n: any) => !n.read).map((n: any) => n.id);
    if (unreadIds.length > 0) {
      await sb.from("notifications").update({ read: true }).in("id", unreadIds);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchFollowing();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-realtime")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const handleFollowBack = async (actorId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || followLoading) return;
    setFollowLoading(actorId);
    const { error } = await supabase
      .from("followers")
      .insert({ follower_id: user.id, following_id: actorId });
    if (!error) {
      setFollowingSet((prev) => new Set([...prev, actorId]));
      toast.success("Seguindo de volta! 🎉");
    }
    setFollowLoading(null);
  };

  const handleGoToProfile = (actorId: string) => {
    navigate(`/user/${actorId}`);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "like": return <Heart className="h-4 w-4 text-neon-pink fill-current" />;
      case "comment": return <MessageCircle className="h-4 w-4 text-primary" />;
      case "follow": return <UserPlus className="h-4 w-4 text-accent" />;
      case "dm_request": return <MessageCircle className="h-4 w-4 text-neon-orange" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getMessage = (n: Notification) => {
    const name = n.actor?.display_name || n.actor?.username || "Alguém";
    const postPreview = n.post?.content?.slice(0, 40) || "seu post";
    switch (n.type) {
      case "like": return <><strong className="text-foreground">{name}</strong> curtiu <span className="text-muted-foreground">"{postPreview}..."</span></>;
      case "comment": return <><strong className="text-foreground">{name}</strong> comentou em <span className="text-muted-foreground">"{postPreview}..."</span></>;
      case "follow": return <><strong className="text-foreground">{name}</strong> começou a te seguir</>;
      case "dm_request": return <><strong className="text-foreground">{name}</strong> enviou uma solicitação de mensagem</>;
      default: return <><strong className="text-foreground">{name}</strong> interagiu com você</>;
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold font-display text-foreground">Notificações</h1>
          </div>
        </div>
      </header>

      <section className="divide-y divide-border">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20">
            <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Nenhuma notificação ainda</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Quando alguém curtir ou comentar, aparece aqui! 🔔</p>
          </div>
        ) : (
          notifications.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => handleGoToProfile(n.actor_id)}
              className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-secondary/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}
            >
              <div className="flex-shrink-0">
                {n.actor?.avatar_url ? (
                  <div className="relative">
                    <img src={n.actor.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    <div className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5">
                      {getIcon(n.type)}
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-secondary-foreground">
                      {(n.actor?.display_name?.[0] || "?").toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5">
                      {getIcon(n.type)}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground leading-snug">
                  {getMessage(n)}
                </p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">{timeAgo(n.created_at)}</p>
              </div>

              {/* Follow back button for follow notifications */}
              {n.type === "follow" && !followingSet.has(n.actor_id) && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => handleFollowBack(n.actor_id, e)}
                  disabled={followLoading === n.actor_id}
                  className="flex-shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground flex items-center gap-1"
                >
                  {followLoading === n.actor_id ? (
                    <div className="h-3 w-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="h-3 w-3" />
                      Seguir
                    </>
                  )}
                </motion.button>
              )}
              {n.type === "follow" && followingSet.has(n.actor_id) && (
                <span className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground">
                  <UserCheck className="h-3.5 w-3.5" />
                  Seguindo
                </span>
              )}
              {n.type === "dm_request" && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/dm");
                  }}
                  className="flex-shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground flex items-center gap-1"
                >
                  <Send className="h-3 w-3" />
                  Ver
                </motion.button>
              )}
            </motion.div>
          ))
        )}
      </section>
    </div>
  );
}
