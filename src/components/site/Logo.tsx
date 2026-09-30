import logo from "@/assets/logo.png";
import { cn } from "@/lib/utils";

/**
 * Brand mark. Swap `src/assets/logo.png` (or the store logo in admin settings)
 * to rebrand the whole site.
 */
export function Logo({
  className,
  showWordmark = true,
  size = 32,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src={logo}
        alt="77 Vendors logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0"
      />
      {showWordmark ? (
        <span className="font-display text-lg font-bold tracking-tight">
          77 <span className="brand-text">Vendors</span>
        </span>
      ) : null}
    </span>
  );
}
