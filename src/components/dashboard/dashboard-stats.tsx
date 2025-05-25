import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MessageSquare, TrendingUp, Users } from "lucide-react";
import { trpc } from "@/utils/trpc";

export function DashboardStats() {
  // Buscar estatísticas do backend
  const { data, isLoading, error } = trpc.dashboard.getStats.useQuery();

  // Estados locais para métricas derivadas (exemplos)
  const [agendamentosHoje, setAgendamentosHoje] = useState(0);
  const [novosClientes, setNovosClientes] = useState(0);
  const [mensagensWhatsApp, setMensagensWhatsApp] = useState(0);
  const [faturamentoEstimado, setFaturamentoEstimado] = useState(0);

  const [variacaoAgendamentos, setVariacaoAgendamentos] = useState(0);
  const [variacaoNovosClientes, setVariacaoNovosClientes] = useState(0);
  const [variacaoFaturamento, setVariacaoFaturamento] = useState(0);

  // Atualizar estados locais quando os dados do backend chegarem
  useEffect(() => {
    if (!data) return;

    setAgendamentosHoje(data.agendamentosHoje ?? 0);
    setNovosClientes(data.novosClientes ?? 0);
    setMensagensWhatsApp(data.mensagensWhatsApp ?? 0);
    setFaturamentoEstimado(data.faturamentoEstimado ?? 0);

    setVariacaoAgendamentos(data.variacaoAgendamentos ?? 0);
    setVariacaoNovosClientes(data.variacaoNovosClientes ?? 0);
    setVariacaoFaturamento(data.variacaoFaturamento ?? 0);
  }, [data]);

  if (isLoading) return <div>Carregando estatísticas...</div>;
  if (error) return <div>Erro ao carregar estatísticas: {error.message}</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Agendamentos Hoje
          </CardTitle>
          <Calendar className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{agendamentosHoje}</div>
          <p className="text-muted-foreground text-xs">
            {variacaoAgendamentos >= 0 ? "+" : ""}
            {variacaoAgendamentos.toFixed(1)}% em relação a ontem
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Novos Clientes</CardTitle>
          <Users className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">+{novosClientes}</div>
          <p className="text-muted-foreground text-xs">
            {variacaoNovosClientes >= 0 ? "+" : ""}
            {variacaoNovosClientes.toFixed(1)}% em relação à semana passada
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Mensagens WhatsApp
          </CardTitle>
          <MessageSquare className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{mensagensWhatsApp}</div>
          <p className="text-muted-foreground text-xs">
            {variacaoFaturamento >= 0 ? "+" : ""}
            {variacaoFaturamento.toFixed(1)}% em relação à semana passada
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Faturamento Estimado
          </CardTitle>
          <TrendingUp className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            R$ {faturamentoEstimado.toLocaleString("pt-BR")}
          </div>
          <p className="text-muted-foreground text-xs">
            +18.1% em relação à semana passada
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
