import { Heart, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function Match() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-lg">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-neon-pink" />
            <h1 className="text-xl font-bold font-display text-foreground">UniMatch</h1>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex flex-col items-center justify-center px-6 pt-24 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-6"
        >
          <Heart className="h-20 w-20 text-neon-pink/20" />
        </motion.div>
        <h2 className="text-lg font-bold font-display text-foreground">Em breve!</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">
          O UniMatch ainda está sendo preparado. Logo você vai poder encontrar pessoas com interesses parecidos no campus! 💕
        </p>
      </div>
    </div>
  );
}
