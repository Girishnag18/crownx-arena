import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Star, Sparkles, Crown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EquippedItem } from "@/components/ProfileCard";
import LegendaryEquipEffect from "@/components/gamification/LegendaryEquipEffect";

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

interface MyCosmeticsSectionProps {
  userId: string;
  onEquipChange?: () => void;
}

const MyCosmeticsSection = ({ userId, onEquipChange }: MyCosmeticsSectionProps) => {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<Map<string, Purchase>>(new Map());
  const [loading, setLoading] = useState(true);
  const [legendaryEffect, setLegendaryEffect] = useState<{ icon: string; name: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: purchaseData } = await (supabase as any)
      .from("shop_purchases")
      .select("item_id, is_equipped")
      .eq("user_id", userId);

    const rows = (purchaseData || []) as Purchase[];
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
    if (newEquipped && item.rarity === "legendary") {
      setLegendaryEffect({ icon: item.icon, name: item.name });
    }
    onEquipChange?.();
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

  return (
    <>
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
      <LegendaryEquipEffect
        show={!!legendaryEffect}
        icon={legendaryEffect?.icon || ""}
        name={legendaryEffect?.name || ""}
        onComplete={() => setLegendaryEffect(null)}
      />
    </>
  );
};

export default MyCosmeticsSection;
