import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, EyeOff, Eye, Hash, Image, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  forceAnonymous?: boolean;
}

export default function CreatePostModal({ open, onClose, onCreated, forceAnonymous }: Props) {
  const user = useAuth();
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(forceAnonymous ?? false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  

  if (!open) return null;

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

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
    setMediaType(null);
  };

  const handleSubmit = async () => {
    if ((!content.trim() && !mediaFile) || !user) return;
    setLoading(true);

    let media_url: string | null = null;
    let media_type: string | null = null;

    if (mediaFile) {
      const ext = mediaFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("posts").upload(path, mediaFile);
      if (uploadError) {
        toast.error("Erro ao enviar mídia");
        setLoading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from("posts").getPublicUrl(path);
      media_url = urlData.publicUrl;
      media_type = mediaType;
    }

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: content.trim() || null,
      is_anonymous: forceAnonymous || isAnonymous,
      tags,
      media_url,
      media_type,
    } as any);
    setLoading(false);
    if (error) {
      toast.error("Erro ao publicar post");
      return;
    }
    toast.success("Post publicado! 🎉");
    setContent("");
    setTags([]);
    setIsAnonymous(forceAnonymous ?? false);
    clearMedia();
    onCreated();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-background flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-6 w-6" />
          </button>
          <h2 className="text-base font-bold font-display text-foreground">
            {forceAnonymous ? "Post Anônimo" : "Novo Post"}
          </h2>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={(!content.trim() && !mediaFile) || loading}
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </motion.button>
        </div>

        <div className="flex-1 px-4 pt-4 overflow-y-auto">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={forceAnonymous ? "Desabafe anonimamente..." : "No que você tá pensando?"}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none focus:outline-none text-base leading-relaxed"
            rows={4}
            autoFocus
          />

          {/* Media preview */}
          {mediaPreview && (
            <div className="relative mt-3 rounded-xl overflow-hidden border border-border">
              {mediaType === "video" ? (
                <video src={mediaPreview} className="w-full max-h-64 object-cover" controls />
              ) : (
                <img src={mediaPreview} alt="" className="w-full max-h-64 object-cover" />
              )}
              <button
                onClick={clearMedia}
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.map((tag) => (
              <span
                key={tag}
                onClick={() => setTags(tags.filter((t) => t !== tag))}
                className="text-xs bg-secondary text-primary rounded-full px-2.5 py-1 cursor-pointer hover:bg-destructive/20"
              >
                #{tag} ×
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="Adicionar tag..."
              className="h-8 text-sm bg-transparent border-border"
            />
          </div>
        </div>

        <div className="border-t border-border px-4 py-4 pb-6 flex-shrink-0 bg-background">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {/* Camera */}
            <input
              id="post-camera-input"
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handleMediaSelect}
            />
            <motion.label
              whileTap={{ scale: 0.9 }}
              htmlFor="post-camera-input"
              className="flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm bg-secondary text-foreground"
            >
              <Camera className="h-4 w-4 text-primary" />
              Câmera
            </motion.label>

            {/* Gallery */}
            <input
              id="post-media-input"
              type="file"
              accept="image/*,video/*"
              className="sr-only"
              onChange={handleMediaSelect}
            />
            <motion.label
              whileTap={{ scale: 0.9 }}
              htmlFor="post-media-input"
              className={`flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm ${
                mediaFile ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-foreground"
              }`}
            >
              <Image className="h-4 w-4 text-primary" />
              {mediaFile ? (mediaType === "video" ? "Vídeo ✓" : "Foto ✓") : "Galeria"}
            </motion.label>

            {!forceAnonymous && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm ${
                  isAnonymous
                    ? "bg-neon-orange/15 text-neon-orange border border-neon-orange/30"
                    : "bg-secondary text-foreground"
                }`}
              >
                {isAnonymous ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                Anônimo
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
