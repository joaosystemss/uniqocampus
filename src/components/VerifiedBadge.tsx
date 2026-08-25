import { useState, useEffect } from "react";
import { BadgeCheck } from "lucide-react";
import { checkVerified } from "@/config/verifiedUsers";

interface VerifiedBadgeProps {
  username: string;
  size?: number;
}

export default function VerifiedBadge({ username, size = 16 }: VerifiedBadgeProps) {
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let cancelled = false;
    checkVerified(username).then((v) => {
      if (!cancelled) setVerified(v);
    });
    return () => { cancelled = true; };
  }, [username]);

  if (!verified) return null;

  return (
    <BadgeCheck
      className="inline-block ml-1 shrink-0"
      size={size}
      fill="#1d9bf0"
      stroke="hsl(var(--background))"
      style={{ color: '#1d9bf0' }}
    />
  );
}
