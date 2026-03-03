import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface InGameChatProps {
  gameId: string;
  userId: string;
  username: string;
}

interface InGameChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: number;
}

const InGameChat = ({ gameId, userId, username }: InGameChatProps) => {
  const [messages, setMessages] = useState<InGameChatMessage[]>([]);
  const [input, setInput] = useState("");
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    const channel = supabase.channel(`game-chat-${gameId}`, {
      config: { broadcast: { self: true } },
    });
    channelRef.current = channel;

    channel.on("broadcast", { event: "chat_msg" }, ({ payload }) => {
      const msg = payload as InGameChatMessage;
      setMessages((prev) => [...prev.slice(-49), msg]);
    });

    channel.subscribe();
    return () => {
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    const payload: InGameChatMessage = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId,
      username,
      text: text.slice(0, 180),
      createdAt: Date.now(),
    };
    setInput("");
    if (!channelRef.current) return;
    await channelRef.current.send({
      type: "broadcast",
      event: "chat_msg",
      payload,
    });
  };

  const orderedMessages = useMemo(() => [...messages].sort((a, b) => a.createdAt - b.createdAt), [messages]);

  return (
    <div className="glass-card p-4">
      <p className="font-display font-bold text-sm mb-2">Match Chat</p>
      <div className="h-32 overflow-y-auto rounded-md border border-border/60 bg-secondary/30 p-2 space-y-1 text-xs">
        {orderedMessages.length === 0 && <p className="text-muted-foreground">No chat yet.</p>}
        {orderedMessages.map((msg) => (
          <p key={msg.id}>
            <span className={msg.userId === userId ? "text-primary font-semibold" : "font-semibold"}>
              {msg.username}:
            </span>{" "}
            {msg.text}
          </p>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
        />
        <button onClick={() => void send()} className="rounded-md bg-primary/20 px-3 text-xs font-display font-bold text-primary">
          SEND
        </button>
      </div>
    </div>
  );
};

export default InGameChat;
