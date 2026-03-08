import { memo, useMemo } from "react";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

interface Arrow {
  from: string; // e.g. "e2"
  to: string;   // e.g. "e4"
  color?: string;
}

interface BoardArrowsProps {
  arrows: Arrow[];
  flipped?: boolean;
}

function squareToCoords(sq: string, flipped: boolean): { x: number; y: number } {
  const fileIdx = FILES.indexOf(sq[0]);
  const rankIdx = RANKS.indexOf(sq[1]);
  const col = flipped ? 7 - fileIdx : fileIdx;
  const row = flipped ? 7 - rankIdx : rankIdx;
  return { x: col * 12.5 + 6.25, y: row * 12.5 + 6.25 };
}

const BoardArrows = memo(({ arrows, flipped = false }: BoardArrowsProps) => {
  const rendered = useMemo(() => {
    return arrows.map((arrow, i) => {
      const from = squareToCoords(arrow.from, flipped);
      const to = squareToCoords(arrow.to, flipped);
      const color = arrow.color || "hsl(var(--primary))";
      
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len === 0) return null;

      // Shorten arrow so arrowhead doesn't overshoot
      const headLen = 3;
      const ratio = (len - headLen) / len;
      const midX = from.x + dx * ratio;
      const midY = from.y + dy * ratio;

      const markerId = `arrowhead-${i}`;

      return (
        <g key={i}>
          <defs>
            <marker
              id={markerId}
              markerWidth="4"
              markerHeight="4"
              refX="2"
              refY="2"
              orient="auto"
            >
              <polygon points="0 0, 4 2, 0 4" fill={color} opacity="0.85" />
            </marker>
          </defs>
          {/* Arrow body */}
          <line
            x1={from.x}
            y1={from.y}
            x2={midX}
            y2={midY}
            stroke={color}
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.75"
            markerEnd={`url(#${markerId})`}
          />
          {/* Source dot */}
          <circle cx={from.x} cy={from.y} r="2" fill={color} opacity="0.5" />
        </g>
      );
    });
  }, [arrows, flipped]);

  if (arrows.length === 0) return null;

  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full pointer-events-none z-10"
      preserveAspectRatio="none"
    >
      {rendered}
    </svg>
  );
});

BoardArrows.displayName = "BoardArrows";

export default BoardArrows;
