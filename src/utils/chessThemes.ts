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

export const BOARD_THEME_CLASSES: Record<BoardTheme, { light: string; dark: string }> = {
  wood: {
    light: "bg-[#f0d9b5]",
    dark: "bg-[#b58863]",
  },
  emerald: {
    light: "bg-[#d7f0d2]",
    dark: "bg-[#5f8f63]",
  },
  midnight: {
    light: "bg-[#bcc7db]",
    dark: "bg-[#4a5f85]",
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
  wp: "P",
  wn: "N",
  wb: "B",
  wr: "R",
  wq: "Q",
  wk: "K",
  bp: "p",
  bn: "n",
  bb: "b",
  br: "r",
  bq: "q",
  bk: "k",
};
