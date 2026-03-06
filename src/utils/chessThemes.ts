export type BoardTheme = "wood" | "emerald" | "midnight";
export type PieceTheme = "neo" | "classic" | "letter";

export const BOARD_THEME_OPTIONS: Array<{ id: BoardTheme; label: string }> = [
  { id: "wood", label: "Wood" },
  { id: "emerald", label: "Emerald" },
  { id: "midnight", label: "Midnight" },
];

export const PIECE_THEME_OPTIONS: Array<{ id: PieceTheme; label: string }> = [
  { id: "neo", label: "Neo" },
  { id: "classic", label: "Classic" },
  { id: "letter", label: "Letter" },
];

export const BOARD_THEME_STYLES: Record<
  BoardTheme,
  {
    lightSquare: string;
    darkSquare: string;
    shellBackground: string;
    shellShadow: string;
    borderColor: string;
    coordinateLight: string;
    coordinateDark: string;
  }
> = {
  wood: {
    lightSquare: "#f0d9b5",
    darkSquare: "#b58863",
    shellBackground: "linear-gradient(160deg, #5c4025 0%, #3a2514 100%)",
    shellShadow: "inset 0 0 24px rgba(49, 29, 12, 0.36), 0 18px 44px rgba(5, 9, 18, 0.5)",
    borderColor: "rgba(240, 217, 181, 0.18)",
    coordinateLight: "rgba(104, 61, 24, 0.72)",
    coordinateDark: "rgba(251, 239, 218, 0.74)",
  },
  emerald: {
    lightSquare: "#d7f0d2",
    darkSquare: "#5f8f63",
    shellBackground: "linear-gradient(160deg, #244034 0%, #13261e 100%)",
    shellShadow: "inset 0 0 22px rgba(8, 23, 17, 0.46), 0 18px 44px rgba(4, 10, 14, 0.46)",
    borderColor: "rgba(110, 176, 125, 0.24)",
    coordinateLight: "rgba(34, 77, 39, 0.72)",
    coordinateDark: "rgba(228, 247, 228, 0.76)",
  },
  midnight: {
    lightSquare: "#bcc7db",
    darkSquare: "#4a5f85",
    shellBackground: "linear-gradient(160deg, #1e2740 0%, #121827 100%)",
    shellShadow: "inset 0 0 24px rgba(6, 10, 24, 0.45), 0 18px 44px rgba(3, 6, 16, 0.56)",
    borderColor: "rgba(113, 146, 206, 0.24)",
    coordinateLight: "rgba(34, 48, 77, 0.76)",
    coordinateDark: "rgba(229, 236, 252, 0.74)",
  },
};

export const PIECE_THEME_SPRITES: Record<PieceTheme, Record<string, string>> = {
  neo: {
    wp: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png",
    wn: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png",
    wb: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png",
    wr: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png",
    wq: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png",
    wk: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png",
    bp: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png",
    bn: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png",
    bb: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png",
    br: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png",
    bq: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png",
    bk: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png",
  },
  classic: {
    wp: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/wp.png",
    wn: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/wn.png",
    wb: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/wb.png",
    wr: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/wr.png",
    wq: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/wq.png",
    wk: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/wk.png",
    bp: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/bp.png",
    bn: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/bn.png",
    bb: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/bb.png",
    br: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/br.png",
    bq: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/bq.png",
    bk: "https://images.chesscomfiles.com/chess-themes/pieces/classic/150/bk.png",
  },
  letter: {
    wp: "",
    wn: "",
    wb: "",
    wr: "",
    wq: "",
    wk: "",
    bp: "",
    bn: "",
    bb: "",
    br: "",
    bq: "",
    bk: "",
  },
};

export const PIECE_UNICODE: Record<string, string> = {
  wp: "\u2659",
  wn: "\u2658",
  wb: "\u2657",
  wr: "\u2656",
  wq: "\u2655",
  wk: "\u2654",
  bp: "\u265F",
  bn: "\u265E",
  bb: "\u265D",
  br: "\u265C",
  bq: "\u265B",
  bk: "\u265A",
};
