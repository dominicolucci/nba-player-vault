import { Container, Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <Container>
      <div className="py-12">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="mt-3 h-10 w-64" />
        <Skeleton className="mt-4 h-5 w-full max-w-xl" />

        <div className="mt-8 grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="hidden h-5 w-6 sm:block" />
          <Skeleton className="h-11 w-full" />
        </div>

        <Skeleton className="mt-10 h-[26rem] w-full rounded-card" />
      </div>
    </Container>
  );
}
