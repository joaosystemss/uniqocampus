import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BadgeCheck, X, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { setVerified as setVerifiedDb, setVerifiedCache } from "@/config/verifiedUsers";
import { toast } from "sonner";

interface VerifiedPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function VerifiedPanel({ open, onClose }: VerifiedPanelProps) {
  const [users, setUsers] = useState<string[]>([]);
  const [newUser, setNewUser] = useState("");

  useEffect(() => {
    if (!open) return;
    (supabase as any)
      .from("profiles")
      .select("username")
      .eq("is_verified", true)
      .then(({ data }: any) => {
        const names = (data ?? []).map((r: any) => r.username).filter(Boolean);
        setUsers(names);
        names.forEach((u: string) => setVerifiedCache(u, true));
      });
  }, [open]);

  if (!open) return null;

  const handleAdd = async () => {
    const u = newUser.trim().toLowerCase();
    if (!u) return;
    if (users.includes(u)) {
      toast.error("Usuário já está verificado");
      return;
    }
    const { error } = await setVerifiedDb(u, true);
    if (error) {
      toast.error("Usuário não encontrado");
      return;
    }
    setUsers((prev) => [...prev, u]);
    setNewUser("");
    toast.success(`@${u} agora é verificado ✓`);
  };

  const handleRemove = async (username: string) => {
    await setVerifiedDb(username, false);
    setUsers((prev) => prev.filter((u) => u !== username));
    toast.success(`@${username} não é mais verificado`);
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
          className="absolute bottom-0 left-0 right-0 max-h-[80vh] rounded-t-2xl bg-card border-t border-border overflow-y-auto"
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold font-display text-foreground">Verificados</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-4 pb-6 space-y-4">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Username para verificar..."
                value={newUser}
                onChange={(e) => setNewUser(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleAdd}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                Verificar
              </motion.button>
            </div>

            <div className="space-y-1">
              {users.map((u) => (
                <div key={u} className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4 text-primary" fill="hsl(var(--primary))" stroke="hsl(var(--background))" />
                    <span className="text-sm font-semibold text-foreground">@{u}</span>
                  </div>
                  <button onClick={() => handleRemove(u)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {users.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum usuário verificado</p>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
