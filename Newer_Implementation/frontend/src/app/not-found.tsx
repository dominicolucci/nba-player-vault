import Link from "next/link";
import { Container, Kicker, buttonVariants } from "@/components/ui";

export default function NotFound() {
  return (
    <Container>
      <div className="flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <Kicker tone="muted">404 · Not found</Kicker>
        <p className="mt-4 font-display text-5xl font-bold tracking-tight text-fg sm:text-6xl">
          Out of bounds
        </p>
        <p className="mt-4 max-w-md text-muted">
          This page isn&apos;t in the vault yet. Product pages plug into the navigation shell as
          they&apos;re built.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className={buttonVariants({ variant: "primary" })}>
            Back to home
          </Link>
          <Link href="/styleguide" className={buttonVariants({ variant: "ghost" })}>
            Design system
          </Link>
        </div>
      </div>
    </Container>
  );
}
