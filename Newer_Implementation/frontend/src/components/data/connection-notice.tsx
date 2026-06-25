import { TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui";

/** Friendly fallback when the FastAPI backend can't be reached. */
export function ConnectionNotice({ detail }: { detail?: string }) {
  return (
    <Card className="flex flex-col gap-3 p-6">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-negative-soft text-negative">
          <TriangleAlert className="h-4 w-4" aria-hidden />
        </span>
        <p className="font-display text-lg font-semibold text-fg">Couldn&apos;t reach the Vault API</p>
      </div>
      <p className="text-sm text-muted">
        This page reads live data from the FastAPI backend. Start it from{" "}
        <code className="rounded bg-panel px-1.5 py-0.5 font-mono text-xs text-accent-text">
          Newer_Implementation/
        </code>
        , then refresh:
      </p>
      <pre className="overflow-x-auto rounded-lg border border-border bg-panel px-3 py-2 font-mono text-xs text-muted">
        uvicorn api:app --reload
      </pre>
      {detail ? <p className="font-mono text-xs text-dim">{detail}</p> : null}
    </Card>
  );
}
