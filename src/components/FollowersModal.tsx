import { useState, useEffect } from "react";
import { X, UserPlus, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: "followers" | "following";
  title: string;
}

interface UserItem {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export default function FollowersModal({ isOpen, onClose, userId, type, title }: FollowersModalProps) {
  const currentUser = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [loadingFollow, setLoadingFollow] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) return;
    setLoading(true);
    fetchUsers();
  }, [isOpen, userId, type]);

  useEffect(() => {
    if (!isOpen || !currentUser || users.length === 0) return;
    checkFollowingStatus();
  }, [isOpen, currentUser, users]);

  const fetchUsers = async () => {
    const sb = supabase as any;
    
    if (type === "followers") {
      // Get users who follow this user
      const { data: followData } = await sb
        .from("followers")
        .select("follower_id")
        .eq("following_id", userId);

      if (followData && followData.length > 0) {
        const userIds = followData.map((f: any) => f.follower_id);
        const { data: profiles } = await sb
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", userIds);
        setUsers(profiles || []);
      } else {
        setUsers([]);
      }
    } else {
      // Get users this user follows
      const { data: followData } = await sb
        .from("followers")
        .select("following_id")
        .eq("follower_id", userId);

      if (followData && followData.length > 0) {
        const userIds = followData.map((f: any) => f.following_id);
        const { data: profiles } = await sb
          .from("profiles")
          .select("user_id, display_name, username, avatar_url")
          .in("user_id", userIds);
        setUsers(profiles || []);
      } else {
        setUsers([]);
      }
    }
    setLoading(false);
  };

  const checkFollowingStatus = async () => {
    if (!currentUser) return;
    const sb = supabase as any;
    const userIds = users.map(u => u.user_id);
    
    const { data } = await sb
      .from("followers")
      .select("following_id")
      .eq("follower_id", currentUser.id)
      .in("following_id", userIds);

    const map: Record<string, boolean> = {};
    userIds.forEach(id => { map[id] = false; });
    (data || []).forEach((f: any) => { map[f.following_id] = true; });
    setFollowingMap(map);
  };

  const handleFollow = async (targetUserId: string) => {
    if (!currentUser || loadingFollow) return;
    setLoadingFollow(targetUserId);

    try {
      const isFollowing = followingMap[targetUserId];
      if (isFollowing) {
        await supabase.from("followers").delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", targetUserId);
        setFollowingMap(prev => ({ ...prev, [targetUserId]: false }));
      } else {
        await supabase.from("followers").insert({
          follower_id: currentUser.id,
          following_id: targetUserId,
        });
        setFollowingMap(prev => ({ ...prev, [targetUserId]: true }));
      }
    } catch (err) {
      toast.error("Erro ao seguir/deixar de seguir");
    } finally {
      setLoadingFollow(null);
    }
  };

  const handleUserClick = (targetUserId: string) => {
    onClose();
    if (currentUser?.id === targetUserId) {
      navigate("/profile");
    } else {
      navigate(`/user/${targetUserId}`);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl max-h-[70vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-bold font-display">{title}</h2>
            <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">
                  {type === "followers" ? "Nenhum seguidor ainda" : "Não segue ninguém ainda"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {users.map((u) => {
                  const initial = (u.display_name?.[0] || u.username?.[0] || "U").toUpperCase();
                  const isMe = currentUser?.id === u.user_id;
                  const isFollowing = followingMap[u.user_id];

                  return (
                    <div key={u.user_id} className="flex items-center gap-3 p-4">
                      <button
                        onClick={() => handleUserClick(u.user_id)}
                        className="flex-shrink-0"
                      >
                        <div className="h-11 w-11 rounded-full overflow-hidden bg-primary flex items-center justify-center">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-primary-foreground">{initial}</span>
                          )}
                        </div>
                      </button>
                      
                      <button
                        onClick={() => handleUserClick(u.user_id)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <p className="font-semibold text-sm text-foreground truncate">
                          {u.display_name || u.username || "Usuário"}
                        </p>
                        {u.username && (
                          <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                        )}
                      </button>

                      {!isMe && currentUser && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleFollow(u.user_id)}
                          disabled={loadingFollow === u.user_id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isFollowing
                              ? "bg-secondary text-foreground border border-border"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {loadingFollow === u.user_id ? (
                            <div className="h-3 w-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                          ) : isFollowing ? (
                            <>
                              <UserCheck className="h-3.5 w-3.5" />
                              Seguindo
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3.5 w-3.5" />
                              Seguir
                            </>
                          )}
                        </motion.button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
