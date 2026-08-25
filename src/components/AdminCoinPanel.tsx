import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, UserCog, X, Send, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { setCoinsForUser, saveWalletDb, type UserWallet } from "@/config/coins";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminCoinPanelProps {
  open: boolean;
  onClose: () => void;
  wallet: UserWallet;
  onWalletChange: (w: UserWallet) => void;
  currentUserId?: string;
}

export default function AdminCoinPanel({ open, onClose, wallet, onWalletChange, currentUserId }: AdminCoinPanelProps) {
  const [targetSearch, setTargetSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [myCoins, setMyCoins] = useState(wallet.coins.toString());

  useEffect(() => { setMyCoins(wallet.coins.toString()); }, [wallet.coins]);

  useEffect(() => {
    if (!targetSearch.trim() || targetSearch.length < 2) { setSearchResults([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, display_name")
        .or(`username.ilike.%${targetSearch}%,display_name.ilike.%${targetSearch}%`)
        .limit(5);
      setSearchResults(data || []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [targetSearch]);

  if (!open) return null;

  async function handleSetUserCoins() {
    if (!selectedUser || !amount) return;
    const coins = parseInt(amount);
    if (isNaN(coins)) return;

    await setCoinsForUser(selectedUser.user_id, coins);
    toast.success(`@${selectedUser.username || selectedUser.display_name} agora tem ${coins} UniqoCoins`);
    setSelectedUser(null);
    setTargetSearch("");
    setAmount("");
  }

  async function handleSetMyCoins() {
    const coins = parseInt(myCoins);
    if (isNaN(coins) || !currentUserId) return;
    const updated: UserWallet = { ...wallet, coins: Math.max(0, coins) };
    await saveWalletDb(currentUserId, updated);
    onWalletChange(updated);
    toast.success(`Seu saldo: ${coins} UniqoCoins`);
  }

  async function quickAdd(amt: number) {
    if (!currentUserId) return;
    const newCoins = wallet.coins + amt;
    const updated: UserWallet = { ...wallet, coins: Math.max(0, newCoins) };
    await saveWalletDb(currentUserId, updated);
    onWalletChange(updated);
    setMyCoins(updated.coins.toString());
    toast.success(`${amt > 0 ? "+" : ""}${amt} UniqoCoins → Saldo: ${updated.coins}`);
  }

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
              <UserCog className="h-5 w-5 text-neon-orange" />
              <h2 className="text-lg font-bold font-display text-foreground">Admin · UniqoCoins</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="px-4 pb-6 space-y-5">
            {/* Meu saldo */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Seu Saldo</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neon-orange" />
                  <Input type="number" value={myCoins} onChange={(e) => setMyCoins(e.target.value)} className="pl-9 bg-secondary border-border text-foreground" />
                </div>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleSetMyCoins} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
                  Setar
                </motion.button>
              </div>
              <div className="flex gap-2 mt-2">
                {[100, 500, 1000, 5000].map((amt) => (
                  <motion.button key={amt} whileTap={{ scale: 0.95 }} onClick={() => quickAdd(amt)} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-neon-orange/10 border border-neon-orange/20 py-1.5 text-xs font-bold text-neon-orange">
                    <Plus className="h-3 w-3" />{amt}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Setar moedas de outros */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Setar Moedas de Usuário</p>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar usuário..." value={targetSearch} onChange={(e) => { setTargetSearch(e.target.value); setSelectedUser(null); }} className="pl-9 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                </div>
                {searchResults.length > 0 && !selectedUser && (
                  <div className="space-y-1 rounded-xl border border-border bg-secondary/50 p-2">
                    {searchResults.map((u) => (
                      <button key={u.user_id} onClick={() => { setSelectedUser(u); setTargetSearch(u.display_name || u.username); setSearchResults([]); }} className="w-full text-left rounded-lg px-3 py-2 text-xs hover:bg-primary/10 transition-colors">
                        <span className="font-semibold text-foreground">{u.display_name || u.username}</span>
                        {u.username && <span className="text-muted-foreground ml-1">@{u.username}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs">
                    <span className="font-semibold text-primary">{selectedUser.display_name} @{selectedUser.username}</span>
                    <button onClick={() => { setSelectedUser(null); setTargetSearch(""); }} className="ml-auto text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neon-orange" />
                    <Input type="number" placeholder="Quantidade" value={amount} onChange={(e) => setAmount(e.target.value)} className="pl-9 bg-secondary border-border text-foreground placeholder:text-muted-foreground" />
                  </div>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleSetUserCoins} disabled={!selectedUser} className="rounded-xl bg-neon-orange px-4 py-2 text-sm font-semibold text-background flex items-center gap-1.5 disabled:opacity-50">
                    <Send className="h-3.5 w-3.5" />
                    Enviar
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
