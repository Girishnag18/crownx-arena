import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Crown, ShoppingBag, Check, Sparkles, Loader2, Star, Eye, X, User, ArrowUpDown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import BackButton from "@/components/common/BackButton";
import PullToRefresh from "@/components/common/PullToRefresh";
import EquipEffect from "@/components/gamification/EquipEffect";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  price_crowns: number;
  rarity: string;
  metadata: Record<string, any>;
}

interface Purchase {
  item_id: string;
  is_equipped: boolean;
}

const RARITY_STYLES: Record<string, string> = {
  common: "border-border/50 bg-card/40",
  uncommon: "border-emerald-500/25 bg-emerald-500/[0.03]",
  rare: "border-blue-500/25 bg-blue-500/[0.03]",
  legendary: "border-primary/30 bg-primary/[0.04]",
};

const RARITY_BADGE: Record<string, { text: string; bg: string }> = {
  common: { text: "text-muted-foreground", bg: "bg-secondary/60" },
  uncommon: { text: "text-emerald-400", bg: "bg-emerald-500/10" },
  rare: { text: "text-blue-400", bg: "bg-blue-500/10" },
  legendary: { text: "text-primary", bg: "bg-primary/10" },
};

const CATEGORIES = [
  { key: "all", label: "All", icon: "🛒" },
  { key: "title", label: "Titles", icon: "👑" },
  { key: "avatar_frame", label: "Frames", icon: "🖼️" },
  { key: "badge", label: "Badges", icon: "🏅" },
  { key: "board_theme", label: "Boards", icon: "♟️" },
];

const RARITIES = [
  { key: "all", label: "All Rarities" },
  { key: "common", label: "Common" },
  { key: "uncommon", label: "Uncommon" },
  { key: "rare", label: "Rare" },
  { key: "legendary", label: "Legendary" },
];

const EXCLUSIVE_CATEGORIES = new Set(["title", "avatar_frame", "board_theme"]);

const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  visible: (i: number) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.3, delay: i * 0.04, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

