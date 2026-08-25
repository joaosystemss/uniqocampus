import { useState, useEffect } from "react";
import { Home, Flame, Bell, User, Users, Map } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function BottomNav() {
  const user = useAuth();
  const [unread, setUnread] = useState(0);
  const [groupUnread, setGroupUnread] = useState(0);

  // Notification badge
  useEffect(() => {
    if (!user) return;
    const sb = supabase as any;
    sb.from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .then(({ count }: any) => setUnread(count ?? 0));

    const channel = supabase
      .channel("nav-notif-count")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, () => {
        sb.from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("read", false)
          .then(({ count }: any) => setUnread(count ?? 0));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Group unread badge
  useEffect(() => {
    if (!user) return;
    const sb = supabase as any;

    const calcUnread = async () => {
      // Get communities user is a member of
      const { data: memberships } = await sb
        .from("community_members")
        .select("community_id")
        .eq("user_id", user.id);
      
      if (!memberships?.length) { setGroupUnread(0); return; }

      const visits = (() => {
        try { return JSON.parse(localStorage.getItem(`community_visits_${user.id}`) || "{}"); }
        catch { return {}; }
      })();

      let total = 0;
      const promises = memberships.map(async (m: any) => {
        const lastVisit = visits[m.community_id] || "1970-01-01T00:00:00Z";
        const { count } = await sb
          .from("community_messages")
          .select("id", { count: "exact", head: true })
          .eq("community_id", m.community_id)
          .gt("created_at", lastVisit)
          .neq("user_id", user.id);
        return count ?? 0;
      });
      const counts = await Promise.all(promises);
      total = counts.reduce((a: number, b: number) => a + b, 0);
      setGroupUnread(total);
    };

    calcUnread();

    // Realtime: recalc on new community messages
    const channel = supabase
      .channel("nav-group-unread")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "community_messages",
      }, (payload: any) => {
        if (payload.new?.user_id !== user.id) {
          setGroupUnread(prev => prev + 1);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const navItems = [
    { to: "/", icon: Home, label: "Feed" },
    { to: "/communities", icon: Users, label: "Grupos", badge: groupUnread },
    { to: "/mapa", icon: Map, label: "Mapa" },
    { to: "/notifications", icon: Bell, label: "Avisos", badge: unread },
    { to: "/profile", icon: User, label: "Perfil" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background">
      <div className="mx-auto flex max-w-lg items-center justify-around py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className="relative flex items-center justify-center px-5 py-1.5 text-muted-foreground transition-colors"
            activeClassName="text-foreground"
          >
            <div className="relative">
              <item.icon className="h-[26px] w-[26px] stroke-[1.5]" />
              {item.badge && item.badge > 0 ? (
                <span className="absolute -top-1.5 -right-2 h-[18px] min-w-[18px] px-1 flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              ) : null}
            </div>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
