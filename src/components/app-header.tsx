import Link from "next/link";
import { BookOpen } from "lucide-react";

const links = [
  { href: "/", label: "Home" },
  { href: "/subjects", label: "Subjects" },
  { href: "/topics", label: "Topics" },
];

export function AppHeader() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <BookOpen className="size-5 text-primary" aria-hidden />
          <span className="hidden sm:inline">Adaptive Revision Planner</span>
          <span className="sm:hidden">Revision Planner</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 text-sm">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
