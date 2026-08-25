import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Award, ShieldCheck, X, Plus, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { allBadges } from "@/config/badges";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminBadgePanelProps {
  open: boolean;
  onClose: () => void;
}

const roleOptions = [
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderador" },
  { value: "professor", label: "Professor" },
  { value: "representante", label: "Representante" },
  { value: "user", label: "Usuário" },
];

const roleLabelMap = Object.fromEntries(roleOptions.map((r) => [r.value, r.label]));

export default function AdminBadgePanel({ open, onClose }: AdminBadgePanelProps) {
  const [targetUsername, setTargetUsername] = useState("");
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [resolvedUsername, setResolvedUsername] = useState<string>("");
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [selectedBadge, setSelectedBadge] = useState<string>(allBadges[0]?.id ?? "first-post");
  const [selectedRole, setSelectedRole] = useState<string>("moderator");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const loadUser = async () => {
    const username = targetUsername.trim();
    if (!username) return;

    setLoading(true);
    const sb = supabase as any;

    let profile: { user_id: string; username: string } | null = null;

    const { data: exactProfile } = await sb
      .from("profiles")
      .select("user_id, username")
      .eq("username", username)
      .maybeSingle();

    if (exactProfile) {
      profile = exactProfile;
    } else {
      const { data: fuzzyProfiles } = await sb
        .from("profiles")
        .select("user_id, username")
        .ilike("username", username)
        .limit(1);
      profile = fuzzyProfiles?.[0] ?? null;
    }

    if (!profile) {
      toast.error("Usuário não encontrado");
      setLoading(false);
      return;
    }

    const [{ data: badgesData }, { data: rolesData }] = await Promise.all([
      sb.from("user_badges").select("badge_id").eq("user_id", profile.user_id),
      sb.from("user_roles").select("role").eq("user_id", profile.user_id),
    ]);

    setTargetUserId(profile.user_id);
    setResolvedUsername(profile.username || username);
    setUserBadges((badgesData ?? []).map((b: any) => b.badge_id));
    setUserRoles((rolesData ?? []).map((r: any) => r.role));
    setLoading(false);
  };

  const assignBadge = async () => {
    if (!targetUserId || !selectedBadge) return;
    const sb = supabase as any;

    const { error } = await sb.from("user_badges").insert({
      user_id: targetUserId,
      badge_id: selectedBadge,
      source: "manual",
      awarded_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    });

    if (error) {
      toast.error("Sem permissão ou erro ao atribuir insígnia");
      return;
    }

    if (!userBadges.includes(selectedBadge)) setUserBadges((prev) => [...prev, selectedBadge]);
    toast.success("Insígnia atribuída!");
  };

  const removeBadge = async (badgeId: string) => {
    if (!targetUserId) return;
    const sb = supabase as any;

    const { error } = await sb
      .from("user_badges")
      .delete()
      .eq("user_id", targetUserId)
      .eq("badge_id", badgeId);

    if (error) {
      toast.error("Erro ao remover insígnia");
      return;
    }

    setUserBadges((prev) => prev.filter((b) => b !== badgeId));
    toast.success("Insígnia removida");
  };

  const assignRole = async () => {
    if (!targetUserId || !selectedRole) return;
    const sb = supabase as any;

    const { error } = await sb.from("user_roles").insert({
      user_id: targetUserId,
      role: selectedRole,
    });

    if (error) {
      toast.error("Sem permissão ou erro ao atribuir cargo");
      return;
    }

    if (!userRoles.includes(selectedRole)) setUserRoles((prev) => [...prev, selectedRole]);
    toast.success("Cargo atribuído!");
  };

  const removeRole = async (role: string) => {
    if (!targetUserId) return;
    const sb = supabase as any;

    const { error } = await sb
      .from("user_roles")
      .delete()
      .eq("user_id", targetUserId)
      .eq("role", role);

    if (error) {
      toast.error("Erro ao remover cargo");
      return;
    }

    setUserRoles((prev) => prev.filter((r) => r !== role));
    toast.success("Cargo removido");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl bg-card border-t border-border overflow-y-auto"
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold font-display text-foreground">Admin · Insígnias e Cargos</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-4 pb-6 space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Buscar usuário</p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={targetUsername}
                    onChange={(e) => setTargetUsername(e.target.value)}
                    placeholder="Username"
                    className="pl-9 bg-secondary border-border"
                  />
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={loadUser}
                  disabled={loading}
                  className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {loading ? "..." : "Carregar"}
                </motion.button>
              </div>
              {resolvedUsername && (
                <p className="text-xs text-primary">Gerenciando: @{resolvedUsername}</p>
              )}
            </div>

            {targetUserId && (
              <>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Setar Insígnia Manual</p>
                  <div className="flex items-center gap-2">
                    <Select value={selectedBadge} onValueChange={setSelectedBadge}>
                      <SelectTrigger className="bg-secondary border-border text-foreground">
                        <SelectValue placeholder="Selecione a insígnia" />
                      </SelectTrigger>
                      <SelectContent className="z-[200] max-h-60">
                        {allBadges.map((badge) => (
                          <SelectItem key={badge.id} value={badge.id}>
                            {badge.name} — {badge.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={assignBadge}
                      className="rounded-xl bg-primary px-3 py-2 text-primary-foreground"
                    >
                      <Plus className="h-4 w-4" />
                    </motion.button>
                  </div>

                  <div className="space-y-1">
                    {userBadges.length === 0 && <p className="text-xs text-muted-foreground">Sem insígnias atribuídas</p>}
                    {userBadges.map((badgeId) => {
                      const badge = allBadges.find((b) => b.id === badgeId);
                      return (
                        <div key={badgeId} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                          <span className="text-sm text-foreground">{badge?.name ?? badgeId}</span>
                          <button onClick={() => removeBadge(badgeId)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Setar Cargo</p>
                  <div className="flex items-center gap-2">
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                      <SelectTrigger className="bg-secondary border-border text-foreground">
                        <SelectValue placeholder="Selecione o cargo" />
                      </SelectTrigger>
                      <SelectContent className="z-[200]">
                        {roleOptions.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={assignRole}
                      className="rounded-xl bg-neon-orange px-3 py-2 text-background"
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </motion.button>
                  </div>

                  <div className="space-y-1">
                    {userRoles.length === 0 && <p className="text-xs text-muted-foreground">Sem cargos atribuídos</p>}
                    {userRoles.map((role) => (
                      <div key={role} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2">
                        <span className="text-sm text-foreground">{roleLabelMap[role] ?? role}</span>
                        <button onClick={() => removeRole(role)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
