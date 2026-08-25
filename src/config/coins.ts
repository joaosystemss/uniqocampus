import { Coins, BookOpen, MessageCircle, Heart, Users, Flame, Award, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ===== Sistema de moedas UniqoCoins =====

export interface CoinReward {
  id: string;
  label: string;
  coins: number;
  icon: React.ComponentType<any>;
  description: string;
}

export const coinRewards: CoinReward[] = [
  { id: "post", label: "Novo post", coins: 5, icon: BookOpen, description: "Publique um post" },
  { id: "comment", label: "Comentar", coins: 2, icon: MessageCircle, description: "Comente em um post" },
  { id: "like-received", label: "Receber curtida", coins: 1, icon: Heart, description: "Alguém curtiu seu post" },
  { id: "join-group", label: "Entrar em grupo", coins: 10, icon: Users, description: "Entre em uma comunidade" },
  { id: "streak-daily", label: "Login diário", coins: 3, icon: Flame, description: "Acesse o app todo dia" },
  { id: "streak-7", label: "Streak 7 dias", coins: 25, icon: Zap, description: "7 dias seguidos ativo" },
  { id: "first-story", label: "Primeiro story", coins: 20, icon: Zap, description: "Publique seu primeiro story" },
  { id: "badge-earned", label: "Nova insígnia", coins: 15, icon: Award, description: "Desbloqueie uma insígnia" },
  { id: "referral", label: "Indicação", coins: 30, icon: Users, description: "Convide amigos pelo seu link" },
];

// Preços dos itens
export const itemPrices: Record<string, number> = {
  // Bordas
  "none": 0,
  "neon-pink": 50, "neon-orange": 50, "neon-cyan": 60, "neon-green": 60,
  "primary-glow": 150, "gold": 150, "purple-glow": 150, "breathing-blue": 200, "breathing-pink": 200,
  "gold-shine": 350, "rainbow": 400, "fire": 400, "ice": 400, "lightning": 450, "void": 500,
  // Efeitos
  "pulse": 0,
  "glow": 75, "float": 80, "shake": 80,
  "glow-gold": 150, "glow-pink": 200, "glow-cyan": 200, "spin-slow": 250,
  "rainbow-glow": 400, "sparkle": 450, "glitch": 500,
  // Temas
  "default": 0,
  "neon-night": 100, "sunset": 100, "midnight": 100, "forest": 100,
  "golden": 150, "ocean": 200, "cyberpunk": 250, "sakura": 250,
  "royal-gold": 400, "aurora": 500, "galaxy": 500, "matrix": 450, "inferno": 500,
};

export interface UserWallet {
  coins: number;
  unlockedItems: string[];
}

const freeItems = ["none", "default", "pulse"];
const allItemIds = Object.keys(itemPrices);
const ownerUsers = ["voce", "joaovictor"];

export function isOwner(username: string): boolean {
  return ownerUsers.includes(username.toLowerCase());
}

// Fetch wallet from DB
export async function fetchWallet(userId: string, username: string = ""): Promise<UserWallet> {
  if (username && ownerUsers.includes(username.toLowerCase())) {
    return { coins: 99999, unlockedItems: [...allItemIds] };
  }

  const { data, error } = await (supabase as any)
    .from("user_wallets")
    .select("coins, unlocked_items")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    // Create wallet if doesn't exist
    await (supabase as any)
      .from("user_wallets")
      .insert({ user_id: userId, coins: 50, unlocked_items: [...freeItems] });
    return { coins: 50, unlockedItems: [...freeItems] };
  }

  const items = data.unlocked_items || [];
  freeItems.forEach(id => { if (!items.includes(id)) items.push(id); });

  return { coins: data.coins, unlockedItems: items };
}

// Save wallet to DB
export async function saveWalletDb(userId: string, wallet: UserWallet) {
  await (supabase as any)
    .from("user_wallets")
    .update({ coins: wallet.coins, unlocked_items: wallet.unlockedItems, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

export function isItemUnlocked(wallet: UserWallet, itemId: string): boolean {
  return wallet.unlockedItems.includes(itemId);
}

export function canAfford(wallet: UserWallet, itemId: string): boolean {
  return wallet.coins >= (itemPrices[itemId] ?? 0);
}

export async function purchaseItem(wallet: UserWallet, itemId: string, userId: string): Promise<UserWallet | null> {
  const price = itemPrices[itemId] ?? 0;
  if (price === 0 || !canAfford(wallet, itemId) || isItemUnlocked(wallet, itemId)) return null;

  const updated: UserWallet = {
    coins: wallet.coins - price,
    unlockedItems: [...wallet.unlockedItems, itemId],
  };
  await saveWalletDb(userId, updated);
  return updated;
}

export async function addCoins(wallet: UserWallet, amount: number, userId: string): Promise<UserWallet> {
  const updated: UserWallet = { ...wallet, coins: wallet.coins + amount };
  await saveWalletDb(userId, updated);
  return updated;
}

export async function setCoinsForUser(userId: string, amount: number): Promise<void> {
  await (supabase as any)
    .from("user_wallets")
    .update({ coins: Math.max(0, amount), updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

// Legacy compat - sync getWallet returns a default, use fetchWallet instead
export function getWallet(_username: string = "", _userId: string = ""): UserWallet {
  return { coins: 0, unlockedItems: [...freeItems] };
}

export function saveWallet(_wallet: UserWallet, _userId: string = "") {
  // no-op, use saveWalletDb
}
