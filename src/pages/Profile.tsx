import { useState, useEffect, useRef, useCallback } from "react";
import FollowManagerModal from "@/components/FollowManagerModal";
import StoryViewer, { StoryGroup } from "@/components/StoryViewer";
import { AnimatePresence } from "framer-motion";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Settings, BookOpen, MessageCircle, Users, Palette, Coins, LogOut, UserCog, BadgeCheck, Camera, Award, Share2, Copy, Download, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import VerifiedBadge from "@/components/VerifiedBadge";
import { BadgeNameList, useNameColor } from "@/components/BadgeDisplay";
import { getCourseColor } from "@/config/badges";
import { getUserDecoration, avatarBorders as allBorders, avatarEffects as allEffects, profileThemes as allThemes } from "@/config/decorations";
import { fetchWallet, coinRewards, isOwner, type UserWallet } from "@/config/coins";
import ThemeGallery from "@/components/ThemeGallery";
import AdminCoinPanel from "@/components/AdminCoinPanel";
import VerifiedPanel from "@/components/VerifiedPanel";
import AdminBadgePanel from "@/components/AdminBadgePanel";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COURSES = [
  "Administração",
  "Arquitetura e Urbanismo",
  "Biomedicina",
  "Ciência da Computação",
  "Ciências Contábeis",
  "Design Gráfico",
  "Direito",
  "Educação Física",
  "Enfermagem",
  "Eng. Civil",
  "Eng. de Produção",
  "Eng. de Software",
  "Eng. Elétrica",
  "Eng. Mecânica",
  "Farmácia",
  "Fisioterapia",
  "Fonoaudiologia",
  "Marketing",
  "Medicina",
  "Medicina Veterinária",
  "Nutrição",
  "Odontologia",
  "Pedagogia",
  "Psicologia",
  "Publicidade e Propaganda",
  "Sistemas de Informação",
];

const UNIVERSITIES = [
  "UFPI - Universidade Federal do Piauí",
  "UESPI - Universidade Estadual do Piauí",
  "IFPI - Instituto Federal do Piauí",
  "UNINOVAFAPI - Centro Universitário",
  "UNINASSAU Teresina",
  "Faculdade Santo Agostinho - FSA",
  "FACID/DeVry",
  "CHRISFAPI - Christus Faculdade do Piauí",
  "Estácio Teresina",
  "UNIP Teresina",
  "AESPI",
  "FAEME - Faculdade do Meio Norte",
  "CET - Faculdade de Tecnologia",
  "FAL - Faculdade Aliança",
  "FAR - Faculdade Adelmar Rosado",
  "NOVAUNESC",
  "Faculdade R.Sá",
  "UNDB Teresina",
];

