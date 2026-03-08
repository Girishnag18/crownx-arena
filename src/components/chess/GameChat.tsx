import { useState, useEffect, useRef, useCallback } from "react";
import { MessageCircle, Send, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";

interface ChatMessage {
  id: string;
  game_id: string;
  user_id: string;
  message: string;
  emoji: string | null;
  is_reaction: boolean;
  created_at: string;
  username?: string;
  avatar_url?: string | null;
}

interface GameChatProps {
  gameId: string;
  isSpectator?: boolean;
}

const QUICK_EMOJIS = ["👏", "🔥", "😮", "💀", "😂", "👑", "💎", "🎯"];

const GameChat = ({ gameId, isSpectator = false }: GameChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const profileCache = useRef<Map<string, { username: string; avatar_url: string | null }>>(new Map());

  const enrichMessages = useCallback(async (msgs: ChatMessage[]) => {
    const unknownIds = [...new Set(msgs.map((m) => m.user_id))].filter((id) => !profileCache.current.has(id));
    if (unknownIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", unknownIds);
      for (const p of profiles || []) {
        profileCache.current.set(p.id, { username: p.username || "Player", avatar_url: p.avatar_url });
      }
    }
    return msgs.map((m) => ({
      ...m,
      username: profileCache.current.get(m.user_id)?.username || "Player",
      avatar_url: profileCache.current.get(m.user_id)?.avatar_url,
    }));
  }, []);

  // Load existing messages
  useEffect(() => {
    if (!gameId) return;

    const load = async () => {
      const { data } = await supabase
        .from("game_chat" as any)
        .select("*")
        .eq("game_id", gameId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (data) {
        const enriched = await enrichMessages(data as ChatMessage[]);
        setMessages(enriched);
      }
    };
    load();

    // Subscribe to realtime
    const channel = supabase
      .channel(`game-chat-${gameId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "game_chat", filter: `game_id=eq.${gameId}` },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          const [enriched] = await enrichMessages([newMsg]);
          setMessages((prev) => [...prev, enriched]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, enrichMessages]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string, emoji?: string, isReaction = false) => {
    if (!user || (!text.trim() && !emoji)) return;

    await supabase.from("game_chat" as any).insert({
      game_id: gameId,
      user_id: user.id,
      message: text.trim(),
      emoji: emoji || null,
      is_reaction: isReaction,
    } as any);

    setInput("");
    setShowEmojis(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) sendMessage(input);
  };

  const handleEmojiReaction = (emoji: string) => {
    sendMessage("", emoji, true);
  };

  return (
    <div className="glass-card flex flex-col" style={{ height: "320px" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          {isSpectator ? "Spectator Chat" : "Game Chat"}
        </h3>
        <span className="text-[10px] text-muted-foreground">{messages.length} msgs</span>
      </div>

      {/* Quick emoji bar */}
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-border/20 overflow-x-auto">
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => handleEmojiReaction(emoji)}
            disabled={!user}
            className="text-base hover:scale-125 transition-transform flex-shrink-0 disabled:opacity-40"
            title={`React with ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {messages.length === 0 && (
          <p className="text-xs text-muted-foreground italic text-center py-6">
            No messages yet. Say hi! 👋
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.user_id === user?.id;

          if (msg.is_reaction && msg.emoji) {
            return (
              <div key={msg.id} className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground">{msg.username}</span>
                <span className="text-lg">{msg.emoji}</span>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex items-start gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              <Avatar className="w-5 h-5 flex-shrink-0 mt-0.5">
                <AvatarImage src={getAvatarUrl(msg.avatar_url)} />
                <AvatarFallback className="text-[8px]">{(msg.username || "?")[0]}</AvatarFallback>
              </Avatar>
              <div className={`max-w-[75%] ${isMe ? "text-right" : ""}`}>
                <span className="text-[10px] text-muted-foreground">{msg.username}</span>
                <p className={`text-xs px-2 py-1 rounded-lg break-words ${
                  isMe ? "bg-primary/20 text-foreground" : "bg-secondary/60 text-foreground"
                }`}>
                  {msg.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2 border-t border-border/40">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isSpectator ? "Comment as spectator..." : "Type a message..."}
            maxLength={200}
            className="flex-1 bg-secondary/40 text-xs rounded-md px-3 py-1.5 outline-none focus:ring-1 focus:ring-primary/40 placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="text-primary disabled:opacity-30 hover:scale-110 transition-transform"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <div className="px-3 py-2 border-t border-border/40">
          <p className="text-xs text-muted-foreground text-center">Sign in to chat</p>
        </div>
      )}
    </div>
  );
};

export default GameChat;
