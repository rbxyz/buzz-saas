"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign, 
  Clock, 
  Download, 
  FileText,
  PieChart,
  Activity,
  Target,
  Award,
  Zap,
  Star,
  TrendingDown,
  Eye,
  MousePointer,
  MessageCircle,
  Phone,
  Mail
} from "lucide-react";
import { MetricasAvancadas } from "@/components/dashboard/metricas-avancadas";
import { ExportadorRelatorios } from "@/components/dashboard/exportador-relatorios";

// Dados fictícios para demonstração
const metricasGerais = {
  agendamentos: {
    total: 1247,
    mesAtual: 156,
    crescimento: 12.5,
    taxaConversao: 78.3,
    cancelamentos: 23,
    taxaCancelamento: 3.2
  },
  receita: {
    total: 45680.50,
    mesAtual: 8920.30,
    crescimento: 18.7,
    ticketMedio: 36.60,
    servicoMaisVendido: "Corte + Barba"
  },
  clientes: {
    total: 342,
    novosMes: 28,
    recorrentes: 89,
    taxaRetencao: 92.1,
    satisfacao: 4.8
  },
  servicos: {
    total: 8,
    maisAgendado: "Corte Masculino",
    menosAgendado: "Tratamento Capilar",
    duracaoMedia: 45
  }
};

const dadosRelatorios = {
  agendamentosPorDia: [
    { dia: "Segunda", agendamentos: 45, receita: 1647.50 },
    { dia: "Terça", agendamentos: 52, receita: 1892.00 },
    { dia: "Quarta", agendamentos: 38, receita: 1392.00 },
    { dia: "Quinta", agendamentos: 61, receita: 2234.50 },
    { dia: "Sexta", agendamentos: 67, receita: 2456.00 },
    { dia: "Sábado", agendamentos: 89, receita: 3256.00 },
    { dia: "Domingo", agendamentos: 12, receita: 438.00 }
  ],
  servicosMaisVendidos: [
    { servico: "Corte Masculino", quantidade: 456, receita: 16720.00, percentual: 36.6 },
    { servico: "Barba", quantidade: 234, receita: 8190.00, percentual: 17.9 },
    { servico: "Corte + Barba", quantidade: 345, receita: 15525.00, percentual: 30.2 },
    { servico: "Tratamento Capilar", quantidade: 89, receita: 5340.00, percentual: 7.8 },
    { servico: "Outros", quantidade: 123, receita: 4305.00, percentual: 7.5 }
  ],
  clientesTop: [
    { nome: "João Silva", agendamentos: 15, valorTotal: 675.00, ultimaVisita: "2024-01-15" },
    { nome: "Maria Santos", agendamentos: 12, valorTotal: 540.00, ultimaVisita: "2024-01-12" },
    { nome: "Pedro Costa", agendamentos: 10, valorTotal: 450.00, ultimaVisita: "2024-01-10" },
    { nome: "Ana Oliveira", agendamentos: 9, valorTotal: 405.00, ultimaVisita: "2024-01-08" },
    { nome: "Carlos Lima", agendamentos: 8, valorTotal: 360.00, ultimaVisita: "2024-01-05" }
  ]
};

