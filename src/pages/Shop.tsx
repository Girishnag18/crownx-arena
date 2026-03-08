import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Crown, ShoppingBag, Check, Sparkles } from "lucide-react";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  price_crowns: number;
  rarity: string;
}

interface Purchase {
  item_id: string;
  is_equipped: boolean;
}

const RARITY_STYLES: Record<string, string> = {
  common: "border-border bg-card/60",
  uncommon: "border-green-500/30 bg-green-500/5",
  rare: "border-blue-500/30 bg-blue-500/5",
  legendary: "border-amber-500/40 bg-amber-500/5",
};

const RARITY_LABELS: Record<string, string> = {
  common: "text-muted-foreground",
  uncommon: "text-green-500",
  rare: "text-blue-500",
  legendary: "text-amber-500",
};

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "title", label: "Titles" },
  { key: "avatar_frame", label: "Frames" },
  { key: "badge", label: "Badges" },
  { key: "board_theme", label: "Boards" },
];

const Shop = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<Map<string, Purchase>>(new Map());
  const [walletBalance, setWalletBalance] = useState(0);
  const [buying, setBuying] = useState<string | null>(null);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    loadShop();
  }, [user?.id]);

  const loadShop = async () => {
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
  };

  const buyItem = async (item: ShopItem) => {
    if (!user) return;
    if (purchases.has(item.id)) { toast.info("Already owned!"); return; }
    if (walletBalance < item.price_crowns) { toast.error("Not enough Crowns!"); return; }

    setBuying(item.id);

    // Deduct crowns
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ wallet_crowns: walletBalance - item.price_crowns })
      .eq("id", user.id);

    if (updateError) { toast.error(updateError.message); setBuying(null); return; }

    // Record purchase
    const { error: insertError } = await (supabase as any)
      .from("shop_purchases")
      .insert({ user_id: user.id, item_id: item.id });

    if (insertError) {
      // Rollback
      await supabase.from("profiles").update({ wallet_crowns: walletBalance }).eq("id", user.id);
      toast.error(insertError.message);
      setBuying(null);
      return;
    }

    // Record transaction
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

  const toggleEquip = async (itemId: string) => {
    if (!user) return;
    const current = purchases.get(itemId);
    if (!current) return;

    const newEquipped = !current.is_equipped;
    await (supabase as any)
      .from("shop_purchases")
      .update({ is_equipped: newEquipped })
      .eq("user_id", user.id)
      .eq("item_id", itemId);

    setPurchases(prev => {
      const next = new Map(prev);
      next.set(itemId, { ...current, is_equipped: newEquipped });
      return next;
    });

    toast.success(newEquipped ? "Equipped!" : "Unequipped");
  };

  const filteredItems = category === "all" ? items : items.filter(i => i.category === category);
  const ownedItems = items.filter(i => purchases.has(i.id));

  return (
    <main className="container max-w-4xl py-24 px-4 space-y-6">
      {/* Header */}
      <div className="glass-card p-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-3xl font-bold font-display">Crown Shop</h1>
            <p className="text-sm text-muted-foreground">Spend your Crowns on exclusive cosmetics.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-2">
          <Crown className="w-5 h-5 text-amber-500" />
          <span className="font-bold text-lg">{Number(walletBalance).toFixed(0)}</span>
          <span className="text-xs text-muted-foreground">Crowns</span>
        </div>
      </div>

      <Tabs defaultValue="shop" className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-secondary/40">
          <TabsTrigger value="shop">🛒 Shop</TabsTrigger>
          <TabsTrigger value="owned">📦 My Items ({ownedItems.length})</TabsTrigger>
        </TabsList>

        {/* Shop Tab */}
        <TabsContent value="shop" className="space-y-4 mt-4">
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  category === c.key ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Items grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredItems.map((item, idx) => {
              const owned = purchases.has(item.id);
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`rounded-xl border p-4 space-y-3 ${RARITY_STYLES[item.rarity] || RARITY_STYLES.common}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <h3 className="font-semibold text-sm">{item.name}</h3>
                        <span className={`text-[10px] font-bold uppercase ${RARITY_LABELS[item.rarity] || ""}`}>
                          {item.rarity}
                        </span>
                      </div>
                    </div>
                    {owned && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                  </div>

                  <p className="text-xs text-muted-foreground">{item.description}</p>

                  {owned ? (
                    <div className="text-xs text-green-500 font-semibold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Owned
                    </div>
                  ) : (
                    <button
                      onClick={() => buyItem(item)}
                      disabled={buying === item.id || walletBalance < item.price_crowns}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                    >
                      <Crown className="w-3.5 h-3.5" />
                      {buying === item.id ? "..." : `${item.price_crowns} Crowns`}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <p className="text-center text-muted-foreground py-12">No items in this category.</p>
          )}
        </TabsContent>

        {/* Owned Tab */}
        <TabsContent value="owned" className="space-y-3 mt-4">
          {ownedItems.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Sparkles className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-display font-bold">No Items Yet</p>
              <p className="text-sm text-muted-foreground mt-1">Visit the shop to purchase cosmetics!</p>
            </div>
          ) : (
            ownedItems.map(item => {
              const purchase = purchases.get(item.id)!;
              return (
                <div
                  key={item.id}
                  className={`rounded-xl border p-4 flex items-center justify-between gap-3 ${RARITY_STYLES[item.rarity]}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm">{item.name}</h3>
                      <span className={`text-[10px] font-bold uppercase ${RARITY_LABELS[item.rarity]}`}>
                        {item.rarity} · {item.category.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleEquip(item.id)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                      purchase.is_equipped
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {purchase.is_equipped ? "Equipped" : "Equip"}
                  </button>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Shop;
