import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Crown, ShoppingBag, Check, Sparkles, Loader2, Star } from "lucide-react";
import BackButton from "@/components/common/BackButton";

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

/* Only one item per exclusive category can be equipped at a time */
const EXCLUSIVE_CATEGORIES = new Set(["title", "avatar_frame", "board_theme"]);

const fadeUp = {
  hidden: { opacity: 0, y: 14, filter: "blur(4px)" },
  visible: (i: number) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.3, delay: i * 0.04, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const Shop = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<Map<string, Purchase>>(new Map());
  const [walletBalance, setWalletBalance] = useState(0);
  const [buying, setBuying] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [loading, setLoading] = useState(true);

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
        supabase.from("profiles").select("wallet_crowns").eq("id", user.id).single(),
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

    // If equipping in an exclusive category, unequip others in that category first
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
      // Update local state
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
  };

  const filteredItems = category === "all" ? items : items.filter(i => i.category === category);
  const ownedItems = items.filter(i => purchases.has(i.id));

  const ItemCard = ({ item, idx, showEquip }: { item: ShopItem; idx: number; showEquip?: boolean }) => {
    const owned = purchases.has(item.id);
    const equipped = purchases.get(item.id)?.is_equipped;
    const rBadge = RARITY_BADGE[item.rarity] || RARITY_BADGE.common;

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
          {owned && <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-1" />}
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>

        <div className="text-[10px] text-muted-foreground/70 uppercase tracking-wider">
          {item.category.replace("_", " ")}
        </div>

        {showEquip && owned ? (
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
        ) : owned ? (
          <div className="text-xs text-emerald-500 font-display font-bold flex items-center gap-1">
            <Check className="w-3 h-3" /> Owned
          </div>
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

  return (
    <main className="page-container relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-20 left-1/4 w-[420px] h-[420px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-1/4 w-[320px] h-[320px] bg-accent/6 rounded-full blur-[100px]" />
      </div>

      <div className="container max-w-4xl relative z-10 space-y-5">
        <BackButton label="Back" />
        {/* Header */}
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

          {/* Shop Tab */}
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
                <p className="font-display font-bold text-sm">No items in this category</p>
                <p className="text-xs text-muted-foreground mt-1">Check back later for new arrivals!</p>
              </div>
            )}
          </TabsContent>

          {/* Owned Tab */}
          <TabsContent value="owned" className="space-y-4 mt-4">
            {ownedItems.length === 0 ? (
              <div className="glass-card p-12 text-center">
                <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-display font-bold">No Items Yet</p>
                <p className="text-sm text-muted-foreground mt-1">Visit the store to purchase cosmetics!</p>
              </div>
            ) : (
              <>
                {/* Group by category */}
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
                          <ItemCard key={item.id} item={item} idx={idx} showEquip />
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
    </main>
  );
};

export default Shop;
