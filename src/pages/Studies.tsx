import { useState, useEffect, useCallback } from "react";
import { Chess, Square } from "chess.js";
import { motion } from "framer-motion";
import { BookOpen, Plus, Trash2, Edit3, Eye, Lock, ChevronRight, Save, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ChessBoard from "@/components/chess/ChessBoard";

interface Study {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  visibility: string;
  opening_name: string | null;
  created_at: string;
  owner_name?: string;
}

interface Chapter {
  id: string;
  study_id: string;
  title: string;
  fen: string;
  moves: Array<{ san: string; from: string; to: string; annotation?: string }>;
  annotations: Record<string, string>;
  sort_order: number;
}

const Studies = () => {
  const { user } = useAuth();
  const [studies, setStudies] = useState<Study[]>([]);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [game, setGame] = useState(new Chess());
  const [moveIndex, setMoveIndex] = useState(-1);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newVisibility, setNewVisibility] = useState("public");
  const [annotation, setAnnotation] = useState("");
  const [view, setView] = useState<"list" | "study">("list");

  const loadStudies = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("studies")
      .select("id, owner_id, title, description, visibility, opening_name, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (data) {
      const ownerIds = [...new Set(data.map((s: Study) => s.owner_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", ownerIds as string[]);
      const nameMap = new Map((profiles || []).map((p) => [p.id, p.username || "Player"]));
      setStudies(data.map((s: Study) => ({ ...s, owner_name: nameMap.get(s.owner_id) || "Player" })));
    }
  }, []);

  const loadChapters = useCallback(async (studyId: string) => {
    const { data } = await (supabase as any)
      .from("study_chapters")
      .select("id, study_id, title, fen, moves, annotations, sort_order")
      .eq("study_id", studyId)
      .order("sort_order", { ascending: true });
    if (data) {
      setChapters(data);
      if (data.length > 0) selectChapter(data[0]);
    }
  }, []);

  const selectChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    const g = new Chess(chapter.fen);
    setGame(g);
    setMoveIndex(-1);
    setLastMove(null);
    setAnnotation("");
  };

  useEffect(() => { loadStudies(); }, [loadStudies]);

  const openStudy = (study: Study) => {
    setSelectedStudy(study);
    setView("study");
    loadChapters(study.id);
  };

  const createStudy = async () => {
    if (!user || !newTitle.trim()) return;
    const { data, error } = await (supabase as any).from("studies").insert({
      owner_id: user.id,
      title: newTitle.trim(),
      description: newDesc.trim(),
      visibility: newVisibility,
    }).select().single();

    if (error) { toast.error(error.message); return; }

    // Create default chapter
    await (supabase as any).from("study_chapters").insert({
      study_id: data.id,
      title: "Main Line",
      sort_order: 0,
    });

    setCreating(false);
    setNewTitle("");
    setNewDesc("");
    toast.success("Study created!");
    loadStudies();
    openStudy(data);
  };

  const addChapter = async () => {
    if (!selectedStudy || !user) return;
    const { error } = await (supabase as any).from("study_chapters").insert({
      study_id: selectedStudy.id,
      title: `Chapter ${chapters.length + 1}`,
      sort_order: chapters.length,
    });
    if (error) { toast.error(error.message); return; }
    loadChapters(selectedStudy.id);
    toast.success("Chapter added");
  };

  const deleteStudy = async (studyId: string) => {
    if (!window.confirm("Delete this study and all chapters?")) return;
    await (supabase as any).from("studies").delete().eq("id", studyId);
    setStudies((prev) => prev.filter((s) => s.id !== studyId));
    if (selectedStudy?.id === studyId) {
      setSelectedStudy(null);
      setView("list");
    }
    toast.success("Study deleted");
  };

  const handleMove = useCallback((from: Square, to: Square, promotion?: string): boolean => {
    if (!selectedChapter || selectedStudy?.owner_id !== user?.id) return false;
    const gameCopy = new Chess(game.fen());
    try {
      const move = gameCopy.move({ from, to, promotion: promotion || undefined });
      if (!move) return false;

      setGame(gameCopy);
      setLastMove({ from, to });

      // Append move to chapter
      const newMoves = [
        ...(selectedChapter.moves || []).slice(0, moveIndex + 1),
        { san: move.san, from, to },
      ];
      setMoveIndex(newMoves.length - 1);

      // Save to database
      (supabase as any).from("study_chapters").update({ moves: newMoves, fen: selectedChapter.fen }).eq("id", selectedChapter.id);
      setSelectedChapter({ ...selectedChapter, moves: newMoves });

      return true;
    } catch {
      return false;
    }
  }, [game, selectedChapter, moveIndex, selectedStudy, user]);

  const goToMove = (index: number) => {
    if (!selectedChapter) return;
    const g = new Chess(selectedChapter.fen);
    const moves = selectedChapter.moves || [];

    for (let i = 0; i <= index && i < moves.length; i++) {
      try {
        g.move({ from: moves[i].from as Square, to: moves[i].to as Square });
      } catch { break; }
    }

    setGame(g);
    setMoveIndex(index);
    if (index >= 0 && moves[index]) {
      setLastMove({ from: moves[index].from as Square, to: moves[index].to as Square });
    } else {
      setLastMove(null);
    }

    const ann = selectedChapter.annotations?.[String(index)] || "";
    setAnnotation(ann);
  };

  const saveAnnotation = async () => {
    if (!selectedChapter || !user || selectedStudy?.owner_id !== user.id) return;
    const updated = { ...selectedChapter.annotations, [String(moveIndex)]: annotation };
    await (supabase as any).from("study_chapters").update({ annotations: updated }).eq("id", selectedChapter.id);
    setSelectedChapter({ ...selectedChapter, annotations: updated });
    toast.success("Annotation saved");
  };

  // Realtime updates
  useEffect(() => {
    if (!selectedStudy) return;
    const channel = supabase
      .channel(`study-${selectedStudy.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "study_chapters", filter: `study_id=eq.${selectedStudy.id}` }, () => {
        loadChapters(selectedStudy.id);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedStudy, loadChapters]);

  const isOwner = user?.id === selectedStudy?.owner_id;

  // LIST VIEW
  if (view === "list") {
    return (
      <div className="min-h-screen bg-background pt-20 pb-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-6">
              <h1 className="font-display text-2xl font-black flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-primary" />
                Studies
              </h1>
              <button
                onClick={() => setCreating(true)}
                className="bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-4 py-2.5 rounded-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> New Study
              </button>
            </div>

            {creating && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 border-glow mb-6 space-y-3">
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Study title..." className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                <textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)..." rows={2} className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                <div className="flex items-center gap-3">
                  <select value={newVisibility} onChange={(e) => setNewVisibility(e.target.value)} className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm">
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                  <button onClick={createStudy} className="bg-primary text-primary-foreground font-display font-bold text-xs px-4 py-2 rounded-lg">Create</button>
                  <button onClick={() => setCreating(false)} className="text-xs text-muted-foreground">Cancel</button>
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              {studies.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No studies yet. Create one to start analyzing openings!</p>}
              {studies.map((study) => (
                <motion.div
                  key={study.id}
                  whileHover={{ scale: 1.01 }}
                  className="glass-card p-4 cursor-pointer hover:border-primary/30 transition-colors"
                  onClick={() => openStudy(study)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display font-bold text-sm">{study.title}</h3>
                        {study.visibility === "private" && <Lock className="w-3 h-3 text-muted-foreground" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        by {study.owner_name} • {new Date(study.created_at).toLocaleDateString()}
                        {study.description && ` • ${study.description.slice(0, 60)}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {study.owner_id === user?.id && (
                        <button onClick={(e) => { e.stopPropagation(); deleteStudy(study.id); }} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // STUDY VIEW
  const chapterMoves = selectedChapter?.moves || [];

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => setView("list")} className="text-xs text-muted-foreground hover:text-foreground">← Studies</button>
          <span className="text-muted-foreground">/</span>
          <span className="font-display font-bold text-sm">{selectedStudy?.title}</span>
          {selectedStudy?.visibility === "private" && <Lock className="w-3 h-3 text-muted-foreground" />}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Board */}
          <div className="lg:col-span-7 flex flex-col items-center">
            <ChessBoard
              game={game}
              onMove={handleMove}
              disabled={!isOwner}
              lastMove={lastMove}
              sizeClassName="max-w-[96vw]"
            />

            {/* Navigation controls */}
            <div className="flex items-center gap-2 mt-3">
              <button onClick={() => goToMove(-1)} className="glass-card px-3 py-1.5 text-xs">⟨⟨</button>
              <button onClick={() => goToMove(Math.max(-1, moveIndex - 1))} className="glass-card px-3 py-1.5 text-xs">⟨</button>
              <span className="text-xs text-muted-foreground px-2">
                {moveIndex + 1} / {chapterMoves.length}
              </span>
              <button onClick={() => goToMove(Math.min(chapterMoves.length - 1, moveIndex + 1))} className="glass-card px-3 py-1.5 text-xs">⟩</button>
              <button onClick={() => goToMove(chapterMoves.length - 1)} className="glass-card px-3 py-1.5 text-xs">⟩⟩</button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-5 space-y-4">
            {/* Chapters */}
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display font-bold text-sm flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  Chapters
                </h3>
                {isOwner && (
                  <button onClick={addChapter} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {chapters.map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => selectChapter(ch)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      selectedChapter?.id === ch.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-secondary/60"
                    }`}
                  >
                    {ch.title}
                    <span className="text-[10px] text-muted-foreground ml-2">{(ch.moves || []).length} moves</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Move list */}
            <div className="glass-card p-4">
              <h3 className="font-display font-bold text-sm mb-2">Moves</h3>
              <div className="max-h-48 overflow-y-auto space-y-0.5 font-mono text-sm">
                {chapterMoves.length === 0 && <p className="text-xs text-muted-foreground italic">No moves yet{isOwner ? " — play on the board to add" : ""}</p>}
                {chapterMoves.map((m, i) => {
                  const moveNum = Math.floor(i / 2) + 1;
                  const isWhite = i % 2 === 0;
                  const hasAnnotation = selectedChapter?.annotations?.[String(i)];

                  return (
                    <button
                      key={i}
                      onClick={() => goToMove(i)}
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs transition-colors ${
                        moveIndex === i ? "bg-primary/15 text-primary font-bold" : "hover:bg-secondary/60"
                      }`}
                    >
                      {isWhite && <span className="text-muted-foreground mr-0.5">{moveNum}.</span>}
                      {m.san}
                      {hasAnnotation && <MessageSquare className="w-2.5 h-2.5 text-primary/60 ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Annotation editor */}
            {isOwner && moveIndex >= 0 && (
              <div className="glass-card p-4">
                <h3 className="font-display font-bold text-sm mb-2 flex items-center gap-2">
                  <Edit3 className="w-3.5 h-3.5 text-primary" />
                  Annotation for move {Math.floor(moveIndex / 2) + 1}{moveIndex % 2 === 0 ? "." : "..."}{chapterMoves[moveIndex]?.san}
                </h3>
                <textarea
                  value={annotation}
                  onChange={(e) => setAnnotation(e.target.value)}
                  placeholder="Add notes about this position..."
                  rows={3}
                  className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <button onClick={saveAnnotation} className="mt-2 bg-primary text-primary-foreground font-display font-bold text-[10px] px-3 py-1.5 rounded flex items-center gap-1">
                  <Save className="w-3 h-3" /> Save
                </button>
              </div>
            )}

            {/* Read-only annotation display */}
            {!isOwner && moveIndex >= 0 && selectedChapter?.annotations?.[String(moveIndex)] && (
              <div className="glass-card p-4">
                <h3 className="font-display font-bold text-sm mb-1 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                  Note
                </h3>
                <p className="text-xs text-muted-foreground">{selectedChapter.annotations[String(moveIndex)]}</p>
              </div>
            )}

            {/* Study info */}
            {selectedStudy?.description && (
              <div className="glass-card p-4">
                <p className="text-xs text-muted-foreground">{selectedStudy.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Studies;
