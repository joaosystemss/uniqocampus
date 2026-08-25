import { useState, useEffect, useMemo } from "react";
import { X, UserPlus, UserCheck, UserMinus, Users, UserX, ArrowLeftRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface FollowManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialTab?: TabKey;
}

type TabKey = "followers" | "following" | "mutual" | "not_following_back" | "dont_follow_me";

interface UserItem {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: "followers", label: "Seguidores", icon: Users },
  { key: "following", label: "Seguindo", icon: UserCheck },
  { key: "mutual", label: "Mútuos", icon: ArrowLeftRight },
  { key: "not_following_back", label: "Não seguem de volta", icon: UserX },
  { key: "dont_follow_me", label: "Não sigo de volta", icon: UserMinus },
];

export default function FollowManagerModal({ isOpen, onClose, userId, initialTab = "followers" }: FollowManagerModalProps) {
  const currentUser = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Map<string, UserItem>>(new Map());
  const [loading, setLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});
  const [loadingFollow, setLoadingFollow] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen || !userId) return;
    setLoading(true);
    fetchAllData();
  }, [isOpen, userId]);

  const fetchAllData = async () => {
    const [followersRes, followingRes] = await Promise.all([
      supabase.from("followers").select("follower_id").eq("following_id", userId),
      supabase.from("followers").select("following_id").eq("follower_id", userId),
    ]);

    const followerIds = (followersRes.data || []).map((f: any) => f.follower_id);
    const followingIds = (followingRes.data || []).map((f: any) => f.following_id);

    setFollowers(followerIds);
    setFollowing(followingIds);

    // Fetch all unique profiles
    const allIds = [...new Set([...followerIds, ...followingIds])];
    if (allIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", allIds);

      const map = new Map<string, UserItem>();
      (profilesData || []).forEach((p: any) => map.set(p.user_id, p));
      setProfiles(map);

      // Check current user's following status
      if (currentUser) {
        const { data: myFollowing } = await supabase
          .from("followers")
          .select("following_id")
          .eq("follower_id", currentUser.id)
          .in("following_id", allIds);

        const fMap: Record<string, boolean> = {};
        allIds.forEach(id => { fMap[id] = false; });
        (myFollowing || []).forEach((f: any) => { fMap[f.following_id] = true; });
        setFollowingMap(fMap);
      }
    }

    setLoading(false);
  };

  // Computed lists
  const followerSet = useMemo(() => new Set(followers), [followers]);
  const followingSet = useMemo(() => new Set(following), [following]);

  const mutual = useMemo(() => followers.filter(id => followingSet.has(id)), [followers, followingSet]);
  const notFollowingBack = useMemo(() => following.filter(id => !followerSet.has(id)), [following, followerSet]);
  const dontFollowMe = useMemo(() => followers.filter(id => !followingSet.has(id)), [followers, followingSet]);

  const currentList = useMemo(() => {
    switch (activeTab) {
      case "followers": return followers;
      case "following": return following;
      case "mutual": return mutual;
      case "not_following_back": return notFollowingBack;
      case "dont_follow_me": return dontFollowMe;
    }
  }, [activeTab, followers, following, mutual, notFollowingBack, dontFollowMe]);

  const counts: Record<TabKey, number> = {
    followers: followers.length,
    following: following.length,
    mutual: mutual.length,
    not_following_back: notFollowingBack.length,
    dont_follow_me: dontFollowMe.length,
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
        // Update local lists if viewing own profile
        if (userId === currentUser.id) {
          setFollowing(prev => prev.filter(id => id !== targetUserId));
        }
      } else {
        await supabase.from("followers").insert({
          follower_id: currentUser.id,
          following_id: targetUserId,
        });
        setFollowingMap(prev => ({ ...prev, [targetUserId]: true }));
        if (userId === currentUser.id) {
          setFollowing(prev => [...prev, targetUserId]);
        }
      }
    } catch {
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

  const emptyMessages: Record<TabKey, string> = {
    followers: "Nenhum seguidor ainda",
    following: "Não segue ninguém ainda",
    mutual: "Nenhum seguidor mútuo",
    not_following_back: "Todos te seguem de volta! 🎉",
    dont_follow_me: "Você segue todos de volta! 🎉",
  };

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
          className="w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl max-h-[80vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-bold font-display text-foreground">Conexões</h2>
            <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex overflow-x-auto gap-1 p-2 border-b border-border scrollbar-hide">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  <span className={`ml-0.5 text-[10px] ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {counts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : currentList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">{emptyMessages[activeTab]}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {currentList.map((uid) => {
                  const u = profiles.get(uid);
                  if (!u) return null;
                  const initial = (u.display_name?.[0] || u.username?.[0] || "U").toUpperCase();
                  const isMe = currentUser?.id === u.user_id;
                  const isUserFollowing = followingMap[u.user_id];

                  // Context badges
                  const isMutual = followerSet.has(uid) && followingSet.has(uid);
                  const followsMe = followerSet.has(uid);

                  return (
                    <div key={u.user_id} className="flex items-center gap-3 p-3 px-4">
                      <button
                        onClick={() => handleUserClick(u.user_id)}
                        className="flex-shrink-0"
                      >
                        <div className="h-11 w-11 rounded-full overflow-hidden bg-secondary flex items-center justify-center">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-sm font-bold text-foreground">{initial}</span>
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
                        <div className="flex items-center gap-1.5">
                          {u.username && (
                            <span className="text-xs text-muted-foreground truncate">@{u.username}</span>
                          )}
                          {activeTab !== "mutual" && isMutual && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                              mútuo
                            </span>
                          )}
                          {activeTab === "not_following_back" && !followsMe && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">
                              não segue
                            </span>
                          )}
                        </div>
                      </button>

                      {!isMe && currentUser && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleFollow(u.user_id)}
                          disabled={loadingFollow === u.user_id}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            isUserFollowing
                              ? "bg-secondary text-foreground border border-border"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {loadingFollow === u.user_id ? (
                            <div className="h-3 w-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                          ) : isUserFollowing ? (
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
