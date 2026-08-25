import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Music, Play, Pause, Check, X } from "lucide-react";
import { musicLibrary, genres, type Song } from "@/config/musicLibrary";
import { Input } from "@/components/ui/input";

interface MusicPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (song: Song | null) => void;
  selected?: Song | null;
}

export default function MusicPicker({ open, onClose, onSelect, selected }: MusicPickerProps) {
  const [search, setSearch] = useState("");
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filtered = musicLibrary.filter((song) => {
    const matchSearch =
      song.title.toLowerCase().includes(search.toLowerCase()) ||
      song.artist.toLowerCase().includes(search.toLowerCase());
    const matchGenre = !activeGenre || song.genre === activeGenre;
    return matchSearch && matchGenre;
  });

  // Handle audio playback
  useEffect(() => {
    if (!playing) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      return;
    }
    const song = musicLibrary.find(s => s.id === playing);
    if (!song?.preview) {
      // No preview available - just show visual feedback
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(song.preview);
    audio.volume = 0.5;
    audio.play().catch(() => {});
    audio.onended = () => setPlaying(null);
    audioRef.current = audio;

    return () => {
      audio.pause();
    };
  }, [playing]);

  // Cleanup on close
  useEffect(() => {
    if (!open && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlaying(null);
    }
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 max-h-[85vh] rounded-t-2xl bg-card border-t border-border overflow-hidden flex flex-col"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3">
            <div className="flex items-center gap-2">
              <Music className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold font-display text-foreground">Músicas</h2>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar música ou artista..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Genre filters */}
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveGenre(null)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                !activeGenre ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}
            >
              Todos
            </button>
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setActiveGenre(genre === activeGenre ? null : genre)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  activeGenre === genre ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                {genre}
              </button>
            ))}
          </div>

          {/* Selected song banner */}
          {selected && (
            <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl bg-primary/10 border border-primary/20 px-3 py-2">
              <Music className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{selected.title}</p>
                <p className="text-xs text-muted-foreground truncate">{selected.artist}</p>
              </div>
              <button
                onClick={() => onSelect(null)}
                className="text-xs text-neon-pink hover:text-neon-pink/80"
              >
                Remover
              </button>
            </div>
          )}

          {/* Info about music */}
          <div className="mx-4 mb-2 px-3 py-2 rounded-lg bg-muted/50">
            <p className="text-[11px] text-muted-foreground">
              🎵 As músicas são exibidas como etiqueta no story. O áudio não é reproduzido no story por questões de direitos autorais.
            </p>
          </div>

          {/* Song list */}
          <div className="flex-1 overflow-y-auto px-4 pb-6">
            <div className="space-y-1">
              {filtered.map((song, i) => {
                const isSelected = selected?.id === song.id;
                const isPlaying = playing === song.id;

                return (
                  <motion.button
                    key={song.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => onSelect(song)}
                    className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? "bg-primary/15 border border-primary/30"
                        : "hover:bg-secondary/80"
                    }`}
                  >
                    {/* Play indicator (visual only since no audio files) */}
                    <div
                      className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Music className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{song.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                    </div>

                    <span className="text-[10px] text-muted-foreground flex-shrink-0">{song.duration}</span>

                    {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
