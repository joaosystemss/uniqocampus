import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles, Lock, Coins } from "lucide-react";
import { avatarBorders, avatarEffects, profileThemes, type AvatarBorder, type AvatarEffect, type ProfileTheme } from "@/config/decorations";
import { itemPrices, isItemUnlocked, canAfford, purchaseItem, type UserWallet } from "@/config/coins";
import { toast } from "sonner";

interface ThemeGalleryProps {
  activeBorder: AvatarBorder;
  activeEffect: AvatarEffect;
  activeTheme: ProfileTheme;
  onChangeBorder: (b: AvatarBorder) => void;
  onChangeEffect: (e: AvatarEffect) => void;
  onChangeTheme: (t: ProfileTheme) => void;
  wallet: UserWallet;
  onWalletChange: (w: UserWallet) => void;
  userId?: string;
}

const rarityColors: Record<string, string> = {
  "comum": "text-muted-foreground",
  "raro": "text-primary",
  "épico": "text-neon-orange",
  "lendário": "text-neon-pink",
};

const rarityBg: Record<string, string> = {
  "comum": "border-border",
  "raro": "border-primary/30",
  "épico": "border-neon-orange/30",
  "lendário": "border-neon-pink/30",
};

type Tab = "bordas" | "efeitos" | "temas";

