"use client";

import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "./logo";
import { GithubIcon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/lib/site";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-overlay backdrop-blur-md">
      <div className="container-shell flex h-16 items-center justify-between gap-4">
        {/* Brand + desktop nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="rounded-md focus-visible:outline-none" aria-label={siteConfig.name}>
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {siteConfig.nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
                    active ? "text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {item.label}
                  <span
                    aria-hidden
                    className={cn(
                      "mx-3 mt-1 block h-px origin-left transition-transform duration-200",
                      active ? "scale-x-100 bg-accent" : "scale-x-0 bg-transparent",
                    )}
                  />
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link
            href="/players"
            className="hidden items-center gap-2 rounded-lg border border-border bg-card-2 px-3 py-2 text-sm text-dim transition-colors duration-150 hover:border-border-strong hover:text-muted lg:inline-flex"
          >
            <Search className="h-4 w-4" aria-hidden />
            <span>Search players</span>
          </Link>
          <ThemeToggle />
          <a
            href={siteConfig.links.github}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong bg-card-2 text-muted transition-colors duration-150 hover:border-accent hover:text-fg focus-visible:outline-none"
          >
            <GithubIcon className="h-[18px] w-[18px]" />
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong bg-card-2 text-muted transition-colors duration-150 hover:border-accent hover:text-fg focus-visible:outline-none md:hidden cursor-pointer"
          >
            {open ? <X className="h-[18px] w-[18px]" aria-hidden /> : <Menu className="h-[18px] w-[18px]" aria-hidden />}
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      {open ? (
        <nav className="border-t border-border bg-bg md:hidden" aria-label="Primary mobile">
          <div className="container-shell flex flex-col py-2">
            {siteConfig.nav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-md px-3 py-3 text-sm font-medium transition-colors duration-150",
                    active ? "bg-card-2 text-accent-text" : "text-muted hover:bg-card-2 hover:text-fg",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
