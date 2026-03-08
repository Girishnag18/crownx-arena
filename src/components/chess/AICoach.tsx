import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Bot, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface MoveData {
  san?: string;
  move?: string;
  classification?: string;
}

interface AICoachProps {
  moves: MoveData[];
  playerColor: "w" | "b";
  accuracy: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  brilliants: number;
  onClose?: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chess-coach`;

const AICoach = ({ moves, playerColor, accuracy, blunders, mistakes, inaccuracies, brilliants, onClose }: AICoachProps) => {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAnalysis = useCallback(async () => {
    setStarted(true);
    setLoading(true);
    setError(null);
    setAnalysis("");

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          moves,
          playerColor,
          accuracy,
          blunders,
          mistakes,
          inaccuracies,
          brilliants,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        setError(errData.error || `Error ${resp.status}`);
        setLoading(false);
        return;
      }

      if (!resp.body) {
        setError("No response body");
        setLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAnalysis(fullText);
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
      setLoading(false);
    }
  }, [moves, playerColor, accuracy, blunders, mistakes, inaccuracies, brilliants]);

  if (!started) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 border border-primary/30"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            AI Coach
          </h3>
          {onClose && (
            <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Get personalized coaching advice from our AI. It will analyze your moves, identify patterns, and suggest improvements.
        </p>
        <button
          onClick={startAnalysis}
          className="w-full bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-4 py-2.5 rounded-lg gold-glow hover:scale-105 transition-transform flex items-center justify-center gap-2"
        >
          <Bot className="w-4 h-4" />
          ANALYZE MY GAME
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 border border-primary/30"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          AI Coach
          {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive mb-3">
          {error}
        </div>
      )}

      {analysis && (
        <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed max-h-96 overflow-y-auto">
          <ReactMarkdown>{analysis}</ReactMarkdown>
        </div>
      )}

      {loading && !analysis && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Analyzing your game...
        </div>
      )}
    </motion.div>
  );
};

export default AICoach;
