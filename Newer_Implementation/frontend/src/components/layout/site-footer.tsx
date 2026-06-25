import Link from "next/link";
import { Logo } from "./logo";
import { siteConfig } from "@/lib/site";

const columns = [
  {
    title: "Explore",
    links: siteConfig.nav,
  },
  {
    title: "Project",
    links: [
      { href: "/styleguide", label: "Design system" },
      { href: siteConfig.links.github, label: "Source code" },
      { href: "/", label: "Overview" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-panel">
      <div className="container-shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            {siteConfig.description}
          </p>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-dim">
            Data from stats.nba.com · validated vs Basketball-Reference
          </p>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h2 className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-dim">
              {col.title}
            </h2>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={`${col.title}-${link.label}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted transition-colors duration-150 hover:text-accent-text"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="container-shell flex flex-col gap-2 py-5 text-xs text-dim sm:flex-row sm:items-center sm:justify-between">
          <p>
            {siteConfig.name} — an end-to-end analytics data platform.
          </p>
          <p className="font-mono">Next.js · Tailwind · FastAPI · DuckDB</p>
        </div>
      </div>
    </footer>
  );
}
