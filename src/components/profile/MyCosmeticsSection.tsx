import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Star, Sparkles, Save, Trash2, FolderOpen, Plus, Eye } from "lucide-react";
import { EquippedItem } from "@/components/ProfileCard";
import EquipEffect from "@/components/gamification/EquipEffect";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ShopItem {
  id: string;
  name: string;
  icon: string;
  category: string;
  rarity: string;
  metadata: Record<string, any>;
}

interface Purchase {
  item_id: string;
  is_equipped: boolean;
}

interface Loadout {
  id: string;
  name: string;
  item_ids: string[];
}

const RARITY_BADGE: Record<string, { text: string; bg: string }> = {
  common: { text: "text-muted-foreground", bg: "bg-secondary/60" },
  uncommon: { text: "text-emerald-400", bg: "bg-emerald-500/10" },
  rare: { text: "text-blue-400", bg: "bg-blue-500/10" },
  legendary: { text: "text-primary", bg: "bg-primary/10" },
};

const CATEGORY_LABELS: Record<string, { label: string; icon: string; exclusive: boolean }> = {
  title: { label: "Titles", icon: "👑", exclusive: true },
  avatar_frame: { label: "Frames", icon: "🖼️", exclusive: true },
  badge: { label: "Badges", icon: "🏅", exclusive: false },
  board_theme: { label: "Board Themes", icon: "♟️", exclusive: true },
};

const EFFECT_RARITIES = new Set(["legendary", "rare", "uncommon"]);

interface MyCosmeticsSectionProps {
  userId: string;
  username?: string;
  avatarUrl?: string | null;
  onEquipChange?: () => void;
}