export default function Profile() {
  const { user, profile, loading, setProfile } = useProfile();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { canInstall, install, isStandalone } = usePWAInstall();
  const [editing, setEditing] = useState(false);
  const [bio, setBio] = useState("");
  const [course, setCourse] = useState("");
  const [semester, setSemester] = useState("");
  const [university, setUniversity] = useState("");
  const [postCount, setPostCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followModal, setFollowModal] = useState<"followers" | "following" | null>(null);
  const [userStoryGroups, setUserStoryGroups] = useState<StoryGroup[]>([]);
  const [viewingStory, setViewingStory] = useState(false);

  // Fetch user stories for avatar ring
  const fetchMyStories = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("stories")
      .select("*")
      .eq("user_id", user.id)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (data && data.length > 0) {
      setUserStoryGroups([{
        user_id: user.id,
        display_name: profile?.display_name || profile?.username || "Você",
        username: profile?.username || "",
        avatar_url: profile?.avatar_url || null,
        is_anonymous: false,
        stories: data,
      }]);
    } else {
      setUserStoryGroups([]);
    }
  }, [user, profile]);

  useEffect(() => { fetchMyStories(); }, [fetchMyStories]);

  const hasStories = userStoryGroups.length > 0 && userStoryGroups[0].stories.length > 0;

  // Decoration system
  const username = profile?.username || "user";
  const defaultDeco = getUserDecoration(username);

  // Load/save decorations from database
  async function loadDecoFromDB(userId: string) {
    const { data } = await supabase
      .from("user_decorations")
      .select("border_id, effect_id, theme_id")
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  }

  async function saveDecoToDB(userId: string, border: string, effect: string, theme: string) {
    await supabase.from("user_decorations").upsert({
      user_id: userId,
      border_id: border,
      effect_id: effect,
      theme_id: theme,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
  }

  const [activeBorder, setActiveBorder] = useState(defaultDeco.border);
  const [activeEffect, setActiveEffect] = useState(defaultDeco.effect);
  const [activeTheme, setActiveTheme] = useState(defaultDeco.theme);
  const [showGallery, setShowGallery] = useState(false);
  const [wallet, setWallet] = useState<UserWallet>({ coins: 0, unlockedItems: ["none", "default", "pulse"] });
  const [showRewards, setShowRewards] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showVerified, setShowVerified] = useState(false);
  const [showBadgeAdmin, setShowBadgeAdmin] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [decoLoaded, setDecoLoaded] = useState(false);

  // Reload decorations from DB when user is available
  useEffect(() => {
    if (!user) return;
    loadDecoFromDB(user.id).then((saved) => {
      if (saved) {
        const b = allBorders.find((b) => b.id === saved.border_id);
        const e = allEffects.find((e) => e.id === saved.effect_id);
        const t = allThemes.find((t) => t.id === saved.theme_id);
        if (b) setActiveBorder(b);
        if (e) setActiveEffect(e);
        if (t) setActiveTheme(t);
      }
      setDecoLoaded(true);
    });
  }, [user]);

  // Save decorations to DB whenever they change (only after loaded)
  useEffect(() => {
    if (user && decoLoaded) {
      saveDecoToDB(user.id, activeBorder.id, activeEffect.id, activeTheme.id);
    }
  }, [user, activeBorder, activeEffect, activeTheme, decoLoaded]);

  useEffect(() => {
    if (profile) {
      setBio(profile.bio || "");
      setCourse(profile.course || "");
      setSemester(profile.semester || "");
      setUniversity((profile as any).university || "");
    }
  }, [profile]);

  // Fetch wallet from DB
  useEffect(() => {
    if (user && profile) {
      fetchWallet(user.id, profile.username || "").then(setWallet);
    }
  }, [user, profile]);

  useEffect(() => {
    if (!user) return;
    const sb = supabase as any;
    sb.from("posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }: any) => setPostCount(count ?? 0));

    sb.from("followers")
      .select("id", { count: "exact", head: true })
      .eq("following_id", user.id)
      .then(({ count }: any) => setFollowersCount(count ?? 0));

    sb.from("followers")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", user.id)
      .then(({ count }: any) => setFollowingCount(count ?? 0));
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ 
        bio: bio.trim() || null, 
        course: course.trim() || null, 
        semester: semester.trim() || null,
        university: university.trim() || null,
      } as any)
      .eq("user_id", user.id);
    if (error) { toast.error("Erro ao salvar"); return; }
    setProfile((p: any) => p ? { ...p, bio, course, semester, university } : p);
    toast.success("Perfil atualizado!");
    setEditing(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    await supabase.storage.from("avatars").remove([path]);
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error("Erro ao enviar foto");
      setUploadingAvatar(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatar_url = urlData.publicUrl + "?t=" + Date.now();
    await supabase.from("profiles").update({ avatar_url }).eq("user_id", user.id);
    setProfile((p: any) => p ? { ...p, avatar_url } : p);
    toast.success("Foto atualizada! 📸");
    setUploadingAvatar(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const nameColor = useNameColor(username);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const initial = (profile?.display_name?.[0] || profile?.username?.[0] || "U").toUpperCase();
  const isAdmin = isOwner(username);

  return (
    <div className={`min-h-screen pb-20 ${activeTheme.gradient || "bg-background"}`}>
      {/* Animated Banner */}
      {activeTheme.banner && (
        <div className={`h-28 w-full ${activeTheme.banner}`} />
      )}
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold font-display text-foreground">Perfil</h1>
          <div className="flex items-center gap-2">
            {/* Saldo UniqoCoins */}
            <button
              onClick={() => setShowRewards(!showRewards)}
              className="flex items-center gap-1.5 rounded-full bg-neon-orange/10 border border-neon-orange/20 px-3 py-1"
            >
              <Coins className="h-4 w-4 text-neon-orange" />
              <span className="text-sm font-bold font-display text-neon-orange">{wallet.coins}</span>
            </button>
            <button
              onClick={() => setShowGallery(!showGallery)}
              className={`transition-colors ${showGallery ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Palette className="h-5 w-5" />
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setShowAdmin(true)}
                  className="text-neon-orange hover:text-neon-orange/80 transition-colors"
                >
                  <UserCog className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowVerified(true)}
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  <BadgeCheck className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowBadgeAdmin(true)}
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  <Award className="h-5 w-5" />
                </button>
              </>
            )}
            {!isStandalone && (
              <button
                onClick={async () => {
                  if (canInstall) {
                    const accepted = await install();
                    if (accepted) toast.success("App instalado com sucesso!");
                  } else {
                    navigate("/install");
                  }
                }}
                className="text-muted-foreground hover:text-primary transition-colors"
                title="Instalar app"
              >
                <Download className="h-5 w-5" />
              </button>
            )}
            <button onClick={toggleTheme} className="text-muted-foreground hover:text-foreground transition-colors" title={theme === "dark" ? "Tema claro" : "Tema escuro"}>
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button onClick={() => setEditing(!editing)} className="text-muted-foreground hover:text-foreground transition-colors">
              <Settings className="h-5 w-5" />
            </button>
            <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-col items-center px-4 pt-8 w-full text-center">
        {/* Avatar com decoração - clicável para stories */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`relative ${activeEffect.className}`}
        >
          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          {/* Story ring */}
          {hasStories && (
            <div className="absolute -inset-[3px] rounded-full gradient-story z-0" />
          )}
          <div
            onClick={hasStories ? () => setViewingStory(true) : undefined}
            className={`relative h-24 w-24 rounded-full overflow-hidden flex items-center justify-center ${activeBorder.style} ${profile?.avatar_url ? "" : "gradient-primary"} ${hasStories ? "cursor-pointer p-[2px]" : ""}`}
          >
            <div className={`h-full w-full rounded-full overflow-hidden flex items-center justify-center ${hasStories ? "border-2 border-background" : ""} ${profile?.avatar_url ? "" : "gradient-primary"}`}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-3xl font-display font-bold text-background">{initial}</span>
              )}
            </div>
          </div>
          {activeBorder.rarity === "lendário" && !hasStories && (
            <motion.div
              className="absolute -inset-1 rounded-full opacity-30"
              style={{
                background: "conic-gradient(from 0deg, hsl(var(--neon-pink)), hsl(var(--primary)), hsl(var(--neon-orange)), hsl(var(--neon-pink)))",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          )}
          {/* Camera button */}
          <button
            onClick={() => avatarInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-primary flex items-center justify-center border-2 border-background text-primary-foreground shadow-lg z-10"
          >
            {uploadingAvatar ? (
              <div className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </button>
        </motion.div>

        <div className="flex flex-col items-center mt-4 w-full">
          <div className="flex items-center gap-1.5 justify-center w-full">
            <h2 className={`text-xl font-bold font-display ${nameColor || "text-foreground"}`}>
              {profile?.display_name || profile?.username || "Usuário"}
            </h2>
            <VerifiedBadge username={username} size={20} />
          </div>
          {profile?.username && (
            <p className="text-xs text-muted-foreground mt-0.5 text-center w-full">@{profile.username}</p>
          )}
          {((profile as any)?.university) && (
            <p className="text-xs font-medium mt-1 text-muted-foreground text-center w-full flex items-center justify-center gap-1">
              🏛️ {(profile as any).university}
            </p>
          )}
          {(profile?.course || profile?.semester) && (
            <p className={`text-sm font-medium mt-0.5 text-center w-full ${profile?.course ? getCourseColor(profile.course) : "text-primary"}`}>
              {[profile.course, profile.semester ? `${profile.semester}º período` : null].filter(Boolean).join(" · ")}
            </p>
          )}
          {profile?.bio && (
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-xs mx-auto">{profile.bio}</p>
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
            onClick={() => setFollowModal("followers")}
            className="text-center hover:opacity-70 transition-opacity"
          >
            <p className="text-lg font-bold font-display text-foreground">{followersCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Seguidores</p>
          </button>
          <div className="h-6 w-px bg-border" />
          <button 
            onClick={() => setFollowModal("following")}
            className="text-center hover:opacity-70 transition-opacity"
          >
            <p className="text-lg font-bold font-display text-foreground">{followingCount}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Seguindo</p>
          </button>
        </div>
      </div>

      {/* Como ganhar UniqoCoins */}
      {showRewards && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="px-4 mt-6"
        >
          <h3 className="text-sm font-semibold font-display text-muted-foreground mb-3 flex items-center gap-2">
            <Coins className="h-4 w-4 text-neon-orange" />
            Como ganhar UniqoCoins
          </h3>
          <div className="rounded-xl bg-card border border-border p-3 space-y-2">
            {coinRewards.map((reward) => (
              <div key={reward.id} className="flex items-center gap-3 py-1.5">
                <div className="h-8 w-8 rounded-lg bg-neon-orange/10 flex items-center justify-center flex-shrink-0">
                  <reward.icon className="h-4 w-4 text-neon-orange" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground">{reward.label}</p>
                  <p className="text-[10px] text-muted-foreground">{reward.description}</p>
                </div>
                <span className="text-xs font-bold text-neon-orange flex items-center gap-0.5">
                  +{reward.coins} <Coins className="h-3 w-3" />
                </span>
              </div>
            ))}
          </div>

          {/* Referral Link */}
          {profile?.username && (
            <div className="mt-4 rounded-xl bg-primary/5 border border-primary/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="h-4 w-4 text-primary" />
                <p className="text-xs font-semibold text-foreground">Seu link de convite</p>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[10px] bg-card rounded-lg px-2 py-1.5 text-muted-foreground truncate border border-border">
                  {`${window.location.origin}/auth?ref=${profile.username}`}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${profile.username}`);
                    toast.success("Link copiado! 🔗");
                  }}
                  className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 hover:bg-primary/20 transition-colors"
                >
                  <Copy className="h-3.5 w-3.5 text-primary" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Ganhe <span className="text-neon-orange font-bold">+30 coins</span> por cada amigo que se cadastrar!
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Theme Gallery */}
      {showGallery && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="px-4 mt-6"
        >
          <h3 className="text-sm font-semibold font-display text-muted-foreground mb-3 flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            Galeria de Decorações
          </h3>
          <ThemeGallery
            activeBorder={activeBorder}
            activeEffect={activeEffect}
            activeTheme={activeTheme}
            onChangeBorder={setActiveBorder}
            onChangeEffect={setActiveEffect}
            onChangeTheme={setActiveTheme}
            wallet={wallet}
            onWalletChange={setWallet}
            userId={user?.id}
          />
        </motion.div>
      )}

      {/* Insígnias */}
      <div className="px-4 mt-6">
        <h3 className="text-sm font-semibold font-display text-muted-foreground mb-3">Insígnias</h3>
        <div className="rounded-xl bg-card border border-border p-4">
          <BadgeNameList username={username} />
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="px-4 mt-6 space-y-3"
        >
          <h3 className="text-sm font-semibold font-display text-muted-foreground mb-2">Editar Perfil</h3>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Bio</label>
            <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Fale sobre você..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Universidade / Faculdade</label>
            <Select value={university} onValueChange={setUniversity}>
              <SelectTrigger className="bg-secondary border-border text-foreground">
                <SelectValue placeholder="Selecione sua instituição" />
              </SelectTrigger>
              <SelectContent>
                {UNIVERSITIES.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Curso</label>
            <Select value={course} onValueChange={setCourse}>
              <SelectTrigger className="bg-secondary border-border text-foreground">
                <SelectValue placeholder="Selecione seu curso" />
              </SelectTrigger>
              <SelectContent>
                {COURSES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Período</label>
            <Select value={semester} onValueChange={setSemester}>
              <SelectTrigger className="bg-secondary border-border text-foreground">
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}º Período</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 font-semibold text-sm"
          >
            Salvar
          </motion.button>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 mt-6">
        {[
          { label: "Posts", value: postCount, icon: BookOpen },
          { label: "Comentários", value: 0, icon: MessageCircle },
          { label: "Grupos", value: 0, icon: Users },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex flex-col items-center gap-1 rounded-xl bg-card border border-border p-3"
          >
            <stat.icon className="h-4 w-4 text-primary" />
            <span className="text-lg font-bold font-display text-foreground">{stat.value}</span>
            <span className="text-[10px] text-muted-foreground">{stat.label}</span>
          </motion.div>
        ))}
      </div>

      {/* Admin Panels */}
      <AdminCoinPanel
        open={showAdmin}
        onClose={() => setShowAdmin(false)}
        wallet={wallet}
        onWalletChange={setWallet}
        currentUserId={user?.id}
      />
      <VerifiedPanel
        open={showVerified}
        onClose={() => setShowVerified(false)}
      />
      <AdminBadgePanel
        open={showBadgeAdmin}
        onClose={() => setShowBadgeAdmin(false)}
      />
      {followModal && user && (
        <FollowManagerModal
          isOpen={!!followModal}
          onClose={() => setFollowModal(null)}
          userId={user.id}
          initialTab={followModal}
        />
      )}
      <AnimatePresence>
        {viewingStory && hasStories && (
          <StoryViewer
            groups={userStoryGroups}
            initialGroupIndex={0}
            onClose={() => setViewingStory(false)}
            onDeleted={() => { fetchMyStories(); setViewingStory(false); }}
            currentUserId={user?.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
