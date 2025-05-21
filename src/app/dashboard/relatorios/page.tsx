import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function RelatoriosPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>

      <Card>
        <CardHeader>
          <CardTitle>Análise de Desempenho</CardTitle>
          <CardDescription>Visualize métricas e relatórios do seu negócio</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aqui serão implementados os gráficos e relatórios de desempenho.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
