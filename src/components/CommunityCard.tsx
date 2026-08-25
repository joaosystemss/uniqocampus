import { Users, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface CommunityCardProps {
  id: string;
  name: string;
  members: number;
  description: string;
  emoji: string;
  gradient: string;
  lastMessage?: string | null;
  lastMessageTime?: string | null;
  unreadCount?: number;
}

export default function CommunityCard({ id, name, members, description, emoji, gradient, lastMessage, lastMessageTime, unreadCount = 0 }: CommunityCardProps) {
  const navigate = useNavigate();

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/community/${id}`)}
      className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/30"
    >
      <div className="flex items-start gap-3">
        <div className="relative">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${gradient}`}>
            {emoji}
          </div>
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display font-semibold text-foreground truncate">{name}</h3>
            {lastMessageTime && (
              <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(lastMessageTime)}</span>
            )}
          </div>
          {lastMessage ? (
            <p className={`text-xs mt-0.5 truncate ${unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              <MessageCircle className="h-3 w-3 inline mr-1 -mt-0.5" />
              {lastMessage}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
          )}
          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            <span>{members} membros</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
