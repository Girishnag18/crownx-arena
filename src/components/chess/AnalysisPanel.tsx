export interface MoveAnalysisItem {
  ply: number;
  san: string;
  evalBefore: number;
  evalAfter: number;
  loss: number;
  label: "Best" | "Inaccuracy" | "Mistake" | "Blunder";
}

interface AnalysisPanelProps {
  items: MoveAnalysisItem[];
}

const AnalysisPanel = ({ items }: AnalysisPanelProps) => {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground">No analysis yet.</p>;
  }

  const averageLoss = items.reduce((sum, item) => sum + Math.min(item.loss, 400), 0) / items.length;
  const accuracy = Math.max(0, Math.min(100, Math.round(100 - averageLoss / 4)));

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
        <p className="text-xs text-muted-foreground">Accuracy</p>
        <p className="font-display text-xl font-bold">{accuracy}%</p>
      </div>
      <div className="max-h-52 overflow-y-auto space-y-1">
        {items.map((item) => (
          <div key={`${item.ply}-${item.san}`} className="rounded-md border border-border/60 bg-secondary/30 px-2.5 py-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {Math.ceil(item.ply / 2)}{item.ply % 2 === 1 ? ". " : "... "}
                {item.san}
              </span>
              <span className={`rounded px-1.5 py-0.5 ${
                item.label === "Best"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : item.label === "Inaccuracy"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-rose-500/20 text-rose-300"
              }`}>
                {item.label}
              </span>
            </div>
            <p className="text-muted-foreground mt-1">
              Delta: {(item.evalAfter - item.evalBefore) / 100 > 0 ? "+" : ""}
              {((item.evalAfter - item.evalBefore) / 100).toFixed(2)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AnalysisPanel;
