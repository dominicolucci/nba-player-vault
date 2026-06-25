import { Container, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <Container>
      <div className="space-y-14 py-10">
        {/* Header */}
        <div className="flex items-center gap-5">
          <Skeleton className="h-[88px] w-[88px] rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="mt-3 h-4 w-72 max-w-full" />
          </div>
        </div>

        {/* Career stat grid */}
        <div className="grid grid-cols-2 gap-px sm:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>

        {/* Chart */}
        <Skeleton className="h-[320px] w-full rounded-card" />

        {/* Table */}
        <Skeleton className="h-72 w-full rounded-card" />
      </div>
    </Container>
  );
}
