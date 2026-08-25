export type AvatarBorder = {
  id: string;
  name: string;
  style: string;
  rarity: "comum" | "raro" | "épico" | "lendário";
  animated?: boolean;
};

export type AvatarEffect = {
  id: string;
  name: string;
  className: string;
  rarity: "comum" | "raro" | "épico" | "lendário";
  animated?: boolean;
};

export type ProfileTheme = {
  id: string;
  name: string;
  gradient: string;
  rarity: "comum" | "raro" | "épico" | "lendário";
  animated?: boolean;
  banner?: string; // CSS for animated banner
};

export const avatarBorders: AvatarBorder[] = [
  { id: "none", name: "Sem borda", style: "", rarity: "comum" },
  // Raro
  { id: "neon-pink", name: "Neon Rosa", style: "ring-2 ring-neon-pink shadow-[0_0_15px_hsl(var(--neon-pink)/0.5)]", rarity: "raro" },
  { id: "neon-orange", name: "Neon Laranja", style: "ring-2 ring-neon-orange shadow-[0_0_15px_hsl(var(--neon-orange)/0.5)]", rarity: "raro" },
  { id: "neon-cyan", name: "Neon Ciano", style: "ring-2 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]", rarity: "raro" },
  { id: "neon-green", name: "Neon Verde", style: "ring-2 ring-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]", rarity: "raro" },
  // Épico
  { id: "primary-glow", name: "Glow Primário", style: "ring-2 ring-primary shadow-[0_0_20px_hsl(var(--primary)/0.6)]", rarity: "épico" },
  { id: "gold", name: "Dourado", style: "ring-2 ring-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]", rarity: "épico" },
  { id: "purple-glow", name: "Glow Roxo", style: "ring-2 ring-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.6)]", rarity: "épico" },
  { id: "breathing-blue", name: "Azul Pulsante", style: "ring-2 ring-primary deco-breathing-blue", rarity: "épico", animated: true },
  { id: "breathing-pink", name: "Rosa Pulsante", style: "ring-2 ring-neon-pink deco-breathing-pink", rarity: "épico", animated: true },
  // Lendário
  { id: "gold-shine", name: "Ouro Brilhante", style: "ring-[3px] ring-yellow-400 shadow-[0_0_25px_rgba(250,204,21,0.6),0_0_50px_rgba(234,179,8,0.2)]", rarity: "lendário" },
  { id: "rainbow", name: "Arco-íris", style: "deco-rainbow-border", rarity: "lendário", animated: true },
  { id: "fire", name: "Fogo 🔥", style: "ring-2 ring-neon-orange deco-fire-border", rarity: "lendário", animated: true },
  { id: "ice", name: "Gelo ❄️", style: "ring-2 ring-cyan-300 deco-ice-border", rarity: "lendário", animated: true },
  { id: "lightning", name: "Raio ⚡", style: "ring-2 ring-yellow-300 deco-lightning-border", rarity: "lendário", animated: true },
  { id: "void", name: "Void 🌀", style: "ring-2 ring-violet-600 deco-void-border", rarity: "lendário", animated: true },
];

export const avatarEffects: AvatarEffect[] = [
  { id: "none", name: "Sem efeito", className: "", rarity: "comum" },
  { id: "pulse", name: "Pulsar", className: "animate-pulse", rarity: "comum" },
  // Raro
  { id: "glow", name: "Brilho", className: "drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)]", rarity: "raro" },
  { id: "float", name: "Flutuar", className: "deco-float", rarity: "raro", animated: true },
  { id: "shake", name: "Tremer", className: "deco-shake-hover", rarity: "raro", animated: true },
  // Épico
  { id: "glow-gold", name: "Brilho Dourado", className: "drop-shadow-[0_0_12px_rgba(234,179,8,0.6)]", rarity: "épico" },
  { id: "glow-pink", name: "Brilho Rosa", className: "drop-shadow-[0_0_12px_hsl(var(--neon-pink)/0.6)]", rarity: "épico" },
  { id: "glow-cyan", name: "Brilho Ciano", className: "drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]", rarity: "épico" },
  { id: "spin-slow", name: "Rotação Lenta", className: "deco-spin-slow", rarity: "épico", animated: true },
  // Lendário
  { id: "rainbow-glow", name: "Brilho Arco-íris", className: "deco-rainbow-glow", rarity: "lendário", animated: true },
  { id: "sparkle", name: "Faísca ✨", className: "deco-sparkle", rarity: "lendário", animated: true },
  { id: "glitch", name: "Glitch", className: "deco-glitch", rarity: "lendário", animated: true },
];

