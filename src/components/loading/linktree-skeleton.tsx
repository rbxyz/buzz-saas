import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function LinktreeSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Skeleton className="h-8 w-48" />

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-80" />
          </div>
          <Skeleton className="h-9 w-24" />
        </CardHeader>

        <CardContent className="grid gap-6 md:grid-cols-2">
          {/* Clientes Section */}
          <section>
            <Skeleton className="mb-4 h-6 w-24" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="flex flex-row items-center gap-4 p-4">
                  <Skeleton className="h-16 w-16 flex-shrink-0 rounded" />
                  <div className="flex-grow space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-8 w-8 flex-shrink-0" />
                </Card>
              ))}
            </div>
          </section>

          {/* Parcerias Section */}
          <section>
            <Skeleton className="mb-4 h-6 w-24" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="flex flex-row items-center gap-4 p-4">
                  <Skeleton className="h-16 w-16 flex-shrink-0 rounded" />
                  <div className="flex-grow space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-36" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-8 w-8 flex-shrink-0" />
                </Card>
              ))}
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
