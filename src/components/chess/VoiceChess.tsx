import { useState, useCallback, useRef, useEffect } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Chess, Square } from "chess.js";
import { toast } from "sonner";

// Extend window for SpeechRecognition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface VoiceChessProps {
  game: Chess;
  onMove: (from: Square, to: Square, promotion?: string) => boolean | Promise<boolean>;
  disabled?: boolean;
}

// Map spoken piece names to chess.js piece letters
const PIECE_MAP: Record<string, string> = {
  king: "k", knight: "n", night: "n", bishop: "b",
  rook: "r", castle: "r", queen: "q", pawn: "",
};

// Map spoken file letters
const FILE_MAP: Record<string, string> = {
  a: "a", alpha: "a", b: "b", bravo: "b", c: "c", charlie: "c",
  d: "d", delta: "d", e: "e", echo: "e", f: "f", foxtrot: "f",
  g: "g", golf: "g", h: "h", hotel: "h",
};

// Map spoken rank numbers
const RANK_MAP: Record<string, string> = {
  one: "1", "1": "1", two: "2", "2": "2", to: "2", too: "2",
  three: "3", "3": "3", four: "4", "4": "4", for: "4",
  five: "5", "5": "5", six: "6", "6": "6",
  seven: "7", "7": "7", eight: "8", "8": "8", ate: "8",
};

/**
 * Parse a spoken phrase into a chess move.
 * Supports formats like:
 *  - "Knight f3" → finds the knight that can go to f3
 *  - "e4" → pawn to e4
 *  - "Bishop takes d5" → bishop capture to d5
 *  - "Castle kingside" / "Castle queenside"
 *  - "e2 e4" → explicit from-to
 */
function parseVoiceMove(transcript: string, game: Chess): { from: Square; to: Square; promotion?: string } | null {
  const raw = transcript.toLowerCase().trim();

  // Castling
  if (raw.includes("castle") || raw.includes("castles") || raw.includes("castling")) {
    if (raw.includes("queen") || raw.includes("long")) {
      // Try O-O-O
      const moves = game.moves({ verbose: true });
      const castle = moves.find((m) => m.san === "O-O-O");
      if (castle) return { from: castle.from as Square, to: castle.to as Square };
    }
    // Default to kingside
    const moves = game.moves({ verbose: true });
    const castle = moves.find((m) => m.san === "O-O");
    if (castle) return { from: castle.from as Square, to: castle.to as Square };
    return null;
  }

  const words = raw.replace(/[^a-z0-9\s]/g, "").split(/\s+/);

  // Extract piece type
  let pieceType = "";
  const remaining: string[] = [];
  for (const w of words) {
    if (PIECE_MAP[w] !== undefined && !pieceType) {
      pieceType = PIECE_MAP[w];
    } else if (w === "takes" || w === "captures" || w === "take" || w === "capture" || w === "to") {
      // skip
    } else {
      remaining.push(w);
    }
  }

  // Extract squares from remaining words
  const squares: string[] = [];
  let i = 0;
  while (i < remaining.length) {
    const w = remaining[i];

    // Check if it's a file letter
    const file = FILE_MAP[w];
    if (file && i + 1 < remaining.length) {
      const rank = RANK_MAP[remaining[i + 1]];
      if (rank) {
        squares.push(file + rank);
        i += 2;
        continue;
      }
    }

    // Check if it's a combined square like "e4"
    if (w.length === 2 && FILE_MAP[w[0]] && RANK_MAP[w[1]]) {
      squares.push(FILE_MAP[w[0]] + RANK_MAP[w[1]]);
      i++;
      continue;
    }

    // Check single rank (might follow a file)
    const rank = RANK_MAP[w];
    if (rank && squares.length > 0) {
      // Append to last partial square if it was just a file
      i++;
      continue;
    }

    i++;
  }

  if (squares.length === 0) return null;

  const legalMoves = game.moves({ verbose: true });

  // If we have from-to squares
  if (squares.length >= 2) {
    const from = squares[0] as Square;
    const to = squares[1] as Square;
    const match = legalMoves.find((m) => m.from === from && m.to === to);
    if (match) return { from: match.from as Square, to: match.to as Square, promotion: match.promotion };
  }

  // If we have a target square (with optional piece type)
  const target = squares[squares.length - 1] as Square;
  let candidates = legalMoves.filter((m) => m.to === target);

  if (pieceType) {
    candidates = candidates.filter((m) => m.piece === pieceType);
  } else if (squares.length === 1 && !pieceType) {
    // Assume pawn if no piece specified
    candidates = candidates.filter((m) => m.piece === "p");
    // If no pawn move, try all pieces
    if (candidates.length === 0) {
      candidates = legalMoves.filter((m) => m.to === target);
    }
  }

  if (candidates.length === 1) {
    return { from: candidates[0].from as Square, to: candidates[0].to as Square, promotion: candidates[0].promotion };
  }

  // Ambiguous or no match
  if (candidates.length > 1) {
    // If we have a piece type, just pick the first one (most common disambiguation)
    return { from: candidates[0].from as Square, to: candidates[0].to as Square, promotion: candidates[0].promotion };
  }

  return null;
}

const VoiceChess = ({ game, onMove, disabled }: VoiceChessProps) => {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [lastCommand, setLastCommand] = useState("");
  const recognitionRef = useRef<any>(null);

  const isSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported || disabled) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = event.results[event.resultIndex];
      const text = result[0].transcript;
      setTranscript(text);

      if (result.isFinal) {
        const parsed = parseVoiceMove(text, game);
        if (parsed) {
          setLastCommand(`✓ ${text}`);
          onMove(parsed.from, parsed.to, parsed.promotion);
        } else {
          setLastCommand(`✗ "${text}" — not recognized`);
          toast.error(`Could not parse move: "${text}"`, { duration: 2000 });
        }
        setTranscript("");
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error !== "no-speech") {
        toast.error(`Voice error: ${event.error}`);
      }
      stopListening();
    };

    recognition.onend = () => {
      // Auto-restart if still in listening mode
      if (recognitionRef.current) {
        try {
          recognition.start();
        } catch {
          stopListening();
        }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setLastCommand("");
  }, [isSupported, disabled, game, onMove, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  if (!isSupported) return null;

  return (
    <div className="glass-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          Voice Chess
        </h3>
        <button
          onClick={listening ? stopListening : startListening}
          disabled={disabled}
          className={`flex items-center gap-1.5 text-xs font-display font-bold px-3 py-1.5 rounded-md transition-all ${
            listening
              ? "bg-destructive/15 text-destructive animate-pulse"
              : "bg-primary/15 text-primary hover:bg-primary/25"
          }`}
        >
          {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          {listening ? "STOP" : "START"}
        </button>
      </div>

      {listening && (
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-muted-foreground">Listening…</span>
          </div>
          {transcript && (
            <p className="font-mono text-foreground/80 bg-secondary/40 rounded px-2 py-1">
              {transcript}
            </p>
          )}
        </div>
      )}

      {lastCommand && (
        <p className={`text-xs font-mono ${lastCommand.startsWith("✓") ? "text-emerald-400" : "text-destructive"}`}>
          {lastCommand}
        </p>
      )}

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Say: "Knight f3", "e4", "Bishop takes d5", "Castle kingside"
      </p>
    </div>
  );
};

export default VoiceChess;
