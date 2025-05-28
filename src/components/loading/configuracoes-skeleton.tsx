import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ConfiguracoesSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Skeleton className="h-8 w-48" />

      {/* Main Layout */}
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Left Column */}
        <div className="flex w-full flex-col gap-6">
          {/* Account Settings Card */}
          <Card className="w-full">
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="grid gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="grid gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </CardContent>
            <div className="mb-6 ml-6">
              <Skeleton className="h-9 w-48" />
            </div>
          </Card>

          {/* Services Card */}
          <Card className="w-full">
            <CardHeader>
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center"
                >
                  <Skeleton className="h-10 w-full sm:w-1/2" />
                  <Skeleton className="h-10 w-full sm:w-1/3" />
                  <Skeleton className="h-10 w-full sm:w-auto" />
                </div>
              ))}
              <Skeleton className="h-10 w-full" />
            </CardContent>
            <div className="p-6">
              <Skeleton className="h-9 w-32" />
            </div>
          </Card>
        </div>

        {/* Right Column - Schedule */}
        <Card className="w-160">
          <CardHeader>
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Default Hours */}
            <div className="flex flex-col gap-2 md:flex-row md:gap-6">
              <div className="space-y-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-10 w-32" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>

            {/* Days of Week */}
            <div className="space-y-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="border-b pb-3">
                  <div className="flex items-center space-x-3">
                    <Skeleton className="h-6 w-6" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <div className="p-6">
            <Skeleton className="h-9 w-32" />
          </div>
        </Card>
      </div>

      {/* Bottom Cards */}
      <div className="flex flex-col gap-4 md:flex-row">
        {/* AI Card */}
        <Card className="w-full md:flex-1">
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-11" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
          <div className="p-6">
            <Skeleton className="h-9 w-48" />
          </div>
        </Card>
      </div>

      {/* WhatsApp Card */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-11" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
        <div className="p-6">
          <Skeleton className="h-9 w-48" />
        </div>
      </Card>
    </div>
  );
}
