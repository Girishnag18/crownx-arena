import { Palette, Volume2, VolumeX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useBoardSettings, BOARD_THEMES, PIECE_SETS } from "@/contexts/BoardSettingsContext";

export const BoardCustomizationSection = () => {
  const { theme, pieceSet, soundEnabled, moveAnimation, showCoordinates, setTheme, setPieceSet, setSoundEnabled, setMoveAnimation, setShowCoordinates } = useBoardSettings();

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border/30 flex items-center gap-2">
        <Palette className="w-4 h-4 text-primary" />
        <h3 className="font-display font-bold text-xs">Board Customization</h3>
      </div>

      <div className="p-5 space-y-5">
        {/* Board Theme */}
        <div className="space-y-2">
          <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Board Theme</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {BOARD_THEMES.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`rounded-lg border-2 p-1.5 transition-all ${
                  theme.id === t.id
                    ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                    : "border-border/40 hover:border-border/70"
                }`}
              >
                <div className="grid grid-cols-2 rounded overflow-hidden aspect-square">
                  <div style={{ backgroundColor: t.lightSquare }} />
                  <div style={{ backgroundColor: t.darkSquare }} />
                  <div style={{ backgroundColor: t.darkSquare }} />
                  <div style={{ backgroundColor: t.lightSquare }} />
                </div>
                <p className="text-[9px] text-center mt-1 font-display font-bold truncate">{t.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Piece Set */}
        <div className="space-y-2">
          <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Piece Set</label>
          <div className="grid grid-cols-3 gap-2">
            {PIECE_SETS.map((ps) => (
              <button
                key={ps.id}
                onClick={() => setPieceSet(ps.id)}
                className={`rounded-lg border-2 p-2.5 flex flex-col items-center gap-1.5 transition-all ${
                  pieceSet.id === ps.id
                    ? "border-primary ring-1 ring-primary/30 bg-primary/5"
                    : "border-border/40 hover:border-border/70"
                }`}
              >
                <div className="flex gap-1">
                  <img src={`${ps.baseUrl}/wk.png`} alt="king" className="w-8 h-8" />
                  <img src={`${ps.baseUrl}/bq.png`} alt="queen" className="w-8 h-8" />
                </div>
                <p className="text-[9px] font-display font-bold">{ps.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-1">
          {[
            { label: "Sound Effects", icon: soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-primary" /> : <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />, checked: soundEnabled, onChange: setSoundEnabled },
            { label: "Move Animations", icon: null, checked: moveAnimation, onChange: setMoveAnimation },
            { label: "Board Coordinates", icon: null, checked: showCoordinates, onChange: setShowCoordinates },
          ].map((toggle) => (
            <div key={toggle.label} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                {toggle.icon}
                <span className="text-xs font-medium">{toggle.label}</span>
              </div>
              <Switch checked={toggle.checked} onCheckedChange={toggle.onChange} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
