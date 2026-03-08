import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const EMOJI_OPTIONS = ["🔥", "😮", "👏", "😂", "💀", "♟️", "👑", "🎯"];

interface FloatingEmoji {
  id: string;
  emoji: string;
  x: number;
}

interface EmojiReactionsProps {
  gameId: string;
}

const EmojiReactions = ({ gameId }: EmojiReactionsProps) => {
  const { user } = useAuth();
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([]);
  const [cooldown, setCooldown] = useState(false);

  // Subscribe to emoji broadcasts
  useEffect(() => {
    const channel = supabase.channel(`emoji-${gameId}`)
      .on("broadcast", { event: "emoji" }, ({ payload }) => {
        const floater: FloatingEmoji = {
          id: `${Date.now()}-${Math.random()}`,
          emoji: payload.emoji,
          x: 10 + Math.random() * 80,
        };
        setFloaters((prev) => [...prev.slice(-20), floater]);
        setTimeout(() => {
          setFloaters((prev) => prev.filter((f) => f.id !== floater.id));
        }, 2500);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId]);

  const sendEmoji = useCallback((emoji: string) => {
    if (cooldown || !user) return;
    setCooldown(true);
    supabase.channel(`emoji-${gameId}`).send({
      type: "broadcast",
      event: "emoji",
      payload: { emoji, userId: user.id },
    });
    setTimeout(() => setCooldown(false), 800);
  }, [gameId, user, cooldown]);

  return (
    <>
      {/* Floating emojis overlay */}
      <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
        <AnimatePresence>
          {floaters.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 1, y: "100vh", x: `${f.x}vw`, scale: 0.5 }}
              animate={{ opacity: 0, y: "-10vh", scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              className="absolute text-3xl"
            >
              {f.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Emoji picker bar */}
      <div className="glass-card p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-2">React</p>
        <div className="flex gap-1.5 flex-wrap">
          {EMOJI_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => sendEmoji(emoji)}
              disabled={cooldown || !user}
              className="w-9 h-9 rounded-lg bg-secondary/40 hover:bg-secondary/80 flex items-center justify-center text-lg transition-all hover:scale-110 active:scale-95 disabled:opacity-40"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default EmojiReactions;
