import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, AtSign, Check, X as XIcon, Loader2 } from "lucide-react";
import uniqoLogo from "@/assets/uniqo-logo.png";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addCoins, fetchWallet } from "@/config/coins";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referrerUsername = searchParams.get("ref") || "";

  // Debounced username availability check
  useEffect(() => {
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    const val = username.trim().toLowerCase();
    if (val.length < 3) { setUsernameStatus("idle"); return; }

    setUsernameStatus("checking");
    usernameTimer.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", val)
        .maybeSingle();
      setUsernameStatus(data ? "taken" : "available");
    }, 500);

    return () => { if (usernameTimer.current) clearTimeout(usernameTimer.current); };
  }, [username]);

  // Process referral: award coins to the referrer
  async function processReferral(newUserId: string, refUsername: string) {
    try {
      // Find referrer by username
      const { data: referrer } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("username", refUsername.toLowerCase())
        .maybeSingle();

      if (!referrer) return;

      // Insert referral record (referred_id is unique, so duplicates are ignored)
      const { error } = await (supabase as any)
        .from("referrals")
        .insert({ referrer_id: referrer.user_id, referred_id: newUserId, coins_awarded: 30 });

      if (error) return; // duplicate or other issue

      // Award coins to referrer
      const wallet = await fetchWallet(referrer.user_id);
      await addCoins(wallet, 30, referrer.user_id);
    } catch {
      // silent fail - referral is a bonus
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "signup") {
        if (usernameStatus === "taken") {
          toast.error("Esse nome de usuário já está em uso.");
          setLoading(false);
          return;
        }
        if (usernameStatus !== "available") {
          toast.error("Aguarde a verificação do nome de usuário.");
          setLoading(false);
          return;
        }
        const normalizedUsername = username.toLowerCase();
        const { data: signUpData, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName, username: normalizedUsername },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        // Process referral if came from a referral link
        if (referrerUsername && signUpData.user) {
          processReferral(signUpData.user.id, referrerUsername);
        }

        toast.success("Conta criada! Verifique seu email para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta! 🎉");
        navigate("/");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-32 -left-32 h-64 w-64 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(var(--neon-pink)), transparent)" }}
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, hsl(var(--primary)), transparent)" }}
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/3 right-10 h-40 w-40 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(var(--neon-orange)), transparent)" }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-6">
        {/* Referral banner */}
        {referrerUsername && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm mb-4 rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5 text-center"
          >
            <p className="text-xs text-foreground font-medium">
              🎉 Você foi convidado por <span className="font-bold text-primary">@{referrerUsername}</span>
            </p>
          </motion.div>
        )}
        {/* Logo */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center flex flex-col items-center"
        >
          <motion.img
            src={uniqoLogo}
            alt="Uniqo"
            className="h-36 w-36 object-contain mb-3 drop-shadow-[0_0_30px_hsl(var(--primary)/0.4)]"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <h1 className="text-3xl font-bold font-display text-gradient-primary">Uniqo</h1>
          <p className="text-sm text-muted-foreground mt-1">A rede social universitária 🎓</p>
        </motion.div>

        {/* Form card */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-sm"
        >
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-secondary p-1 mb-6">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold font-display transition-all ${
                  mode === m
                    ? "bg-card text-foreground shadow-md"
                    : "text-muted-foreground"
                }`}
              >
                {m === "login" ? "Entrar" : "Criar Conta"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="name"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Seu nome"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl"
                      required={mode === "signup"}
                    />
                  </div>
                  <div className="relative mt-4">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Nome de usuário"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9._]/g, ""))}
                      className={`pl-10 pr-10 bg-card border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl ${
                        usernameStatus === "taken" ? "border-destructive focus-visible:ring-destructive" :
                        usernameStatus === "available" ? "border-green-500 focus-visible:ring-green-500" : ""
                      }`}
                      required={mode === "signup"}
                      maxLength={20}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {usernameStatus === "checking" && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
                      {usernameStatus === "available" && <Check className="h-4 w-4 text-green-500" />}
                      {usernameStatus === "taken" && <XIcon className="h-4 w-4 text-destructive" />}
                    </div>
                    {username.length >= 3 && usernameStatus !== "idle" && usernameStatus !== "checking" && (
                      <p className={`text-[11px] mt-1 ml-1 ${usernameStatus === "available" ? "text-green-500" : "text-destructive"}`}>
                        {usernameStatus === "available" ? "Disponível ✓" : "Já está em uso"}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email universitário"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-card border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl"
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-card border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full h-12 rounded-xl gradient-primary text-background font-semibold font-display text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-5 w-5 border-2 border-background/30 border-t-background rounded-full"
                />
              ) : (
                <>
                  {mode === "login" ? "Entrar" : "Criar Conta"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </motion.button>
          </form>

          {mode === "login" && (
            <p className="text-center text-xs text-muted-foreground mt-4">
              Esqueceu a senha?{" "}
              <button className="text-primary hover:underline">Recuperar</button>
            </p>
          )}
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-[10px] text-muted-foreground/50 mt-10 text-center"
        >
          Ao continuar, você concorda com os Termos de Uso do Uniqo
        </motion.p>
      </div>
    </div>
  );
}
