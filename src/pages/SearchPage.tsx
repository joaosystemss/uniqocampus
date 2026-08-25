import { useState, useEffect, useCallback } from "react";
import { Search, ArrowLeft, MessageCircle, UserPlus, UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

export default function SearchPage() {
  const user = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggested, setSuggested] = useState<any[]>([]);

  // Load suggested users on mount
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url, bio, course")
      .neq("user_id", user.id)
      .limit(20)
      .order("created_at", { ascending: false })
      .then(({ data }) => setSuggested(data || []));
  }, [user]);

  const handleSearch = useCallback(async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url, bio, course")
      .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
      .neq("user_id", user?.id || "")
      .limit(20);
    setResults(data || []);
    setLoading(false);
  }, [user]);

  const displayList = query.length >= 2 ? results : suggested;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Buscar usuários..."
              autoFocus
              className="w-full rounded-xl bg-secondary pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {!query && (
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sugestões</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      )}

      {query.length >= 2 && !loading && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-muted-foreground">Nenhum usuário encontrado</p>
        </div>
      )}

      <div className="px-4">
        {displayList.map((u, i) => (
          <motion.button
            key={u.user_id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => navigate(`/user/${u.user_id}`)}
            className="w-full flex items-center gap-3 py-3 border-b border-border/50 last:border-0"
          >
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {u.avatar_url ? (
                <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-foreground">
                  {(u.display_name?.[0] || u.username?.[0] || "U").toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{u.display_name || u.username}</p>
              {u.username && <p className="text-xs text-muted-foreground">@{u.username}</p>}
              {u.course && <p className="text-[10px] text-primary mt-0.5">{u.course}</p>}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