export default function RelatoriosPage() {
  const [periodoSelecionado, setPeriodoSelecionado] = useState("mes");
  const [tipoRelatorio, setTipoRelatorio] = useState("geral");

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const formatarPercentual = (valor: number) => {
    return `${valor.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relatórios e Análises</h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho do seu negócio com métricas detalhadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar Dados
          </Button>
          <Button size="sm">
            <FileText className="mr-2 h-4 w-4" />
            Gerar PDF
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros de Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Período</Label>
              <Select value={periodoSelecionado} onValueChange={setPeriodoSelecionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semana">Última Semana</SelectItem>
                  <SelectItem value="mes">Último Mês</SelectItem>
                  <SelectItem value="trimestre">Último Trimestre</SelectItem>
                  <SelectItem value="ano">Último Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Início</Label>
              <Input type="date" defaultValue="2024-01-01" />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" defaultValue="2024-01-31" />
            </div>
            <div>
              <Label>Tipo de Relatório</Label>
              <Select value={tipoRelatorio} onValueChange={setTipoRelatorio}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Relatório Geral</SelectItem>
                  <SelectItem value="agendamentos">Agendamentos</SelectItem>
                  <SelectItem value="financeiro">Financeiro</SelectItem>
                  <SelectItem value="clientes">Clientes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricasGerais.agendamentos.mesAtual}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{metricasGerais.agendamentos.crescimento}%</span> vs mês anterior
            </p>
            <div className="mt-2">
              <Progress value={metricasGerais.agendamentos.taxaConversao} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Taxa de conversão: {formatarPercentual(metricasGerais.agendamentos.taxaConversao)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatarMoeda(metricasGerais.receita.mesAtual)}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{metricasGerais.receita.crescimento}%</span> vs mês anterior
            </p>
            <div className="mt-2">
              <p className="text-xs text-muted-foreground">
                Ticket médio: {formatarMoeda(metricasGerais.receita.ticketMedio)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricasGerais.clientes.total}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{metricasGerais.clientes.novosMes}</span> novos este mês
            </p>
            <div className="mt-2">
              <Progress value={metricasGerais.clientes.taxaRetencao} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">
                Taxa de retenção: {formatarPercentual(metricasGerais.clientes.taxaRetencao)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfação</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricasGerais.clientes.satisfacao}/5.0</div>
            <p className="text-xs text-muted-foreground">
              Avaliação média dos clientes
            </p>
            <div className="mt-2 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= metricasGerais.clientes.satisfacao
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Relatórios */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="metricas">Métricas Avançadas</TabsTrigger>
          <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="exportar">Exportar</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de Agendamentos por Dia */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Agendamentos por Dia da Semana
                </CardTitle>
                <CardDescription>
                  Distribuição de agendamentos ao longo da semana
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dadosRelatorios.agendamentosPorDia.map((item) => (
                    <div key={item.dia} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.dia}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {item.agendamentos} agendamentos
                        </span>
                        <span className="text-sm font-medium">
                          {formatarMoeda(item.receita)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Serviços Mais Vendidos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Serviços Mais Vendidos
                </CardTitle>
                <CardDescription>
                  Distribuição de vendas por serviço
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dadosRelatorios.servicosMaisVendidos.map((servico) => (
                    <div key={servico.servico} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{servico.servico}</span>
                        <span className="text-sm text-muted-foreground">
                          {formatarPercentual(servico.percentual)}
                        </span>
                      </div>
                      <Progress value={servico.percentual} className="h-2" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{servico.quantidade} vendas</span>
                        <span>{formatarMoeda(servico.receita)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metricas" className="space-y-4">
          <MetricasAvancadas periodo={periodoSelecionado === "mes" ? "Último Mês" : "Período Selecionado"} />
        </TabsContent>

        <TabsContent value="agendamentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento de Agendamentos</CardTitle>
              <CardDescription>
                Análise detalhada dos agendamentos e horários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {metricasGerais.agendamentos.total}
                  </div>
                  <p className="text-sm text-muted-foreground">Total de Agendamentos</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {metricasGerais.agendamentos.taxaConversao}%
                  </div>
                  <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {metricasGerais.agendamentos.taxaCancelamento}%
                  </div>
                  <p className="text-sm text-muted-foreground">Taxa de Cancelamento</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatório Financeiro</CardTitle>
              <CardDescription>
                Análise financeira detalhada do período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Resumo Financeiro</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Receita Total:</span>
                      <span className="font-medium">{formatarMoeda(metricasGerais.receita.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Receita do Mês:</span>
                      <span className="font-medium">{formatarMoeda(metricasGerais.receita.mesAtual)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ticket Médio:</span>
                      <span className="font-medium">{formatarMoeda(metricasGerais.receita.ticketMedio)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Crescimento:</span>
                      <span className="font-medium text-green-600">
                        +{metricasGerais.receita.crescimento}%
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">Serviço Mais Vendido</h3>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-lg font-semibold">{metricasGerais.receita.servicoMaisVendido}</div>
                    <p className="text-sm text-muted-foreground">
                      Serviço com maior volume de vendas
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Clientes</CardTitle>
              <CardDescription>
                Clientes com maior volume de agendamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Agendamentos</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Última Visita</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dadosRelatorios.clientesTop.map((cliente) => (
                    <TableRow key={cliente.nome}>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>{cliente.agendamentos}</TableCell>
                      <TableCell>{formatarMoeda(cliente.valorTotal)}</TableCell>
                      <TableCell>{cliente.ultimaVisita}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Ativo</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exportar" className="space-y-4">
          <ExportadorRelatorios />
        </TabsContent>
      </Tabs>
    </div>
  );
} 