interface EvaluationBarProps {
  evalCp: number | null;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const formatEval = (evalCp: number | null) => {
  if (evalCp === null) return "0.0";
  const pawns = evalCp / 100;
  const sign = pawns > 0 ? "+" : "";
  return `${sign}${pawns.toFixed(1)}`;
};

const EvaluationBar = ({ evalCp }: EvaluationBarProps) => {
  const limited = clamp(evalCp ?? 0, -1_500, 1_500);
  const whitePercent = clamp(50 + limited / 30, 0, 100);

  return (
    <div className="w-14">
      <div className="h-[min(96vw,620px)] min-h-[280px] rounded-xl overflow-hidden border border-border/60 shadow-inner bg-black/30 flex flex-col">
        <div
          className="bg-white transition-[height] duration-300 ease-out"
          style={{ height: `${whitePercent}%` }}
        />
        <div className="flex-1 bg-zinc-900 transition-[height] duration-300 ease-out" />
      </div>
      <div className="mt-2 text-center text-xs font-mono text-muted-foreground">{formatEval(evalCp)}</div>
    </div>
  );
};

export default EvaluationBar;
