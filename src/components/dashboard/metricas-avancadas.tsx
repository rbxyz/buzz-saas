"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  DollarSign, 
  Users, 
  Star,
  Activity,
  Zap,
  Award,
  Eye,
  MousePointer,
  MessageCircle,
  Phone,
  Mail,
  Calendar,
  BarChart3
} from "lucide-react";

interface MetricaCardProps {
  titulo: string;
  valor: string | number;
  descricao: string;
  icone: React.ComponentType<{ className?: string }>;
  variacao?: number;
  cor?: "green" | "red" | "blue" | "yellow";
  progresso?: number;
  unidade?: string;
}

function MetricaCard({ 
  titulo, 
  valor, 
  descricao, 
  icone: Icon, 
  variacao, 
  cor = "blue",
  progresso,
  unidade
}: MetricaCardProps) {
  const cores = {
    green: "text-green-600",
    red: "text-red-600", 
    blue: "text-blue-600",
    yellow: "text-yellow-600"
  };

  const coresBg = {
    green: "bg-green-50",
    red: "bg-red-50",
    blue: "bg-blue-50", 
    yellow: "bg-yellow-50"
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
        <div className={`p-2 rounded-lg ${coresBg[cor]}`}>
          <Icon className={`h-4 w-4 ${cores[cor]}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof valor === 'number' && unidade ? `${valor}${unidade}` : valor}
        </div>
        <p className="text-xs text-muted-foreground mb-2">{descricao}</p>
        
        {variacao !== undefined && (
          <div className="flex items-center gap-1 text-xs">
            {variacao > 0 ? (
              <TrendingUp className="h-3 w-3 text-green-600" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-600" />
            )}
            <span className={variacao > 0 ? "text-green-600" : "text-red-600"}>
              {variacao > 0 ? "+" : ""}{variacao}%
            </span>
            <span className="text-muted-foreground">vs período anterior</span>
          </div>
        )}

        {progresso !== undefined && (
          <div className="mt-2">
            <Progress value={progresso} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {progresso}% do objetivo
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricaAvancadaProps {
  periodo: string;
}

export function MetricasAvancadas({ periodo }: MetricaAvancadaProps) {
  // Dados fictícios para demonstração
  const metricas = {
    conversao: {
      taxa: 78.3,
      variacao: 5.2,
      objetivo: 85
    },
    retencao: {
      taxa: 92.1,
      variacao: 2.1,
      objetivo: 90
    },
    satisfacao: {
      nota: 4.8,
      variacao: 0.3,
      objetivo: 5.0
    },
    eficiencia: {
      taxa: 87.5,
      variacao: -1.2,
      objetivo: 90
    }
  };

  const metricasDetalhadas = [
    {
      titulo: "Taxa de Conversão",
      valor: `${metricas.conversao.taxa}%`,
      descricao: "Visitantes que se tornaram clientes",
      icone: Target,
      variacao: metricas.conversao.variacao,
      cor: "green" as const,
      progresso: (metricas.conversao.taxa / metricas.conversao.objetivo) * 100
    },
    {
      titulo: "Taxa de Retenção",
      valor: `${metricas.retencao.taxa}%`,
      descricao: "Clientes que retornaram",
      icone: Users,
      variacao: metricas.retencao.variacao,
      cor: "blue" as const,
      progresso: (metricas.retencao.taxa / metricas.retencao.objetivo) * 100
    },
    {
      titulo: "Satisfação do Cliente",
      valor: `${metricas.satisfacao.nota}/5.0`,
      descricao: "Avaliação média dos clientes",
      icone: Star,
      variacao: metricas.satisfacao.variacao,
      cor: "yellow" as const,
      progresso: (metricas.satisfacao.nota / metricas.satisfacao.objetivo) * 100
    },
    {
      titulo: "Eficiência Operacional",
      valor: `${metricas.eficiencia.taxa}%`,
      descricao: "Otimização dos processos",
      icone: Activity,
      variacao: metricas.eficiencia.variacao,
      cor: "red" as const,
      progresso: (metricas.eficiencia.taxa / metricas.eficiencia.objetivo) * 100
    }
  ];

  const indicadoresChave = [
    {
      titulo: "Tempo Médio de Atendimento",
      valor: "45",
      unidade: "min",
      descricao: "Duração média dos serviços",
      icone: Clock,
      variacao: -2.5,
      cor: "green" as const
    },
    {
      titulo: "Ticket Médio",
      valor: "R$ 36,60",
      descricao: "Valor médio por agendamento",
      icone: DollarSign,
      variacao: 8.7,
      cor: "blue" as const
    },
    {
      titulo: "Novos Clientes",
      valor: "28",
      descricao: "Clientes adquiridos este mês",
      icone: Users,
      variacao: 15.3,
      cor: "green" as const
    },
    {
      titulo: "Taxa de Cancelamento",
      valor: "3.2",
      unidade: "%",
      descricao: "Agendamentos cancelados",
      icone: Calendar,
      variacao: -0.8,
      cor: "green" as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Métricas de Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricasDetalhadas.map((metrica, index) => (
            <MetricaCard key={index} {...metrica} />
          ))}
        </div>
      </div>

      {/* Indicadores Chave */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Indicadores Chave (KPIs)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {indicadoresChave.map((indicador, index) => (
            <MetricaCard key={index} {...indicador} />
          ))}
        </div>
      </div>

      {/* Resumo de Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Resumo de Performance - {periodo}
          </CardTitle>
          <CardDescription>
            Visão geral do desempenho do negócio no período selecionado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">+18.7%</div>
              <p className="text-sm text-muted-foreground">Crescimento da Receita</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">92.1%</div>
              <p className="text-sm text-muted-foreground">Taxa de Retenção</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">4.8/5.0</div>
              <p className="text-sm text-muted-foreground">Satisfação do Cliente</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 