const MyCosmeticsSection = ({ userId, username = "Player", avatarUrl, onEquipChange }: MyCosmeticsSectionProps) => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<Map<string, Purchase>>(new Map());
  const [loading, setLoading] = useState(true);
  const [equipEffect, setEquipEffect] = useState<{ icon: string; name: string; rarity: "legendary" | "rare" | "uncommon" } | null>(null);
  const [loadouts, setLoadouts] = useState<Loadout[]>([]);
  const [newLoadoutName, setNewLoadoutName] = useState("");
  const [showLoadoutForm, setShowLoadoutForm] = useState(false);
  const [editingLoadoutId, setEditingLoadoutId] = useState<string | null>(null);
  const [editingLoadoutName, setEditingLoadoutName] = useState("");

  const load = async () => {
    setLoading(true);
    const [{ data: purchaseData }, { data: loadoutData }] = await Promise.all([
      (supabase as any).from("shop_purchases").select("item_id, is_equipped").eq("user_id", userId),
      (supabase as any).from("cosmetic_loadouts").select("id, name, item_ids").eq("user_id", userId).order("created_at"),
    ]);

    const rows = (purchaseData || []) as Purchase[];
    setLoadouts((loadoutData || []) as Loadout[]);

    if (rows.length === 0) { setLoading(false); return; }

    const map = new Map<string, Purchase>();
    rows.forEach(p => map.set(p.item_id, p));
    setPurchases(map);

    const { data: shopItems } = await (supabase as any)
      .from("shop_items")
      .select("id, name, icon, category, rarity, metadata")
      .in("id", rows.map(r => r.item_id));

    setItems(shopItems || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const toggleEquip = async (item: ShopItem) => {
    const current = purchases.get(item.id);
    if (!current) return;
    const newEquipped = !current.is_equipped;
    const exclusive = CATEGORY_LABELS[item.category]?.exclusive;

    if (newEquipped && exclusive) {
      const sameCategory = items.filter(i => i.category === item.category && i.id !== item.id);
      for (const other of sameCategory) {
        const op = purchases.get(other.id);
        if (op?.is_equipped) {
          await (supabase as any).from("shop_purchases").update({ is_equipped: false }).eq("user_id", userId).eq("item_id", other.id);
        }
      }
      setPurchases(prev => {
        const next = new Map(prev);
        sameCategory.forEach(o => { const p = next.get(o.id); if (p) next.set(o.id, { ...p, is_equipped: false }); });
        return next;
      });
    }

    await (supabase as any).from("shop_purchases").update({ is_equipped: newEquipped }).eq("user_id", userId).eq("item_id", item.id);
    setPurchases(prev => { const next = new Map(prev); next.set(item.id, { ...current, is_equipped: newEquipped }); return next; });
    toast.success(newEquipped ? `${item.icon} ${item.name} equipped!` : `${item.name} unequipped`);

    if (newEquipped && EFFECT_RARITIES.has(item.rarity)) {
      setEquipEffect({ icon: item.icon, name: item.name, rarity: item.rarity as "legendary" | "rare" | "uncommon" });
    }
    onEquipChange?.();
  };

  // ─── Loadout functions ───
  const saveLoadout = async () => {
    const name = newLoadoutName.trim() || `Loadout ${loadouts.length + 1}`;
    const equippedIds = Array.from(purchases.entries())
      .filter(([, p]) => p.is_equipped)
      .map(([id]) => id);

    if (equippedIds.length === 0) { toast.error("Equip some items first!"); return; }
    if (loadouts.length >= 5) { toast.error("Max 5 loadouts!"); return; }

    const { data, error } = await (supabase as any)
      .from("cosmetic_loadouts")
      .insert({ user_id: userId, name, item_ids: equippedIds })
      .select("id, name, item_ids")
      .single();

    if (error) { toast.error(error.message); return; }
    setLoadouts(prev => [...prev, data as Loadout]);
    setNewLoadoutName("");
    setShowLoadoutForm(false);
    toast.success(`Loadout "${name}" saved!`);
  };

  const applyLoadout = async (loadout: Loadout) => {
    // Unequip all
    for (const [itemId, p] of purchases) {
      if (p.is_equipped) {
        await (supabase as any).from("shop_purchases").update({ is_equipped: false }).eq("user_id", userId).eq("item_id", itemId);
      }
    }

    // Equip loadout items (only ones we own)
    const ownedLoadoutIds = loadout.item_ids.filter(id => purchases.has(id));
    for (const itemId of ownedLoadoutIds) {
      await (supabase as any).from("shop_purchases").update({ is_equipped: true }).eq("user_id", userId).eq("item_id", itemId);
    }

    setPurchases(prev => {
      const next = new Map(prev);
      for (const [id, p] of next) {
        next.set(id, { ...p, is_equipped: ownedLoadoutIds.includes(id) });
      }
      return next;
    });

    onEquipChange?.();
    toast.success(`Loadout "${loadout.name}" applied!`);
  };

  const deleteLoadout = async (id: string) => {
    await (supabase as any).from("cosmetic_loadouts").delete().eq("id", id);
    setLoadouts(prev => prev.filter(l => l.id !== id));
    toast.success("Loadout deleted.");
  };

  const renameLoadout = async (id: string) => {
    const name = editingLoadoutName.trim();
    if (!name) { setEditingLoadoutId(null); return; }
    await (supabase as any).from("cosmetic_loadouts").update({ name }).eq("id", id);
    setLoadouts(prev => prev.map(l => l.id === id ? { ...l, name } : l));
    setEditingLoadoutId(null);
    toast.success("Loadout renamed!");
  };

  if (loading) return null;
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-8 text-center">
        <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="font-display font-bold text-sm">No Cosmetics Yet</p>
        <p className="text-xs text-muted-foreground mt-1">Visit the Crown Store to purchase items!</p>
      </div>
    );
  }

  const categories = Object.keys(CATEGORY_LABELS).filter(cat => items.some(i => i.category === cat));
  const equippedCount = Array.from(purchases.values()).filter(p => p.is_equipped).length;

  // Derive equipped cosmetics for preview
  const equippedItems = items.filter(i => purchases.get(i.id)?.is_equipped);
  const equippedTitle = equippedItems.find(i => i.category === "title");
  const equippedFrame = equippedItems.find(i => i.category === "avatar_frame");
  const equippedBadges = equippedItems.filter(i => i.category === "badge");
  const equippedBoardTheme = equippedItems.find(i => i.category === "board_theme");

  const FRAME_GLOW: Record<string, string> = {
    legendary: "border-primary/50 shadow-[0_0_12px_-3px_hsl(var(--primary)/0.4)]",
    rare: "border-blue-500/40 shadow-[0_0_10px_-3px_rgba(59,130,246,0.3)]",
    uncommon: "border-emerald-500/40",
  };

  const previewFrameColor = equippedFrame?.metadata?.border_color;
  const previewFrameClass = equippedFrame && !previewFrameColor ? (FRAME_GLOW[equippedFrame.rarity] || "") : "";
  const previewFrameStyle = previewFrameColor ? { borderColor: previewFrameColor, boxShadow: `0 0 12px -3px ${previewFrameColor}` } : {};

  // Board theme colors for preview
  const boardLight = equippedBoardTheme?.metadata?.light_square || null;
  const boardDark = equippedBoardTheme?.metadata?.dark_square || null;

  return (
    <>
      {/* ─── Game Board Preview ─── */}
      <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <h3 className="font-display font-bold text-xs">In-Game Preview</h3>
          <span className="text-[9px] text-muted-foreground ml-auto">How you look to opponents</span>
        </div>
        <div className="p-4">
          <div className="rounded-lg border border-border/30 bg-background/80 overflow-hidden">
            {/* Mock player bar */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/20">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className={`w-8 h-8 border-2 shrink-0 shadow-sm ${previewFrameClass || "border-border/40"}`} style={previewFrameStyle}>
                  <AvatarImage src={avatarUrl || undefined} alt={username} />
                  <AvatarFallback className="text-[10px] bg-gradient-to-br from-secondary to-secondary/60 font-display font-bold">
                    {username.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-display font-bold text-xs truncate">{username}</span>
                    {equippedBadges.map(b => (
                      <span key={b.id} className="text-[9px]" title={b.name}>{b.icon}</span>
                    ))}
                  </div>
                  {equippedTitle ? (
                    <span className="text-[9px] text-primary/80 font-semibold">
                      {equippedTitle.icon} {equippedTitle.name}
                    </span>
                  ) : (
                    <span className="text-[9px] text-muted-foreground/50 italic">No title equipped</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-muted-foreground">5:00</span>
              </div>
            </div>

            {/* Mini board with equipped theme */}
            <div className="grid grid-cols-4 aspect-[2/1] max-h-[80px]">
              {Array.from({ length: 16 }, (_, i) => {
                const row = Math.floor(i / 4);
                const col = i % 4;
                const isLight = (row + col) % 2 === 0;
                const useCustom = boardLight && boardDark;
                return (
                  <div
                    key={i}
                    className={useCustom ? "" : (isLight ? "bg-amber-200 dark:bg-amber-100/70" : "bg-amber-800 dark:bg-amber-700/80")}
                    style={useCustom ? { backgroundColor: isLight ? boardLight : boardDark } : undefined}
                  />
                );
              })}
            </div>

            {/* Mock opponent bar */}
            <div className="flex items-center justify-between px-3 py-2.5 border-t border-border/20">
              <div className="flex items-center gap-2.5 min-w-0">
                <Avatar className="w-8 h-8 border-2 border-border/40 shrink-0 shadow-sm">
                  <AvatarFallback className="text-[10px] bg-gradient-to-br from-secondary to-secondary/60 font-display font-bold">O</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <span className="font-display font-bold text-xs text-muted-foreground">Opponent</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold text-muted-foreground">5:00</span>
              </div>
            </div>
          </div>
          {equippedCount === 0 && (
            <p className="text-[10px] text-muted-foreground text-center mt-2">Equip items below to see them in the preview!</p>
          )}
        </div>
      </div>

      {/* ─── Loadouts Section ─── */}
      <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-primary" />
          <h3 className="font-display font-bold text-xs">Loadouts</h3>
          <span className="text-[9px] text-muted-foreground ml-auto">{loadouts.length}/5</span>
        </div>
        <div className="p-3 space-y-2">
          {loadouts.map(loadout => {
            const loadoutItems = loadout.item_ids
              .map(id => items.find(i => i.id === id))
              .filter(Boolean) as ShopItem[];
            return (
              <div key={loadout.id} className="flex items-center gap-3 rounded-lg border border-border/30 bg-secondary/10 p-3 hover:bg-secondary/20 transition-colors">
                <div className="flex-1 min-w-0">
                  {editingLoadoutId === loadout.id ? (
                    <input
                      className="bg-secondary/50 border border-border/40 rounded px-2 py-0.5 text-xs font-display font-bold focus:outline-none focus:ring-2 focus:ring-primary/40 w-full max-w-[140px]"
                      value={editingLoadoutName}
                      onChange={e => setEditingLoadoutName(e.target.value)}
                      onBlur={() => renameLoadout(loadout.id)}
                      onKeyDown={e => { if (e.key === "Enter") renameLoadout(loadout.id); if (e.key === "Escape") setEditingLoadoutId(null); }}
                      maxLength={20}
                      autoFocus
                    />
                  ) : (
                    <p
                      className="font-display font-bold text-xs truncate cursor-pointer hover:text-primary transition-colors"
                      onClick={() => { setEditingLoadoutId(loadout.id); setEditingLoadoutName(loadout.name); }}
                      title="Click to rename"
                    >
                      {loadout.name}
                    </p>
                  )}
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {loadoutItems.map(item => (
                      <span key={item.id} className="text-sm" title={item.name}>{item.icon}</span>
                    ))}
                    {loadout.item_ids.length > loadoutItems.length && (
                      <span className="text-[9px] text-muted-foreground">+{loadout.item_ids.length - loadoutItems.length} more</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => applyLoadout(loadout)}
                  className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-display font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15 transition-colors"
                >
                  <Check className="w-3 h-3" /> Apply
                </button>
                <button
                  onClick={() => deleteLoadout(loadout.id)}
                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}

          {showLoadoutForm ? (
            <div className="flex items-center gap-2">
              <input
                className="flex-1 bg-secondary/50 border border-border/40 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                placeholder="Loadout name..."
                value={newLoadoutName}
                onChange={e => setNewLoadoutName(e.target.value)}
                maxLength={20}
                onKeyDown={e => e.key === "Enter" && saveLoadout()}
              />
              <button onClick={saveLoadout} className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg text-[10px] font-display font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
                <Save className="w-3 h-3" /> Save
              </button>
              <button onClick={() => setShowLoadoutForm(false)} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-2">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLoadoutForm(true)}
              disabled={loadouts.length >= 5 || equippedCount === 0}
              className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/40 py-2.5 text-[10px] font-display font-bold text-muted-foreground hover:text-foreground hover:border-border/60 hover:bg-secondary/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-3 h-3" />
              {equippedCount === 0 ? "Equip items first" : "Save Current as Loadout"}
            </button>
          )}
        </div>
      </div>

      {/* ─── Items by Category ─── */}
      <div className="space-y-4">
        {categories.map(cat => {
          const info = CATEGORY_LABELS[cat];
          const catItems = items.filter(i => i.category === cat);
          return (
            <div key={cat} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                <span>{info.icon}</span>
                <h3 className="font-display font-bold text-xs">{info.label}</h3>
                {info.exclusive && <span className="text-[9px] text-primary/60 ml-auto">(1 at a time)</span>}
              </div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {catItems.map(item => {
                  const equipped = purchases.get(item.id)?.is_equipped;
                  const rBadge = RARITY_BADGE[item.rarity] || RARITY_BADGE.common;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${equipped ? "border-primary/30 bg-primary/5" : "border-border/30 bg-secondary/10 hover:bg-secondary/20"}`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-secondary/50 flex items-center justify-center text-lg shrink-0">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-xs truncate">{item.name}</p>
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full ${rBadge.text} ${rBadge.bg}`}>
                          {item.rarity}
                        </span>
                      </div>
                      <button
                        onClick={() => toggleEquip(item)}
                        className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-display font-bold transition-all ${
                          equipped
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary/60 text-muted-foreground hover:bg-secondary border border-border/40"
                        }`}
                      >
                        {equipped ? <><Check className="w-3 h-3" /> On</> : <><Star className="w-3 h-3" /> Equip</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Equip Effect */}
      <EquipEffect
        show={!!equipEffect}
        icon={equipEffect?.icon || ""}
        name={equipEffect?.name || ""}
        rarity={equipEffect?.rarity || "uncommon"}
        onComplete={() => setEquipEffect(null)}
      />
    </>
  );
};

export default MyCosmeticsSection;
