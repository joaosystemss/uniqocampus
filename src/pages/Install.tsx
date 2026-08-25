import { Download, Check, Share, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useNavigate } from "react-router-dom";
import uniqoMascot from "@/assets/uniqo-mascot.png";

export default function Install() {
  const { canInstall, install, isStandalone } = usePWAInstall();
  const navigate = useNavigate();

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center text-center max-w-sm"
      >
        <img src={uniqoMascot} alt="Uniqo" className="h-44 w-44 object-contain mb-4" />

        <h1 className="text-2xl font-bold font-display text-foreground mb-2">
          Instalar Uniqo
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          Adicione o Uniqo à sua tela inicial para uma experiência mais rápida, como um app nativo.
        </p>

        {isStandalone ? (
          <div className="flex items-center gap-2 text-accent bg-accent/10 rounded-xl px-5 py-3">
            <Check className="h-5 w-5" />
            <span className="font-semibold text-sm">App já instalado!</span>
          </div>
        ) : canInstall ? (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleInstall}
            className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-8 py-3 font-semibold text-sm"
          >
            <Download className="h-5 w-5" />
            Instalar agora
          </motion.button>
        ) : (
          <div className="w-full space-y-3">
            {/* iOS Instructions */}
            <div className="bg-card border border-border rounded-xl p-4 text-left space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Smartphone className="h-4 w-4 text-primary" />
                <p className="text-sm font-semibold text-foreground">
                  {isIOS ? "No seu iPhone/iPad:" : isAndroid ? "No seu Android:" : "Como instalar:"}
                </p>
              </div>

              {isIOS ? (
                <>
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                    <p className="text-sm text-muted-foreground">
                      Toque no botão <Share className="inline h-4 w-4 text-primary mx-0.5 -mt-0.5" /> <strong className="text-foreground">Compartilhar</strong> na barra do Safari
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                    <p className="text-sm text-muted-foreground">
                      Selecione <strong className="text-foreground">"Adicionar à Tela de Início"</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
                    <p className="text-sm text-muted-foreground">
                      Toque em <strong className="text-foreground">"Adicionar"</strong> e pronto!
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
                    <p className="text-sm text-muted-foreground">
                      Toque no menu do navegador <strong className="text-foreground">⋮</strong> (três pontinhos)
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
                    <p className="text-sm text-muted-foreground">
                      Selecione <strong className="text-foreground">"Instalar app"</strong> ou <strong className="text-foreground">"Adicionar à tela inicial"</strong>
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
                    <p className="text-sm text-muted-foreground">
                      Confirme e o Uniqo aparecerá na sua tela inicial!
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <button
          onClick={() => navigate(-1)}
          className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Voltar
        </button>
      </motion.div>
    </div>
  );
}
