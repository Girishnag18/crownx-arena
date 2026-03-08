import { Palette, Volume2, VolumeX } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useBoardSettings, BOARD_THEMES, PIECE_SETS } from "@/contexts/BoardSettingsContext";

export const BoardCustomizationSection = () => {
  const { theme, pieceSet, soundEnabled, moveAnimation, showCoordinates, setTheme, setPieceSet, setSoundEnabled, setMoveAnimation, setShowCoordinates } = useBoardSettings();

  return (
    <div className="glass-card p-4 sm:p-6 mb-4 sm:mb-6 space-y-4 sm:space-y-5">
      <div className="flex items-center gap-2">
        <Palette className="w-5 h-5 text-primary" />
        <h3 className="font-display text-base sm:text-lg font-bold">Board Customization</h3>
      </div>

      <div className="space-y-2">
        <Label>Board Theme</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {BOARD_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`rounded-lg border-2 p-1 transition-all ${
                theme.id === t.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className="grid grid-cols-2 rounded overflow-hidden aspect-square">
                <div style={{ backgroundColor: t.lightSquare }} />
                <div style={{ backgroundColor: t.darkSquare }} />
                <div style={{ backgroundColor: t.darkSquare }} />
                <div style={{ backgroundColor: t.lightSquare }} />
              </div>
              <p className="text-[10px] text-center mt-1 font-medium truncate">{t.name}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Piece Set</Label>
        <div className="grid grid-cols-3 gap-2">
          {PIECE_SETS.map((ps) => (
            <button
              key={ps.id}
              onClick={() => setPieceSet(ps.id)}
              className={`rounded-lg border-2 p-2 flex flex-col items-center gap-1 transition-all ${
                pieceSet.id === ps.id ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground"
              }`}
            >
              <div className="flex gap-1">
                <img src={`${ps.baseUrl}/wk.png`} alt="king" className="w-8 h-8" />
                <img src={`${ps.baseUrl}/bq.png`} alt="queen" className="w-8 h-8" />
              </div>
              <p className="text-[10px] font-medium">{ps.name}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            <Label className="cursor-pointer">Sound Effects</Label>
          </div>
          <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="cursor-pointer">Move Animations</Label>
          <Switch checked={moveAnimation} onCheckedChange={setMoveAnimation} />
        </div>
        <div className="flex items-center justify-between">
          <Label className="cursor-pointer">Board Coordinates</Label>
          <Switch checked={showCoordinates} onCheckedChange={setShowCoordinates} />
        </div>
      </div>
    </div>
  );
};
