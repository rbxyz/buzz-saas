"use client";

import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { Overview } from "@/components/dashboard/overview";
import { RecentAppointments } from "@/components/dashboard/recent-appointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

export default function DashboardPage() {
  const isMobile = useIsMobile();

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          Dashboard
        </h2>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList
          className={`grid w-full ${isMobile ? "grid-cols-2" : "grid-cols-3"}`}
        >
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="analytics">Análises</TabsTrigger>
          {!isMobile && <TabsTrigger value="reports">Relatórios</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <DashboardStats />

          <div
            className={`grid gap-4 ${isMobile ? "grid-cols-1" : "md:grid-cols-2 lg:grid-cols-7"}`}
          >
            <Card className={isMobile ? "col-span-1" : "col-span-4"}>
              <CardHeader>
                <CardTitle>Visão Geral</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <Overview />
              </CardContent>
            </Card>

            <Card className={isMobile ? "col-span-1" : "col-span-3"}>
              <CardHeader>
                <CardTitle>Agendamentos Recentes</CardTitle>
              </CardHeader>
              <CardContent>
                <RecentAppointments />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análises Detalhados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Relatórios detalhados estarão disponíveis em breve.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {!isMobile && (
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Relatórios Detalhados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Relatórios detalhados estarão disponíveis em breve.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
