import { useState, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { X, Music, Send, Eye, EyeOff, Image, Camera, Type, Plus, Minus, Bold, Italic } from "lucide-react";
import MusicPicker from "@/components/MusicPicker";
import { type Song } from "@/config/musicLibrary";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CreateStoryModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const FONTS = [
  { id: "display", name: "Display", className: "font-display" },
  { id: "sans", name: "Sans", className: "font-sans" },
  { id: "serif", name: "Serif", className: "font-serif" },
  { id: "mono", name: "Mono", className: "font-mono" },
];

export default function CreateStoryModal({ open, onClose, onCreated }: CreateStoryModalProps) {
  const user = useAuth();
  const [text, setText] = useState("");
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Text editing state
  const [fontSize, setFontSize] = useState(24);
  const [fontIndex, setFontIndex] = useState(0);
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const currentFont = FONTS[fontIndex];

  if (!open) return null;

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video/");
    setMediaFile(file);
    setMediaType(isVideo ? "video" : "image");
    const url = URL.createObjectURL(file);
    setMediaPreview(url);
  };

  const clearMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
  };

  const handlePublish = async () => {
    if (!user || (!text.trim() && !mediaFile)) return;
    setLoading(true);

    let image_url: string | null = null;

    if (mediaFile) {
      const ext = mediaFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("stories").upload(path, mediaFile);
      if (uploadError) {
        toast.error("Erro ao enviar mídia");
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("stories").getPublicUrl(path);
      image_url = urlData.publicUrl;
    }

    const { error } = await supabase.from("stories").insert({
      user_id: user.id,
      text: text.trim() || null,
      image_url,
      media_type: mediaType,
      song_id: selectedSong?.id || null,
      song_title: selectedSong?.title || null,
      song_artist: selectedSong?.artist || null,
      is_anonymous: isAnonymous,
    } as any);

    setLoading(false);
    if (error) {
      toast.error("Erro ao publicar story");
      return;
    }

    toast.success("Story publicado! ✨");
    setText("");
    setSelectedSong(null);
    setIsAnonymous(false);
    clearMedia();
    setTextPosition({ x: 0, y: 0 });
    setFontSize(24);
    setFontIndex(0);
    setIsBold(true);
    setIsItalic(false);
    onCreated();
    onClose();
  };

  const increaseFontSize = () => setFontSize((s) => Math.min(s + 4, 64));
  const decreaseFontSize = () => setFontSize((s) => Math.max(s - 4, 12));
  const cycleFont = () => setFontIndex((i) => (i + 1) % FONTS.length);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-background flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-6 w-6" />
          </button>
          <h2 className="text-base font-bold font-display text-foreground">Novo Story</h2>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePublish}
            disabled={(!text.trim() && !mediaFile) || loading}
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </motion.button>
        </div>

        {/* Preview area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-hidden">
          <div
            ref={previewRef}
            className={`relative w-full max-w-sm aspect-[9/16] rounded-2xl border border-border flex flex-col items-center justify-center overflow-hidden ${
              mediaPreview ? "" : isAnonymous ? "gradient-anonymous" : "gradient-story"
            }`}
          >
            {mediaPreview && (
              <>
                {mediaType === "video" ? (
                  <video src={mediaPreview} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop />
                ) : (
                  <img src={mediaPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                <button
                  onClick={clearMedia}
                  className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-black/50 flex items-center justify-center text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            )}

            {/* Draggable text */}
            {text && (
              <motion.div
                drag
                dragMomentum={false}
                dragElastic={0}
                dragConstraints={previewRef}
                onDragEnd={(_, info) => {
                  setTextPosition((prev) => ({
                    x: prev.x + info.offset.x,
                    y: prev.y + info.offset.y,
                  }));
                }}
                style={{ x: textPosition.x, y: textPosition.y }}
                className="absolute z-10 cursor-move touch-none select-none"
                onClick={() => setIsEditing(true)}
              >
                <p
                  className={`text-center text-white drop-shadow-lg px-4 py-2 ${currentFont.className} ${isBold ? "font-bold" : "font-normal"} ${isItalic ? "italic" : ""}`}
                  style={{ fontSize: `${fontSize}px` }}
                >
                  {text}
                </p>
              </motion.div>
            )}

            {/* Text input overlay when editing */}
            {isEditing && (
              <div
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                onClick={() => setIsEditing(false)}
              >
                <div onClick={(e) => e.stopPropagation()} className="w-[80%]">
                  <textarea
                    autoFocus
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Digite seu texto..."
                    className={`w-full bg-transparent text-center text-white placeholder:text-white/50 resize-none focus:outline-none ${currentFont.className} ${isBold ? "font-bold" : "font-normal"} ${isItalic ? "italic" : ""}`}
                    style={{ fontSize: `${fontSize}px` }}
                    rows={3}
                    onBlur={() => setIsEditing(false)}
                  />
                </div>
              </div>
            )}

            {/* Add text button when no text */}
            {!text && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="relative z-10 flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors"
              >
                <Type className="h-8 w-8" />
                <span className="text-sm font-medium">Adicionar texto</span>
              </button>
            )}

            {selectedSong && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2"
              >
                <Music className="h-3.5 w-3.5 text-white" />
                <div className="text-left">
                  <p className="text-xs font-semibold text-white leading-tight">{selectedSong.title}</p>
                  <p className="text-[10px] text-white/70 leading-tight">{selectedSong.artist}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Text editing toolbar - shows when there's text */}
          {(text || showTextEditor) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-4 bg-card rounded-xl px-3 py-2 border border-border"
            >
              {/* Font size controls */}
              <button
                onClick={decreaseFontSize}
                className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="text-xs font-medium text-muted-foreground w-8 text-center">{fontSize}</span>
              <button
                onClick={increaseFontSize}
                className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80"
              >
                <Plus className="h-4 w-4" />
              </button>

              <div className="h-6 w-px bg-border mx-1" />

              {/* Font selector */}
              <button
                onClick={cycleFont}
                className="h-8 px-3 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-secondary/80 text-xs font-medium"
              >
                {currentFont.name}
              </button>

              <div className="h-6 w-px bg-border mx-1" />

              {/* Bold */}
              <button
                onClick={() => setIsBold(!isBold)}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                  isBold ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                <Bold className="h-4 w-4" />
              </button>

              {/* Italic */}
              <button
                onClick={() => setIsItalic(!isItalic)}
                className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${
                  isItalic ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"
                }`}
              >
                <Italic className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </div>

        {/* Bottom toolbar */}
        <div className="border-t border-border px-4 py-4 pb-6 flex-shrink-0 bg-background">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {/* Camera */}
            <input
              ref={cameraRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handleMediaSelect}
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => cameraRef.current?.click()}
              className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm bg-secondary text-foreground"
            >
              <Camera className="h-4 w-4 text-primary" />
              Câmera
            </motion.button>

            {/* Gallery */}
            <input
              id="story-media-input"
              type="file"
              accept="image/*,video/*"
              className="sr-only"
              onChange={handleMediaSelect}
            />
            <motion.label
              whileTap={{ scale: 0.9 }}
              htmlFor="story-media-input"
              className={`flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm ${
                mediaFile ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-foreground"
              }`}
            >
              <Image className="h-4 w-4 text-primary" />
              {mediaFile ? (mediaType === "video" ? "Vídeo ✓" : "Foto ✓") : "Galeria"}
            </motion.label>

            {/* Text */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setShowTextEditor(true);
                setIsEditing(true);
              }}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm ${
                text ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-foreground"
              }`}
            >
              <Type className="h-4 w-4 text-primary" />
              Texto
            </motion.button>

            {/* Music */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMusicOpen(true)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm ${
                selectedSong ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-foreground"
              }`}
            >
              <Music className="h-4 w-4 text-neon-pink" />
              Música
            </motion.button>

            {/* Anonymous */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm ${
                isAnonymous ? "bg-neon-orange/15 text-neon-orange border border-neon-orange/30" : "bg-secondary text-foreground"
              }`}
            >
              {isAnonymous ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              Anônimo
            </motion.button>
          </div>
        </div>

        <MusicPicker
          open={musicOpen}
          onClose={() => setMusicOpen(false)}
          onSelect={(song) => {
            setSelectedSong(song);
            setMusicOpen(false);
          }}
          selected={selectedSong}
        />
      </motion.div>
    </AnimatePresence>
  );
}
