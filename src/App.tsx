import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";
import BottomNav from "@/components/BottomNav";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import Feed from "./pages/Feed";
import Communities from "./pages/Communities";
import Anonymous from "./pages/Anonymous";
import CommunityDetail from "./pages/CommunityDetail";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import Auth from "./pages/Auth";
import DirectMessages from "./pages/DirectMessages";
import SearchPage from "./pages/SearchPage";
import UserProfile from "./pages/UserProfile";
import Install from "./pages/Install";
import Mapa from "./pages/Mapa";
import NotFound from "./pages/NotFound";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";

const queryClient = new QueryClient();

function AppRoutes() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  return <AuthenticatedLayout />;
}

function AuthenticatedLayout() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const hideBottomNav = location.pathname.startsWith("/community/");

  const routes = (
    <Routes>
      <Route path="/" element={<Feed />} />
      <Route path="/communities" element={<Communities />} />
      <Route path="/community/:id" element={<CommunityDetail />} />
      <Route path="/anonymous" element={<Anonymous />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="/user/:userId" element={<UserProfile />} />
      <Route path="/install" element={<Install />} />
      <Route path="/mapa" element={<Mapa />} />
      <Route path="/dm" element={<DirectMessages />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  if (isMobile) {
    return (
      <div className="mx-auto max-w-lg min-h-screen">
        {routes}
        {!hideBottomNav && <BottomNav />}
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1">
          <div className="mx-auto max-w-2xl min-h-screen">
            {routes}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAUpdatePrompt />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