/* ─── Board Theme Preview ─── */
const BoardPreview = ({ light, dark }: { light: string; dark: string }) => {
  const rows = 4;
  const cols = 4;
  const pieces: Record<string, string> = {
    "0-0": "♜", "0-3": "♜", "0-1": "♞", "0-2": "♝",
    "1-0": "♟", "1-1": "♟", "1-2": "♟", "1-3": "♟",
    "2-0": "♙", "2-1": "♙", "2-2": "♙", "2-3": "♙",
    "3-0": "♖", "3-3": "♖", "3-1": "♘", "3-2": "♗",
  };
  return (
    <div className="rounded-lg overflow-hidden border border-border/40 shadow-lg w-full max-w-[200px] mx-auto aspect-square">
      <div className="grid grid-cols-4 grid-rows-4 w-full h-full">
        {Array.from({ length: rows * cols }).map((_, idx) => {
          const r = Math.floor(idx / cols);
          const c = idx % cols;
          const isLight = (r + c) % 2 === 0;
          const piece = pieces[`${r}-${c}`];
          return (
            <div
              key={idx}
              className="flex items-center justify-center text-lg"
              style={{ backgroundColor: isLight ? light : dark }}
            >
              {piece && <span className="drop-shadow-sm">{piece}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Avatar Frame Preview ─── */
const FramePreview = ({ borderColor, name }: { borderColor: string; name: string }) => (
  <div className="flex flex-col items-center gap-3">
    <Avatar
      className="w-24 h-24 border-4 shadow-[0_0_30px_-5px_var(--preview-glow)]"
      style={{ borderColor, "--preview-glow": borderColor } as React.CSSProperties}
    >
      <AvatarFallback className="bg-secondary text-primary font-display font-bold text-3xl">
        <User className="w-10 h-10" />
      </AvatarFallback>
    </Avatar>
    <p className="text-xs text-muted-foreground">Your avatar with <span className="font-bold text-foreground">{name}</span></p>
  </div>
);

/* ─── Preview Dialog ─── */
const PreviewDialog = ({ item, onClose }: { item: ShopItem; onClose: () => void }) => {
  const meta = item.metadata || {};
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25 }}
          className="glass-card border border-border/50 rounded-2xl p-6 w-full max-w-sm space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <h3 className="font-display font-bold text-base">{item.name}</h3>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${(RARITY_BADGE[item.rarity] || RARITY_BADGE.common).text} ${(RARITY_BADGE[item.rarity] || RARITY_BADGE.common).bg}`}>
                  {item.rarity}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-secondary/60 flex items-center justify-center hover:bg-secondary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preview content */}
          <div className="py-3">
            {item.category === "board_theme" && meta.light_square && meta.dark_square && (
              <BoardPreview light={meta.light_square} dark={meta.dark_square} />
            )}
            {item.category === "avatar_frame" && meta.border_color && (
              <FramePreview borderColor={meta.border_color} name={item.name} />
            )}
            {item.category === "title" && (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="flex items-center gap-2 text-lg">
                  <span className="font-display font-black">PlayerName</span>
                  <span className="text-sm text-primary font-display font-bold bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                    {item.icon} {item.name}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">How your title appears in-game</p>
              </div>
            )}
            {item.category === "badge" && (
              <div className="flex flex-col items-center gap-3 py-4">
                <span className="text-5xl">{item.icon}</span>
                <span className="text-sm bg-secondary/50 border border-border/40 px-3 py-1 rounded-full font-medium">
                  {item.icon} {item.name}
                </span>
                <p className="text-xs text-muted-foreground">Displayed on your profile card</p>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>

          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">
              {item.category.replace("_", " ")}
            </div>
            <div className="flex items-center gap-1 text-sm font-display font-bold text-primary">
              <Crown className="w-3.5 h-3.5" /> {item.price_crowns}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const Shop = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<Map<string, Purchase>>(new Map());
  const [walletBalance, setWalletBalance] = useState(0);
  const [buying, setBuying] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [rarity, setRarity] = useState("all");
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "rarity" | "newest">("price_asc");
  const [loading, setLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState<ShopItem | null>(null);
  const [legendaryEffect, setLegendaryEffect] = useState<{ icon: string; name: string } | null>(null);

  useEffect(() => { loadShop(); }, [user?.id]);

  const loadShop = async () => {
    setLoading(true);
    const { data: shopItems } = await (supabase as any)
      .from("shop_items")
      .select("*")
      .eq("is_active", true)
      .order("price_crowns");

    if (shopItems) setItems(shopItems);

    if (user) {
      const [{ data: purchaseData }, { data: profile }] = await Promise.all([
        (supabase as any)
          .from("shop_purchases")
          .select("item_id, is_equipped")
          .eq("user_id", user.id),
        supabase.from("profiles").select("wallet_crowns").eq("id", user.id).maybeSingle(),
      ]);

      const map = new Map<string, Purchase>();
      ((purchaseData || []) as Purchase[]).forEach(p => map.set(p.item_id, p));
      setPurchases(map);
      setWalletBalance(profile?.wallet_crowns || 0);
    }
    setLoading(false);
  };

  const buyItem = async (item: ShopItem) => {
    if (!user) return;
    if (purchases.has(item.id)) { toast.info("Already owned!"); return; }
    if (walletBalance < item.price_crowns) { toast.error("Not enough Crowns!"); return; }

    setBuying(item.id);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ wallet_crowns: walletBalance - item.price_crowns })
      .eq("id", user.id);

    if (updateError) { toast.error(updateError.message); setBuying(null); return; }

    const { error: insertError } = await (supabase as any)
      .from("shop_purchases")
      .insert({ user_id: user.id, item_id: item.id });

    if (insertError) {
      await supabase.from("profiles").update({ wallet_crowns: walletBalance }).eq("id", user.id);
      toast.error(insertError.message);
      setBuying(null);
      return;
    }

    await (supabase as any).from("wallet_transactions").insert({
      player_id: user.id,
      amount: -item.price_crowns,
      txn_type: "shop_purchase",
    });

    setWalletBalance(prev => prev - item.price_crowns);
    setPurchases(prev => new Map([...prev, [item.id, { item_id: item.id, is_equipped: false }]]));
    setBuying(null);
    toast.success(`${item.icon} ${item.name} purchased!`);
  };

  const toggleEquip = async (item: ShopItem) => {
    if (!user) return;
    const current = purchases.get(item.id);
    if (!current) return;

    const newEquipped = !current.is_equipped;

    if (newEquipped && EXCLUSIVE_CATEGORIES.has(item.category)) {
      const sameCategory = items.filter(i => i.category === item.category && i.id !== item.id);
      for (const other of sameCategory) {
        const otherPurchase = purchases.get(other.id);
        if (otherPurchase?.is_equipped) {
          await (supabase as any)
            .from("shop_purchases")
            .update({ is_equipped: false })
            .eq("user_id", user.id)
            .eq("item_id", other.id);
        }
      }
      setPurchases(prev => {
        const next = new Map(prev);
        sameCategory.forEach(other => {
          const p = next.get(other.id);
          if (p) next.set(other.id, { ...p, is_equipped: false });
        });
        return next;
      });
    }

    await (supabase as any)
      .from("shop_purchases")
      .update({ is_equipped: newEquipped })
      .eq("user_id", user.id)
      .eq("item_id", item.id);

    setPurchases(prev => {
      const next = new Map(prev);
      next.set(item.id, { ...current, is_equipped: newEquipped });
      return next;
    });

    toast.success(newEquipped ? `${item.icon} ${item.name} equipped!` : `${item.name} unequipped`);
    if (newEquipped && item.rarity === "legendary") {
      setLegendaryEffect({ icon: item.icon, name: item.name });
    }
  };

  const RARITY_ORDER: Record<string, number> = { common: 0, uncommon: 1, rare: 2, legendary: 3 };

  const filteredItems = items
    .filter(i => {
      if (category !== "all" && i.category !== category) return false;
      if (rarity !== "all" && i.rarity !== rarity) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price_asc": return a.price_crowns - b.price_crowns;
        case "price_desc": return b.price_crowns - a.price_crowns;
        case "rarity": return (RARITY_ORDER[b.rarity] || 0) - (RARITY_ORDER[a.rarity] || 0);
        case "newest": return b.id.localeCompare(a.id);
        default: return 0;
      }
    });
  const ownedItems = items.filter(i => purchases.has(i.id));

  const ItemCard = ({ item, idx }: { item: ShopItem; idx: number }) => {
    const owned = purchases.has(item.id);
    const equipped = purchases.get(item.id)?.is_equipped;
    const rBadge = RARITY_BADGE[item.rarity] || RARITY_BADGE.common;
    const hasPreview = item.category === "board_theme" || item.category === "avatar_frame" || item.category === "title" || item.category === "badge";

    return (
      <motion.div
        custom={idx}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className={`glass-card rounded-xl border p-4 space-y-3 group hover:border-primary/20 transition-all duration-300 ${RARITY_STYLES[item.rarity] || RARITY_STYLES.common} ${equipped ? "ring-1 ring-primary/30" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-secondary/50 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">
              {item.icon}
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-sm truncate">{item.name}</h3>
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${rBadge.text} ${rBadge.bg}`}>
                {item.rarity}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 mt-1">
            {hasPreview && (
              <button
                onClick={() => setPreviewItem(item)}
                className="w-7 h-7 rounded-lg bg-secondary/50 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors"
                title="Preview"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            )}
            {owned && <Check className="w-4 h-4 text-emerald-500" />}
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>

        <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">
          {item.category.replace("_", " ")}
        </div>

        {owned ? (
          <button
            onClick={() => toggleEquip(item)}
            className={`w-full flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-display font-bold transition-all duration-300 ${
              equipped
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/60 text-muted-foreground hover:bg-secondary border border-border/40"
            }`}
          >
            {equipped ? <><Check className="w-3 h-3" /> Equipped</> : <><Star className="w-3 h-3" /> Equip</>}
          </button>
        ) : (
          <button
            onClick={() => buyItem(item)}
            disabled={buying === item.id || walletBalance < item.price_crowns}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-lg py-2 text-xs font-display font-bold hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 transition-all duration-300"
          >
            <Crown className="w-3 h-3" />
            {buying === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : `${item.price_crowns} Crowns`}
          </button>
        )}
      </motion.div>
    );
  };

  const handlePullRefresh = useCallback(async () => {
    await loadShop();
  }, [user]);

  return (
    <main className="page-container relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-20 left-1/4 w-[420px] h-[420px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-1/4 w-[320px] h-[320px] bg-accent/6 rounded-full blur-[100px]" />
      </div>

      <PullToRefresh onRefresh={handlePullRefresh}>
      <div className="container max-w-4xl relative z-10 space-y-5">
        <BackButton label="Back" />
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-card border-glow p-5 sm:p-6 flex items-center justify-between gap-3 flex-wrap"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-display">Crown Store</h1>
              <p className="text-xs text-muted-foreground">Exclusive cosmetics that show on your profile.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-4 py-2">
            <Crown className="w-4 h-4 text-primary" />
            <span className="font-display font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {Number(walletBalance).toFixed(0)}
            </span>
            <span className="text-[10px] text-muted-foreground">Crowns</span>
          </div>
        </motion.div>

        <Tabs defaultValue="shop" className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-secondary/40 border border-border/30 rounded-xl">
            <TabsTrigger value="shop" className="font-display font-bold text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              🛒 Store
            </TabsTrigger>
            <TabsTrigger value="owned" className="font-display font-bold text-xs data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg">
              📦 My Items ({ownedItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="shop" className="space-y-4 mt-4">
            {/* Category filter */}
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map(c => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-all duration-300 ${
                    category === c.key
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary border border-border/30"
                  }`}
                >
                  {c.icon} {c.label}
                </button>
              ))}
            </div>

            {/* Rarity filter */}
            <div className="flex gap-1.5 flex-wrap">
              {RARITIES.map(r => {
                const badge = RARITY_BADGE[r.key] || { text: "text-foreground", bg: "bg-secondary/60" };
                return (
                  <button
                    key={r.key}
                    onClick={() => setRarity(r.key)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-display font-bold transition-all duration-300 border ${
                      rarity === r.key
                        ? `${badge.bg} ${badge.text} border-current shadow-sm`
                        : "bg-card/40 text-muted-foreground border-border/30 hover:bg-secondary/50"
                    }`}
                  >
                    {r.key === "all" ? "✦" : r.key === "legendary" ? "⭐" : r.key === "rare" ? "💎" : r.key === "uncommon" ? "🟢" : "⚪"} {r.label}
                  </button>
                );
              })}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Sort:</span>
              {([
                { key: "price_asc", label: "Price ↑" },
                { key: "price_desc", label: "Price ↓" },
                { key: "rarity", label: "Rarity" },
                { key: "newest", label: "Newest" },
              ] as const).map(s => (
                <button
                  key={s.key}
                  onClick={() => setSortBy(s.key)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-display font-bold transition-all duration-300 ${
                    sortBy === s.key
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-card/40 text-muted-foreground border border-border/30 hover:bg-secondary/50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredItems.map((item, idx) => (
                  <ItemCard key={item.id} item={item} idx={idx} />
                ))}
              </div>
            )}

            {!loading && filteredItems.length === 0 && (
              <div className="glass-card p-12 text-center">
                <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="font-display font-bold text-sm">No items match your filters</p>
                <p className="text-xs text-muted-foreground mt-1">Try a different category or rarity.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="owned" className="space-y-4 mt-4">
            {ownedItems.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-display font-bold">No Items Yet</p>
                <p className="text-sm text-muted-foreground mt-1">Visit the store to purchase cosmetics!</p>
              </div>
            ) : (
              <>
                {CATEGORIES.filter(c => c.key !== "all").map(cat => {
                  const catItems = ownedItems.filter(i => i.category === cat.key);
                  if (catItems.length === 0) return null;
                  return (
                    <div key={cat.key}>
                      <h3 className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        {cat.icon} {cat.label}
                        {EXCLUSIVE_CATEGORIES.has(cat.key) && (
                          <span className="text-[9px] text-primary/60 normal-case">(1 equipped at a time)</span>
                        )}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {catItems.map((item, idx) => (
                          <ItemCard key={item.id} item={item} idx={idx} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
      </PullToRefresh>

      {/* Preview Dialog */}
      {previewItem && (
        <PreviewDialog item={previewItem} onClose={() => setPreviewItem(null)} />
      )}

      {/* Legendary Equip Effect */}
      <LegendaryEquipEffect
        show={!!legendaryEffect}
        icon={legendaryEffect?.icon || ""}
        name={legendaryEffect?.name || ""}
        onComplete={() => setLegendaryEffect(null)}
      />
    </main>
  );
};

export default Shop;
