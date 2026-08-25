import { Home, Flame, Bell, User, Users, Map } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import uniqoLogo from "@/assets/uniqo-logo-new.png";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
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
      .channel("sidebar-notif-count")
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
      const { data: memberships } = await sb
        .from("community_members")
        .select("community_id")
        .eq("user_id", user.id);

      if (!memberships?.length) { setGroupUnread(0); return; }

      const visits = (() => {
        try { return JSON.parse(localStorage.getItem(`community_visits_${user.id}`) || "{}"); }
        catch { return {}; }
      })();

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
      setGroupUnread(counts.reduce((a: number, b: number) => a + b, 0));
    };

    calcUnread();

    const channel = supabase
      .channel("sidebar-group-unread")
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
    { to: "/anonymous", icon: Flame, label: "Anônimo" },
    { to: "/mapa", icon: Map, label: "Mapa" },
    { to: "/notifications", icon: Bell, label: "Avisos", badge: unread },
    { to: "/profile", icon: User, label: "Perfil" },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2.5">
          <img src={uniqoLogo} alt="Uniqo" className="h-8 w-8 object-contain shrink-0" />
          {!collapsed && (
            <span className="text-xl font-bold tracking-tight text-foreground">Uniqo</span>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      end={item.to === "/"}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
                      activeClassName="bg-muted text-foreground font-medium"
                    >
                      <div className="relative shrink-0">
                        <item.icon className="h-5 w-5 stroke-[1.5]" />
                        {item.badge && item.badge > 0 ? (
                          <span className="absolute -top-1.5 -right-2 h-[16px] min-w-[16px] px-0.5 flex items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        ) : null}
                      </div>
                      {!collapsed && <span>{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
