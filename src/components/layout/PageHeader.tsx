import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type PageHeaderMetaItem = {
  icon?: LucideIcon;
  label: string;
};

interface PageHeaderProps {
  badge?: string;
  badgeIcon?: LucideIcon;
  title: string;
  description?: string;
  meta?: PageHeaderMetaItem[];
  actions?: ReactNode;
  align?: "left" | "center";
  className?: string;
}

const PageHeader = ({
  badge,
  badgeIcon: BadgeIcon,
  title,
  description,
  meta = [],
  actions,
  align = "left",
  className,
}: PageHeaderProps) => {
  const centered = align === "center";

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[28px] border border-border/50 bg-card/70 p-5 shadow-[0_30px_90px_-55px_hsl(var(--foreground)/0.45)] backdrop-blur-2xl sm:p-7",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-16 left-10 h-40 w-40 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div
        className={cn(
          "relative flex flex-col gap-5",
          centered ? "items-center text-center" : "lg:flex-row lg:items-end lg:justify-between",
        )}
      >
        <div className={cn("space-y-4", !centered && "max-w-3xl")}>
          {badge && (
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary",
                centered && "mx-auto",
              )}
            >
              {BadgeIcon && <BadgeIcon className="h-3.5 w-3.5" />}
              <span>{badge}</span>
            </div>
          )}

          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            {description && (
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {description}
              </p>
            )}
          </div>

          {meta.length > 0 && (
            <div
              className={cn(
                "flex flex-wrap gap-2",
                centered && "justify-center",
              )}
            >
              {meta.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.label}
                    className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/55 px-3 py-1.5 text-xs font-medium text-foreground/90 backdrop-blur"
                  >
                    {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {actions && (
          <div
            className={cn(
              "relative flex flex-wrap items-center gap-2",
              centered && "justify-center",
            )}
          >
            {actions}
          </div>
        )}
      </div>
    </section>
  );
};

export default PageHeader;