export const profileThemes: ProfileTheme[] = [
  { id: "default", name: "Padrão", gradient: "", rarity: "comum" },
  // Raro
  { id: "neon-night", name: "Neon Night", gradient: "bg-gradient-to-b from-neon-pink/10 via-background to-background", rarity: "raro" },
  { id: "sunset", name: "Pôr do Sol", gradient: "bg-gradient-to-b from-neon-orange/10 via-background to-background", rarity: "raro" },
  { id: "midnight", name: "Meia-noite", gradient: "bg-gradient-to-b from-indigo-900/20 via-background to-background", rarity: "raro" },
  { id: "forest", name: "Floresta", gradient: "bg-gradient-to-b from-emerald-900/15 via-background to-background", rarity: "raro" },
  // Épico
  { id: "golden", name: "Dourado", gradient: "bg-gradient-to-b from-yellow-500/15 via-yellow-900/5 to-background", rarity: "épico" },
  { id: "ocean", name: "Oceano", gradient: "bg-gradient-to-b from-primary/10 via-background to-background", rarity: "épico" },
  { id: "cyberpunk", name: "Cyberpunk", gradient: "bg-gradient-to-b from-neon-pink/15 via-violet-900/10 to-background", rarity: "épico",
    banner: "deco-banner-cyberpunk" },
  { id: "sakura", name: "Sakura 🌸", gradient: "bg-gradient-to-b from-pink-400/10 via-rose-900/5 to-background", rarity: "épico",
    banner: "deco-banner-sakura" },
  // Lendário
  { id: "royal-gold", name: "Ouro Real", gradient: "bg-gradient-to-b from-yellow-400/20 via-amber-800/10 to-background", rarity: "lendário",
    banner: "deco-banner-gold" },
  { id: "aurora", name: "Aurora Boreal", gradient: "deco-theme-aurora", rarity: "lendário", animated: true,
    banner: "deco-banner-aurora" },
  { id: "galaxy", name: "Galáxia 🌌", gradient: "deco-theme-galaxy", rarity: "lendário", animated: true,
    banner: "deco-banner-galaxy" },
  { id: "matrix", name: "Matrix 💚", gradient: "bg-gradient-to-b from-green-500/15 via-green-900/5 to-background", rarity: "lendário",
    banner: "deco-banner-matrix" },
  { id: "inferno", name: "Inferno 🔥", gradient: "bg-gradient-to-b from-red-600/15 via-orange-900/8 to-background", rarity: "lendário", animated: true,
    banner: "deco-banner-inferno" },
];

// Config: decorações ativas por user
export const userDecorations: Record<string, { border: string; effect: string; theme: string }> = {
  "voce": { border: "fire", effect: "rainbow-glow", theme: "aurora" },
  "campus_oficial": { border: "primary-glow", effect: "glow-pink", theme: "neon-night" },
  "prof_silva": { border: "neon-orange", effect: "none", theme: "sunset" },
};

export function getUserDecoration(username: string) {
  const deco = userDecorations[username.toLowerCase()] || { border: "none", effect: "none", theme: "default" };
  return {
    border: avatarBorders.find(b => b.id === deco.border) || avatarBorders[0],
    effect: avatarEffects.find(e => e.id === deco.effect) || avatarEffects[0],
    theme: profileThemes.find(t => t.id === deco.theme) || profileThemes[0],
  };
}
