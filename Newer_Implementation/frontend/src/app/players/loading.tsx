import { Container, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <Container>
      <div className="py-12">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-10 w-64" />
        <Skeleton className="mt-4 h-5 w-full max-w-xl" />

        <div className="mt-10 flex flex-wrap gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28" />
          ))}
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[68px]" />
          ))}
        </div>
      </div>
    </Container>
  );
}