export default function ThemeGallery({
  activeBorder, activeEffect, activeTheme,
  onChangeBorder, onChangeEffect, onChangeTheme,
  wallet, onWalletChange, userId,
}: ThemeGalleryProps) {
  const [tab, setTab] = useState<Tab>("bordas");
  const [confirmItem, setConfirmItem] = useState<string | null>(null);

  const tabs: { id: Tab; label: string }[] = [
    { id: "bordas", label: "Bordas" },
    { id: "efeitos", label: "Efeitos" },
    { id: "temas", label: "Temas" },
  ];

  async function handlePurchase(itemId: string) {
    const result = await purchaseItem(wallet, itemId, userId || "");
    if (result) {
      onWalletChange(result);
      toast.success(`Desbloqueado! -${itemPrices[itemId]} UniqoCoins`, {
        description: `Saldo: ${result.coins} coins`,
      });
    }
    setConfirmItem(null);
  }

  function handleItemClick(
    itemId: string,
    isUnlocked: boolean,
    onSelect: () => void,
  ) {
    if (isUnlocked) {
      onSelect();
    } else {
      setConfirmItem(itemId);
    }
  }

  function renderLock(itemId: string) {
    const unlocked = isItemUnlocked(wallet, itemId);
    const price = itemPrices[itemId] ?? 0;
    if (unlocked || price === 0) return null;

    const afford = canAfford(wallet, itemId);

    return (
      <div className="absolute inset-0 rounded-xl bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-1 z-10">
        <Lock className="h-4 w-4 text-muted-foreground" />
        <div className={`flex items-center gap-1 text-[10px] font-bold ${afford ? "text-neon-orange" : "text-muted-foreground"}`}>
          <Coins className="h-3 w-3" />
          {price}
        </div>
      </div>
    );
  }

  function renderConfirmModal() {
    if (!confirmItem) return null;
    const price = itemPrices[confirmItem] ?? 0;
    const afford = canAfford(wallet, confirmItem);

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setConfirmItem(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-card border border-border rounded-2xl p-6 w-full max-w-xs text-center"
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <Coins className="h-6 w-6 text-neon-orange" />
              <span className="text-2xl font-bold font-display text-foreground">{price}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Desbloquear este item?</p>
            <p className="text-xs text-muted-foreground mb-4">
              Seu saldo: <span className={afford ? "text-primary font-bold" : "text-destructive font-bold"}>{wallet.coins} coins</span>
            </p>

            {afford ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmItem(null)}
                  className="flex-1 py-2 rounded-xl bg-secondary text-sm font-semibold text-muted-foreground"
                >
                  Cancelar
                </button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handlePurchase(confirmItem)}
                  className="flex-1 py-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground flex items-center justify-center gap-1.5"
                >
                  <Coins className="h-3.5 w-3.5" />
                  Comprar
                </motion.button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-destructive font-semibold mb-3">Moedas insuficientes!</p>
                <button
                  onClick={() => setConfirmItem(null)}
                  className="w-full py-2 rounded-xl bg-secondary text-sm font-semibold text-muted-foreground"
                >
                  Fechar
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <>
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-border">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 text-xs font-semibold font-display transition-colors ${
                tab === t.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-4">
          {tab === "bordas" && (
            <div className="grid grid-cols-3 gap-3">
              {avatarBorders.map((border, i) => {
                const isActive = activeBorder.id === border.id;
                const unlocked = isItemUnlocked(wallet, border.id);
                return (
                  <motion.button
                    key={border.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleItemClick(border.id, unlocked, () => onChangeBorder(border))}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors ${
                      isActive && unlocked ? "bg-primary/10 border-primary/40" : `bg-secondary/50 ${rarityBg[border.rarity]}`
                    }`}
                  >
                    {renderLock(border.id)}
                    <div className={`h-12 w-12 rounded-full bg-muted flex items-center justify-center ${border.style}`}>
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-[10px] font-semibold text-foreground">{border.name}</span>
                    <div className="flex items-center gap-1">
                      <span className={`text-[8px] uppercase font-bold ${rarityColors[border.rarity]}`}>{border.rarity}</span>
                      {border.animated && <span className="text-[7px] uppercase font-bold text-accent bg-accent/10 px-1 rounded">✨</span>}
                    </div>
                    {isActive && unlocked && (
                      <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

          {tab === "efeitos" && (
            <div className="grid grid-cols-2 gap-3">
              {avatarEffects.map((effect, i) => {
                const isActive = activeEffect.id === effect.id;
                const unlocked = isItemUnlocked(wallet, effect.id);
                return (
                  <motion.button
                    key={effect.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleItemClick(effect.id, unlocked, () => onChangeEffect(effect))}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-colors ${
                      isActive && unlocked ? "bg-primary/10 border-primary/40" : `bg-secondary/50 ${rarityBg[effect.rarity]}`
                    }`}
                  >
                    {renderLock(effect.id)}
                    <div className={`h-14 w-14 rounded-full gradient-primary flex items-center justify-center ${effect.className}`}>
                      <span className="text-lg font-display font-bold text-background">V</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground">{effect.name}</span>
                    <div className="flex items-center gap-1">
                      <span className={`text-[8px] uppercase font-bold ${rarityColors[effect.rarity]}`}>{effect.rarity}</span>
                      {effect.animated && <span className="text-[7px] uppercase font-bold text-accent bg-accent/10 px-1 rounded">✨</span>}
                    </div>
                    {isActive && unlocked && (
                      <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}

          {tab === "temas" && (
            <div className="grid grid-cols-2 gap-3">
              {profileThemes.map((theme, i) => {
                const isActive = activeTheme.id === theme.id;
                const unlocked = isItemUnlocked(wallet, theme.id);
                return (
                  <motion.button
                    key={theme.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => handleItemClick(theme.id, unlocked, () => onChangeTheme(theme))}
                    className={`relative flex flex-col items-center gap-2 rounded-xl border p-3 overflow-hidden transition-colors ${
                      isActive && unlocked ? "border-primary/40" : `${rarityBg[theme.rarity]}`
                    }`}
                  >
                    {renderLock(theme.id)}
                    <div className={`absolute inset-0 ${theme.gradient || "bg-secondary/50"}`} />
                    <div className="relative z-[1] h-10 w-10 rounded-full gradient-primary flex items-center justify-center mt-2">
                      <span className="text-sm font-display font-bold text-background">V</span>
                    </div>
                    <span className="relative z-[1] text-xs font-semibold text-foreground">{theme.name}</span>
                    <div className="relative z-[1] flex items-center gap-1">
                      <span className={`text-[8px] uppercase font-bold ${rarityColors[theme.rarity]}`}>{theme.rarity}</span>
                      {theme.animated && <span className="text-[7px] uppercase font-bold text-accent bg-accent/10 px-1 rounded">✨</span>}
                    </div>
                    {isActive && unlocked && (
                      <div className="absolute top-1.5 right-1.5 z-10 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {renderConfirmModal()}
    </>
  );
}
