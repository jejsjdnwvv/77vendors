import { Link } from "@tanstack/react-router";

import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/70 bg-surface/40">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            77 Resells is a curated marketplace for digital goods, gaming items, accounts and
            services — delivered instantly through the provider you choose.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Marketplace</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li>
              <Link to="/marketplace" className="transition-colors hover:text-foreground">
                Browse all
              </Link>
            </li>
            <li>
              <Link to="/favorites" className="transition-colors hover:text-foreground">
                Favorites
              </Link>
            </li>
            <li>
              <Link to="/orders" className="transition-colors hover:text-foreground">
                Orders
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Company</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
            <li>
              <Link to="/support" className="transition-colors hover:text-foreground">
                Support
              </Link>
            </li>
            <li>
              <Link to="/terms" className="transition-colors hover:text-foreground">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link to="/privacy" className="transition-colors hover:text-foreground">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link to="/refunds" className="transition-colors hover:text-foreground">
                Refund Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border/70 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} 77 Resells. All rights reserved.
      </div>
    </footer>
  );
}
