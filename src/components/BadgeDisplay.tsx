import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getUserBadges, allBadges, getNameColor, type UserBadge, type BadgeCategory } from "@/config/badges";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

const rarityGlow: Record<string, string> = {
  "comum": "",
  "raro": "ring-1 ring-primary/30",
  "épico": "ring-1 ring-neon-orange/40 shadow-[0_0_6px_hsl(var(--neon-orange)/0.2)]",
  "lendário": "ring-1 ring-neon-pink/50 shadow-[0_0_10px_hsl(var(--neon-pink)/0.3)]",
};

const categoryLabels: Record<BadgeCategory, string> = {
  conquista: "🏆 Conquistas",
  curso: "📚 Curso",
  universidade: "🏛️ Universidade",
  periodo: "📅 Período",
  cargo: "🛡️ Cargos",
  especial: "✨ Especiais",
};

function useResolvedBadges(username: string) {
  const legacyBadges = useMemo(() => getUserBadges(username), [username]);
  const [badges, setBadges] = useState<UserBadge[]>(legacyBadges);

  useEffect(() => {
    let cancelled = false;

    const fetchDbBadges = async () => {
      const normalized = username?.trim();
      if (!normalized) {
        if (!cancelled) setBadges(legacyBadges);
        return;
      }

      const sb = supabase as any;

      const { data: profile } = await sb
        .from("profiles")
        .select("user_id")
        .eq("username", normalized)
        .maybeSingle();

      if (!profile?.user_id) {
        if (!cancelled) setBadges(legacyBadges);
        return;
      }

      const { data: rows } = await sb
        .from("user_badges")
        .select("badge_id")
        .eq("user_id", profile.user_id);

      const dbIds = new Set<string>((rows ?? []).map((r: any) => r.badge_id));
      const mergedIds = new Set<string>([...legacyBadges.map((b) => b.id), ...dbIds]);
      const mergedBadges = allBadges.filter((b) => mergedIds.has(b.id));

      if (!cancelled) setBadges(mergedBadges);
    };

    setBadges(legacyBadges);
    fetchDbBadges();

    return () => {
      cancelled = true;
    };
  }, [username, legacyBadges]);

  return badges;
}

export function useNameColor(username?: string): string | null {
  const safeUsername = username || "";
  const badges = useResolvedBadges(safeUsername);
  if (!safeUsername) return null;
  return getNameColor(badges);
}

export function BadgeIcon({ badge, size = "md" }: { badge: UserBadge; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const iconSize = size === "sm" ? 14 : 18;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.15, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className={`${sizeClass} rounded-lg ${badge.bgColor} ${rarityGlow[badge.rarity]} flex items-center justify-center cursor-pointer transition-shadow`}
          >
            <badge.icon className={`${badge.color}`} size={iconSize} />
          </motion.div>
        </TooltipTrigger>
        <TooltipContent className="bg-card border-border text-foreground">
          <p className="font-display font-bold text-sm">{badge.name}</p>
          <p className="text-xs text-muted-foreground">{badge.description}</p>
          <p className="text-[10px] text-muted-foreground/60 capitalize mt-0.5">{badge.rarity}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function BadgeGrid({ username }: { username: string }) {
  const badges = useResolvedBadges(username);
  if (badges.length === 0) return null;

  const grouped = badges.reduce((acc, badge) => {
    (acc[badge.category] = acc[badge.category] || []).push(badge);
    return acc;
  }, {} as Record<BadgeCategory, UserBadge[]>);

  return (
    <div className="space-y-3">
      {(Object.entries(grouped) as [BadgeCategory, UserBadge[]][]).map(([category, badges]) => (
        <div key={category}>
          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
            {categoryLabels[category]}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {badges.map((badge, i) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
              >
                <BadgeIcon badge={badge} />
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function BadgeRow({ username }: { username: string }) {
  const badges = useResolvedBadges(username);
  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.slice(0, 3).map((badge) => (
        <span
          key={badge.id}
          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${badge.bgColor} ${badge.color}`}
          title={badge.description}
        >
          {badge.name}
        </span>
      ))}
      {badges.length > 3 && (
        <span className="text-[10px] text-muted-foreground self-center">+{badges.length - 3}</span>
      )}
    </div>
  );
}

export function BadgeNameList({ username }: { username: string }) {
  const badges = useResolvedBadges(username);
  if (badges.length === 0) return null;

  const grouped = badges.reduce((acc, badge) => {
    (acc[badge.category] = acc[badge.category] || []).push(badge);
    return acc;
  }, {} as Record<BadgeCategory, UserBadge[]>);

  return (
    <div className="space-y-3">
      {(Object.entries(grouped) as [BadgeCategory, UserBadge[]][]).map(([category, items]) => (
        <div key={category}>
          <p className="text-[10px] font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
            {categoryLabels[category]}
          </p>
          <div className="flex flex-wrap gap-2">
            {items.map((badge, i) => (
              <motion.span
                key={badge.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
                className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold ${badge.bgColor} ${badge.color}`}
                title={badge.description}
              >
                {badge.name}
              </motion.span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
