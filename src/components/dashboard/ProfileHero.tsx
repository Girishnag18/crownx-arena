import { Crown, ShieldCheck, Sparkles, TrendingUp, User, Wallet } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import XPProgressBar from "@/components/gamification/XPProgressBar";

interface ProfileHeroProps {
  username: string;
  avatarUrl: string | null;
  rank: string;
  crownScore: number;
  level: number;
  xp: number;
  walletCrowns: number;
}

const ProfileHero = ({
  username,
  avatarUrl,
  rank,
  crownScore,
  level,
  xp,
  walletCrowns,
}: ProfileHeroProps) => (
  <section className="relative overflow-hidden rounded-[28px] border border-border/50 bg-card/72 p-5 shadow-[0_30px_90px_-55px_hsl(var(--foreground)/0.45)] backdrop-blur-2xl sm:p-6">
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -left-8 top-0 h-32 w-32 rounded-full bg-primary/12 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-40 w-40 rounded-full bg-accent/10 blur-3xl" />
    </div>

    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <Avatar className="h-20 w-20 border-2 border-primary/20 shadow-[0_20px_40px_-25px_hsl(var(--primary))]">
            <AvatarImage src={avatarUrl || undefined} alt={username} />
            <AvatarFallback className="bg-secondary text-primary">
              <User className="h-8 w-8" />
            </AvatarFallback>
          </Avatar>
          <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-background bg-emerald-400" />
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="eyebrow">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Arena profile</span>
            </div>
            <div>
              <h2 className="font-display text-2xl font-black tracking-tight sm:text-3xl">{username}</h2>
              <p className="text-sm text-muted-foreground">
                Your live arena snapshot, rating, and progression in one place.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="metric-pill">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>{rank}</span>
            </div>
            <div className="metric-pill">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <span>{crownScore} rating</span>
            </div>
            <div className="metric-pill">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span>{walletCrowns} crowns</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:w-[320px]">
        <div className="surface-muted px-4 py-4">
          <p className="kicker-label">Level</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-display text-3xl font-black text-foreground">{level}</span>
            <span className="pb-1 text-xs text-muted-foreground">active tier</span>
          </div>
        </div>
        <div className="surface-muted px-4 py-4">
          <p className="kicker-label">Rating</p>
          <div className="mt-2 flex items-end gap-2">
            <Crown className="mb-1 h-4 w-4 text-primary" />
            <span className="font-display text-3xl font-black text-foreground">{crownScore}</span>
          </div>
        </div>
      </div>
    </div>

    <div className="relative mt-5 rounded-2xl border border-border/45 bg-background/45 px-4 py-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Season progress</p>
        <span className="text-xs text-muted-foreground">Level {level}</span>
      </div>
      <XPProgressBar xp={xp} level={level} />
    </div>
  </section>
);

export default ProfileHero;
