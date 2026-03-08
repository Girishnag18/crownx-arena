import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface BoardTheme {
  id: string;
  name: string;
  lightSquare: string;
  darkSquare: string;
}

export interface PieceSet {
  id: string;
  name: string;
  baseUrl: string;
}

export const BOARD_THEMES: BoardTheme[] = [
  { id: "classic", name: "Classic", lightSquare: "#f0d9b5", darkSquare: "#b58863" },
  { id: "emerald", name: "Emerald", lightSquare: "#ffffdd", darkSquare: "#86a666" },
  { id: "coral", name: "Coral", lightSquare: "#f5e6ca", darkSquare: "#d18b47" },
  { id: "ice", name: "Ice", lightSquare: "#dee3e6", darkSquare: "#8ca2ad" },
  { id: "midnight", name: "Midnight", lightSquare: "#c8c8c8", darkSquare: "#5a5a7a" },
  { id: "wood", name: "Wood", lightSquare: "#e8c88f", darkSquare: "#a07040" },
  { id: "tournament", name: "Tournament", lightSquare: "#eae9d2", darkSquare: "#4b7399" },
  { id: "neon", name: "Neon", lightSquare: "#1a1a2e", darkSquare: "#16213e" },
];

export const PIECE_SETS: PieceSet[] = [
  { id: "neo", name: "Neo", baseUrl: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150" },
  { id: "classic", name: "Classic", baseUrl: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150" },
  { id: "wood", name: "Wood", baseUrl: "https://images.chesscomfiles.com/chess-themes/pieces/wood/150" },
  { id: "glass", name: "Glass", baseUrl: "https://images.chesscomfiles.com/chess-themes/pieces/glass/150" },
  { id: "icy_sea", name: "Icy Sea", baseUrl: "https://images.chesscomfiles.com/chess-themes/pieces/icy_sea/150" },
  { id: "lolz", name: "Lolz", baseUrl: "https://images.chesscomfiles.com/chess-themes/pieces/lolz/150" },
];

interface BoardSettings {
  theme: BoardTheme;
  pieceSet: PieceSet;
  soundEnabled: boolean;
  moveAnimation: boolean;
  showCoordinates: boolean;
  setTheme: (id: string) => void;
  setPieceSet: (id: string) => void;
  setSoundEnabled: (v: boolean) => void;
  setMoveAnimation: (v: boolean) => void;
  setShowCoordinates: (v: boolean) => void;
}

const defaults = {
  themeId: "classic",
  pieceSetId: "neo",
  soundEnabled: true,
  moveAnimation: true,
  showCoordinates: true,
};

const BoardSettingsContext = createContext<BoardSettings | null>(null);

export const useBoardSettings = () => {
  const ctx = useContext(BoardSettingsContext);
  if (!ctx) throw new Error("useBoardSettings must be used within BoardSettingsProvider");
  return ctx;
};

const load = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(`board_${key}`);
    return v !== null ? JSON.parse(v) : fallback;
  } catch { return fallback; }
};

export const BoardSettingsProvider = ({ children }: { children: ReactNode }) => {
  const [themeId, setThemeId] = useState(() => load("themeId", defaults.themeId));
  const [pieceSetId, setPieceSetId] = useState(() => load("pieceSetId", defaults.pieceSetId));
  const [soundEnabled, setSoundEnabled] = useState(() => load("soundEnabled", defaults.soundEnabled));
  const [moveAnimation, setMoveAnimation] = useState(() => load("moveAnimation", defaults.moveAnimation));
  const [showCoordinates, setShowCoordinates] = useState(() => load("showCoordinates", defaults.showCoordinates));

  useEffect(() => { localStorage.setItem("board_themeId", JSON.stringify(themeId)); }, [themeId]);
  useEffect(() => { localStorage.setItem("board_pieceSetId", JSON.stringify(pieceSetId)); }, [pieceSetId]);
  useEffect(() => { localStorage.setItem("board_soundEnabled", JSON.stringify(soundEnabled)); }, [soundEnabled]);
  useEffect(() => { localStorage.setItem("board_moveAnimation", JSON.stringify(moveAnimation)); }, [moveAnimation]);
  useEffect(() => { localStorage.setItem("board_showCoordinates", JSON.stringify(showCoordinates)); }, [showCoordinates]);

  const theme = BOARD_THEMES.find(t => t.id === themeId) || BOARD_THEMES[0];
  const pieceSet = PIECE_SETS.find(p => p.id === pieceSetId) || PIECE_SETS[0];

  return (
    <BoardSettingsContext.Provider value={{
      theme,
      pieceSet,
      soundEnabled,
      moveAnimation,
      showCoordinates,
      setTheme: setThemeId,
      setPieceSet: setPieceSetId,
      setSoundEnabled,
      setMoveAnimation,
      setShowCoordinates,
    }}>
      {children}
    </BoardSettingsContext.Provider>
  );
};
