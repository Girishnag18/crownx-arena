import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, MessageCircle } from "lucide-react";
import { format } from "date-fns";

interface Friend {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface DirectMessagePanelProps {
  friend: Friend;
  onClose: () => void;
}

const DirectMessagePanel = ({ friend, onClose }: DirectMessagePanelProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("direct_messages" as any)
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true })
      .limit(100);

    if (data) setMessages(data as unknown as Message[]);

    // Mark unread messages as read
    await supabase
      .from("direct_messages" as any)
      .update({ is_read: true })
      .eq("sender_id", friend.id)
      .eq("receiver_id", user.id)
      .eq("is_read", false);
  };

  useEffect(() => {
    loadMessages();
  }, [user?.id, friend.id]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`dm-${[user.id, friend.id].sort().join("-")}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "direct_messages",
      }, (payload: any) => {
        const msg = payload.new as Message;
        if (
          (msg.sender_id === user.id && msg.receiver_id === friend.id) ||
          (msg.sender_id === friend.id && msg.receiver_id === user.id)
        ) {
          setMessages((prev) => [...prev, msg]);
          // Mark as read if we're the receiver
          if (msg.receiver_id === user.id) {
            supabase
              .from("direct_messages" as any)
              .update({ is_read: true })
              .eq("id", msg.id);
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, friend.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const sendMessage = async () => {
    if (!user || !draft.trim()) return;
    setSending(true);
    await supabase.from("direct_messages" as any).insert({
      sender_id: user.id,
      receiver_id: friend.id,
      content: draft.trim(),
    });
    setDraft("");
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
      style={{ height: "28rem" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-secondary/30">
        <Avatar className="w-8 h-8 border border-border/60">
          <AvatarImage src={friend.avatar_url || undefined} />
          <AvatarFallback className="text-xs">{(friend.username || "P")[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="font-semibold text-sm flex-1 truncate">{friend.username || "Player"}</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary/60">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <MessageCircle className="w-8 h-8 opacity-40" />
            <p className="text-xs">No messages yet. Say hello!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                isMe
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-secondary text-foreground rounded-bl-sm"
              }`}>
                <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {format(new Date(msg.created_at), "HH:mm")}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <div className="border-t border-border p-2 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Type a message..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={sending || !draft.trim()}
          className="bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:opacity-90 disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default DirectMessagePanel;
