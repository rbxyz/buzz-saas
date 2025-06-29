"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Palette, Save, RotateCcw, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Cores predefinidas
const CORES_PREDEFINIDAS = [
  {
    nome: "Roxo (Padrão)",
    primaria: "#7c2ae8",
    secundaria: "#420080",
    destaque: "#9333ea",
  },
  {
    nome: "Azul Profissional", 
    primaria: "#2563eb",
    secundaria: "#1d4ed8",
    destaque: "#3b82f6",
  },
  {
    nome: "Verde Natureza",
    primaria: "#059669",
    secundaria: "#047857",
    destaque: "#10b981",
  },
  {
    nome: "Laranja Energia",
    primaria: "#ea580c",
    secundaria: "#c2410c",
    destaque: "#f97316",
  },
  {
    nome: "Rosa Moderno",
    primaria: "#db2777",
    secundaria: "#be185d",
    destaque: "#ec4899",
  },
  {
    nome: "Índigo Elegante",
    primaria: "#4f46e5",
    secundaria: "#4338ca",
    destaque: "#6366f1",
  },
];

interface ConfiguracaoCores {
  primaria: string;
  secundaria: string;
  destaque: string;
}

export function CoresCard() {
  const { toast } = useToast();
  
  // Estado das cores atuais
  const [cores, setCores] = useState<ConfiguracaoCores>({
    primaria: "#7c2ae8",
    secundaria: "#420080", 
    destaque: "#9333ea",
  });

  const [coresSelecionada, setCoresSelecionada] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Aplicar cores predefinidas
  const aplicarCoresPredefinidas = (preset: typeof CORES_PREDEFINIDAS[0]) => {
    setCores({
      primaria: preset.primaria,
      secundaria: preset.secundaria,
      destaque: preset.destaque,
    });
    setCoresSelecionada(preset.nome);
  };

  // Aplicar cores customizadas
  const aplicarCoresCustomizadas = (campo: keyof ConfiguracaoCores, valor: string) => {
    setCores(prev => ({
      ...prev,
      [campo]: valor,
    }));
    setCoresSelecionada(null); // Remove seleção de preset ao customizar
  };

  // Converter hex para HSL
  const hexToHsl = useCallback((hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  }, []);

  // Salvar configurações
  const salvarConfiguracoes = async () => {
    setIsLoading(true);
    
    try {
      // Aplicar as cores nas variáveis CSS
      const root = document.documentElement;
      
      // Aplicar as cores
      root.style.setProperty('--brand-primary', hexToHsl(cores.primaria));
      root.style.setProperty('--brand-secondary', hexToHsl(cores.secundaria));
      root.style.setProperty('--brand-accent', hexToHsl(cores.destaque));

      // Salvar no localStorage para persistência
      localStorage.setItem('buzz-saas-cores', JSON.stringify(cores));

      toast({
        title: "Cores atualizadas!",
        description: "As novas cores foram aplicadas com sucesso.",
      });

    } catch (error) {
      console.error('Erro ao salvar cores:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar as configurações de cores.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Resetar para padrão
  const resetarParaPadrao = () => {
    const padrao = CORES_PREDEFINIDAS[0]!;
    setCores({
      primaria: padrao.primaria,
      secundaria: padrao.secundaria,
      destaque: padrao.destaque,
    });
    setCoresSelecionada(padrao.nome);
  };

  // Carregar cores salvas no localStorage
  useEffect(() => {
    try {
      const coresSalvas = localStorage.getItem('buzz-saas-cores');
      if (coresSalvas) {
        const coresData = JSON.parse(coresSalvas) as ConfiguracaoCores;
        setCores(coresData);
        
        // Aplicar imediatamente
        const root = document.documentElement;
        root.style.setProperty('--brand-primary', hexToHsl(coresData.primaria));
        root.style.setProperty('--brand-secondary', hexToHsl(coresData.secundaria));
        root.style.setProperty('--brand-accent', hexToHsl(coresData.destaque));
      }
    } catch (error) {
      console.error('Erro ao carregar cores salvas:', error);
    }
  }, [hexToHsl]);

  return (
    <Card className="interactive-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-heading-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light/30">
            <Palette className="h-4 w-4 text-brand-primary" />
          </div>
          Configuração de Cores
        </CardTitle>
        <CardDescription>
          Personalize as cores da aplicação de acordo com sua marca
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Cores Predefinidas */}
        <div className="space-y-3">
          <Label className="text-body font-medium">Temas Predefinidos</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {CORES_PREDEFINIDAS.map((preset) => (
              <div
                key={preset.nome}
                className={`
                  relative p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                  ${coresSelecionada === preset.nome 
                    ? 'border-brand-primary bg-brand-light/10' 
                    : 'border-subtle hover:border-border/80 hover:bg-muted/30'
                  }
                `}
                onClick={() => aplicarCoresPredefinidas(preset)}
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-body-small font-medium">{preset.nome}</p>
                    <div className="flex gap-1">
                      <div 
                        className="w-4 h-4 rounded-full border border-subtle"
                        style={{ backgroundColor: preset.primaria }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border border-subtle"
                        style={{ backgroundColor: preset.secundaria }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border border-subtle"
                        style={{ backgroundColor: preset.destaque }}
                      />
                    </div>
                  </div>
                  {coresSelecionada === preset.nome && (
                    <Check className="h-4 w-4 text-brand-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cores Customizadas */}
        <div className="space-y-4 border-t border-subtle pt-6">
          <Label className="text-body font-medium">Cores Personalizadas</Label>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cor-primaria">Cor Primária</Label>
              <div className="flex gap-2">
                <Input
                  id="cor-primaria"
                  type="color"
                  value={cores.primaria}
                  onChange={(e) => aplicarCoresCustomizadas('primaria', e.target.value)}
                  className="w-16 h-11 p-1 border-subtle"
                />
                <Input
                  type="text"
                  value={cores.primaria}
                  onChange={(e) => aplicarCoresCustomizadas('primaria', e.target.value)}
                  placeholder="#7c2ae8"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cor-secundaria">Cor Secundária</Label>
              <div className="flex gap-2">
                <Input
                  id="cor-secundaria"
                  type="color"
                  value={cores.secundaria}
                  onChange={(e) => aplicarCoresCustomizadas('secundaria', e.target.value)}
                  className="w-16 h-11 p-1 border-subtle"
                />
                <Input
                  type="text"
                  value={cores.secundaria}
                  onChange={(e) => aplicarCoresCustomizadas('secundaria', e.target.value)}
                  placeholder="#420080"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cor-destaque">Cor de Destaque</Label>
              <div className="flex gap-2">
                <Input
                  id="cor-destaque"
                  type="color"
                  value={cores.destaque}
                  onChange={(e) => aplicarCoresCustomizadas('destaque', e.target.value)}
                  className="w-16 h-11 p-1 border-subtle"
                />
                <Input
                  type="text"
                  value={cores.destaque}
                  onChange={(e) => aplicarCoresCustomizadas('destaque', e.target.value)}
                  placeholder="#9333ea"
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview das cores */}
        <div className="space-y-3 border-t border-subtle pt-6">
          <Label className="text-body font-medium">Preview</Label>
          <div className="p-4 rounded-lg border border-subtle bg-muted/30">
            <div className="flex flex-wrap gap-2">
              <Badge 
                style={{ 
                  backgroundColor: cores.primaria, 
                  color: 'white',
                  borderColor: cores.primaria 
                }}
              >
                Cor Primária
              </Badge>
              <Badge 
                variant="outline"
                style={{ 
                  borderColor: cores.secundaria,
                  color: cores.secundaria 
                }}
              >
                Cor Secundária
              </Badge>
              <Badge 
                style={{ 
                  backgroundColor: cores.destaque, 
                  color: 'white',
                  borderColor: cores.destaque 
                }}
              >
                Cor de Destaque
              </Badge>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-between pt-4 border-t border-subtle">
          <Button 
            variant="outline" 
            onClick={resetarParaPadrao}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Resetar
          </Button>
          
          <Button 
            onClick={salvarConfiguracoes}
            disabled={isLoading}
            className="gap-2 min-w-32"
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Salvar Cores
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 