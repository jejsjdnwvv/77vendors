import { cn } from "@/lib/utils";

const MARKS: Record<string, { initials: string; className: string }> = {
  litbuy: { initials: "LB", className: "from-chart-1 to-chart-2" },
  kakobuy: { initials: "KB", className: "from-chart-5 to-chart-1" },
  oopbuy: { initials: "OB", className: "from-chart-2 to-chart-3" },
};

export function ProviderMark({ providerKey, size = 22 }: { providerKey: string; size?: number }) {
  const mark = MARKS[providerKey] ?? { initials: providerKey.slice(0, 2).toUpperCase(), className: "from-primary to-primary-glow" };
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md bg-gradient-to-br font-display font-bold text-primary-foreground",
        mark.className,
      )}
    >
      {mark.initials}
    </span>
  );
}

export function ProviderBadge({
  providerKey,
  name,
  className,
}: {
  providerKey: string;
  name: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 py-1 pl-1 pr-2.5 text-xs font-medium text-foreground",
        className,
      )}
    >
      <ProviderMark providerKey={providerKey} size={18} />
      {name}
    </span>
  );
}
