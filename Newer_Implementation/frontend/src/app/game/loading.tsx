import { Container, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <Container>
      <div className="py-12">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-10 w-72" />
        <Skeleton className="mt-4 h-5 w-full max-w-2xl" />

        <div className="mt-10 space-y-8">
          <Skeleton className="h-44 w-full rounded-card" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
          <Skeleton className="h-56 w-full rounded-card" />
        </div>
      </div>
    </Container>
  );
}
