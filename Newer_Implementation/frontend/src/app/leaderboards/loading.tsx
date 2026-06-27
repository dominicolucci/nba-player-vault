import { Container, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <Container>
      <div className="py-12">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-3 h-10 w-72" />
        <Skeleton className="mt-4 h-5 w-full max-w-2xl" />

        <div className="mt-8 flex flex-wrap gap-2">
          {Array.from({ length: 11 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-16" />
          ))}
        </div>

        <Skeleton className="mt-8 h-[28rem] w-full rounded-card" />
      </div>
    </Container>
  );
}
