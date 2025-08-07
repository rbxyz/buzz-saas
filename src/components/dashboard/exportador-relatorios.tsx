"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  BarChart3, 
  Users, 
  Download, 
  Mail, 
  Printer,
  Calendar,
  DollarSign,
  Settings,
  Eye,
  FileSpreadsheet,
  File
} from "lucide-react";
import { toast } from "sonner";

interface ExportadorRelatoriosProps {
  onExport?: (config: ExportConfig) => void;
}

interface ExportConfig {
  tipo: string;
  formato: string;
  periodo: string;
  dataInicio: string;
  dataFim: string;
  incluirGraficos: boolean;
  incluirMetricas: boolean;
  incluirTabelas: boolean;
  email?: string;
}

export function ExportadorRelatorios({ onExport }: ExportadorRelatoriosProps) {
  const [config, setConfig] = useState<ExportConfig>({
    tipo: "geral",
    formato: "pdf",
    periodo: "mes",
    dataInicio: "2024-01-01",
    dataFim: "2024-01-31",
    incluirGraficos: true,
    incluirMetricas: true,
    incluirTabelas: true
  });

  const [email, setEmail] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const tiposRelatorio = [
    { value: "geral", label: "Relatório Geral", icon: FileText, descricao: "Visão completa do negócio" },
    { value: "financeiro", label: "Relatório Financeiro", icon: DollarSign, descricao: "Análise de receitas e custos" },
    { value: "agendamentos", label: "Relatório de Agendamentos", icon: Calendar, descricao: "Métricas de agendamentos" },
    { value: "clientes", label: "Relatório de Clientes", icon: Users, descricao: "Análise de clientes e retenção" },
    { value: "metricas", label: "Métricas Avançadas", icon: BarChart3, descricao: "KPIs e indicadores de performance" }
  ];

  const formatosExportacao = [
    { value: "pdf", label: "PDF", icon: File, descricao: "Documento formatado" },
    { value: "excel", label: "Excel", icon: FileSpreadsheet, descricao: "Dados em planilha" },
    { value: "csv", label: "CSV", icon: FileSpreadsheet, descricao: "Dados brutos" }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Simular processo de exportação
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const exportConfig = email ? { ...config, email } : config;
      
      if (onExport) {
        onExport(exportConfig);
      } else {
        // Simular download
        toast.success("Relatório exportado com sucesso!");
        
        // Simular download do arquivo
        const link = document.createElement('a');
        link.href = '#';
        link.download = `relatorio-${config.tipo}-${new Date().toISOString().split('T')[0]}.${config.formato}`;
        link.click();
      }
    } catch (error) {
      toast.error("Erro ao exportar relatório");
    } finally {
      setIsExporting(false);
    }
  };

  const handleEmailExport = async () => {
    if (!email) {
      toast.error("Digite um email válido");
      return;
    }

    setIsExporting(true);
    
    try {
      // Simular envio por email
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Relatório enviado por email!");
    } catch (error) {
      toast.error("Erro ao enviar por email");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Seleção de Tipo de Relatório */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tipo de Relatório
          </CardTitle>
          <CardDescription>
            Escolha o tipo de relatório que deseja exportar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tiposRelatorio.map((tipo) => (
              <div
                key={tipo.value}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  config.tipo === tipo.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setConfig({ ...config, tipo: tipo.value })}
              >
                <div className="flex items-center gap-3">
                  <tipo.icon className="h-5 w-5 text-primary" />
                  <div>
                    <h4 className="font-medium">{tipo.label}</h4>
                    <p className="text-sm text-muted-foreground">{tipo.descricao}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Exportação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações de Exportação
          </CardTitle>
          <CardDescription>
            Configure como deseja exportar o relatório
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Formato */}
            <div>
              <Label>Formato de Exportação</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {formatosExportacao.map((formato) => (
                  <div
                    key={formato.value}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      config.formato === formato.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setConfig({ ...config, formato: formato.value })}
                  >
                    <div className="flex items-center gap-3">
                      <formato.icon className="h-4 w-4" />
                      <div>
                        <span className="font-medium">{formato.label}</span>
                        <p className="text-xs text-muted-foreground">{formato.descricao}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Período */}
            <div className="space-y-4">
              <div>
                <Label>Período</Label>
                <Select value={config.periodo} onValueChange={(value) => setConfig({ ...config, periodo: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semana">Última Semana</SelectItem>
                    <SelectItem value="mes">Último Mês</SelectItem>
                    <SelectItem value="trimestre">Último Trimestre</SelectItem>
                    <SelectItem value="ano">Último Ano</SelectItem>
                    <SelectItem value="personalizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.periodo === "personalizado" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data Início</Label>
                    <Input
                      type="date"
                      value={config.dataInicio}
                      onChange={(e) => setConfig({ ...config, dataInicio: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Data Fim</Label>
                    <Input
                      type="date"
                      value={config.dataFim}
                      onChange={(e) => setConfig({ ...config, dataFim: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Opções de Conteúdo */}
          <div className="mt-6">
            <Label>Conteúdo do Relatório</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="graficos"
                  checked={config.incluirGraficos}
                  onCheckedChange={(checked) => 
                    setConfig({ ...config, incluirGraficos: checked as boolean })
                  }
                />
                <Label htmlFor="graficos">Incluir Gráficos</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="metricas"
                  checked={config.incluirMetricas}
                  onCheckedChange={(checked) => 
                    setConfig({ ...config, incluirMetricas: checked as boolean })
                  }
                />
                <Label htmlFor="metricas">Incluir Métricas</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="tabelas"
                  checked={config.incluirTabelas}
                  onCheckedChange={(checked) => 
                    setConfig({ ...config, incluirTabelas: checked as boolean })
                  }
                />
                <Label htmlFor="tabelas">Incluir Tabelas</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações de Exportação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Relatório
          </CardTitle>
          <CardDescription>
            Escolha como deseja receber o relatório
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Download Direto */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Download Direto</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Baixe o relatório diretamente no seu dispositivo
                </p>
                <Button 
                  onClick={handleExport} 
                  disabled={isExporting}
                  className="w-full"
                >
                  {isExporting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Exportando...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Baixar Relatório
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Envio por Email */}
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Enviar por Email</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Receba o relatório no seu email
                </p>
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button 
                    onClick={handleEmailExport} 
                    disabled={isExporting || !email}
                    variant="outline"
                    className="w-full"
                  >
                    {isExporting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Enviar por Email
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview do Relatório */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview do Relatório
          </CardTitle>
          <CardDescription>
            Visualize o que será incluído no relatório
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium">
                  Relatório {tiposRelatorio.find(t => t.value === config.tipo)?.label}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {config.periodo === "personalizado" 
                    ? `${config.dataInicio} a ${config.dataFim}`
                    : `Período: ${config.periodo}`
                  }
                </p>
              </div>
              <Badge variant="secondary">
                {formatosExportacao.find(f => f.value === config.formato)?.label}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Checkbox checked={config.incluirMetricas} disabled />
                <span>Métricas e KPIs</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Checkbox checked={config.incluirGraficos} disabled />
                <span>Gráficos e Visualizações</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Checkbox checked={config.incluirTabelas} disabled />
                <span>Tabelas de Dados</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 