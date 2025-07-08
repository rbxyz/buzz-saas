"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, CheckCircle2, Crown } from "lucide-react";
import { api } from "@/trpc/react";
import { useToast } from "@/hooks/use-toast";


interface Plan {
  id: number;
  name: string;
  type: "starter" | "pro";
  price: number;
  features: string[];
  limits: {
    monthlyBookings: number;
    maxUsers: number;
    whatsappIntegration: boolean;
    advancedAnalytics: boolean;
    customTheme: boolean;
    unlimitedUsers: boolean;
    unlimitedBookings: boolean;
  };
}

export function StripeCard() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Consultas tRPC
  const { data: currentSubscription, refetch: refetchSubscription } = api.subscription.getCurrentSubscription.useQuery();
  const { data: connectionStatus } = api.stripe.testConnection.useQuery();

  // Mutations
  const createCheckoutSession = api.stripe.createCheckoutSession.useMutation();
  const cancelSubscription = api.stripe.cancelSubscription.useMutation();

  // Planos disponíveis
  const plans: Plan[] = [
    {
      id: 1,
      name: "Starter",
      type: "starter",
      price: 29.90,
      features: [
        "Até 30 agendamentos por mês",
        "Análise de desempenho básica",
        "Métricas básicas",
        "Gestão de clientes",
        "Serviços ilimitados"
      ],
      limits: {
        monthlyBookings: 30,
        maxUsers: 1,
        whatsappIntegration: false,
        advancedAnalytics: false,
        customTheme: false,
        unlimitedUsers: false,
        unlimitedBookings: false
      }
    },
    {
      id: 2,
      name: "Pro",
      type: "pro",
      price: 79.90,
      features: [
        "Agendamentos ilimitados",
        "Integração via WhatsApp",
        "Análises aprofundadas",
        "Relatórios avançados",
        "Configuração de tema",
        "Gerenciamento de usuários",
        "Usuários ilimitados"
      ],
      limits: {
        monthlyBookings: -1,
        maxUsers: -1,
        whatsappIntegration: true,
        advancedAnalytics: true,
        customTheme: true,
        unlimitedUsers: true,
        unlimitedBookings: true
      }
    }
  ];

  const handleSelectPlan = async (plan: Plan) => {
    try {
      setIsProcessing(true);
      setSelectedPlan(plan);

      // Criar sessão de checkout do Stripe
      const session = await createCheckoutSession.mutateAsync({
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        description: `Assinatura do plano ${plan.name} - Buzz SaaS`,
      });

      if (session.success && session.url) {
        // Redirecionar para o checkout do Stripe
        window.location.href = session.url;
      } else {
        throw new Error("Erro ao criar sessão de checkout");
      }

    } catch (error) {
      console.error("Erro ao processar plano:", error);
      toast({
        title: "Erro ao processar pagamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      if (!currentSubscription?.stripeSubscriptionId) {
        toast({
          title: "Erro",
          description: "ID da assinatura não encontrado",
          variant: "destructive",
        });
        return;
      }

      setIsProcessing(true);
      
      await cancelSubscription.mutateAsync({
        subscriptionId: currentSubscription.stripeSubscriptionId,
      });
      
      toast({
        title: "Assinatura cancelada",
        description: "Sua assinatura será cancelada no final do período atual",
      });
      
      await refetchSubscription();
    } catch (error) {
      console.error("Erro ao cancelar assinatura:", error);
      toast({
        title: "Erro ao cancelar assinatura",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-blue-600" />
          <CardTitle>Planos e Assinaturas</CardTitle>
        </div>
        <CardDescription>
          Gerencie sua assinatura e acesse recursos premium com Stripe
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Status da Integração */}
        {/**
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Status da Integração</h3>
            <div className="flex items-center gap-2">
              {connectionStatus?.success ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <Badge variant="outline" className="border-green-200 text-green-700">
                    Conectado
                  </Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <Badge variant="outline" className="border-red-200 text-red-700">
                    Desconectado
                  </Badge>
                </>
              )}
            </div>
          </div>

          {connectionStatus?.success && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Stripe configurado e funcionando corretamente.
                Pagamentos processados com segurança.
              </AlertDescription>
            </Alert>
          )}
        </div>
        */}
        <Separator />

        {/* Plano Atual */}
        {currentSubscription && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Plano Atual</h3>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-yellow-600" />
                    <h4 className="font-semibold text-lg">
                      Plano {currentSubscription?.planName}
                    </h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Status: {currentSubscription?.status === 'active' ? 'Ativo' : 'Inativo'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Renovação: {currentSubscription?.endDate ? new Date(currentSubscription.endDate).toLocaleDateString('pt-BR') : 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    R$ {currentSubscription?.planPrice?.toFixed(2) ?? '0.00'}
                  </p>
                  <p className="text-sm text-muted-foreground">por mês</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleCancelSubscription}
                  disabled={isProcessing}
                >
                  Cancelar Assinatura
                </Button>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Planos Disponíveis */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Planos Disponíveis</h3>
          <div className="grid gap-6 md:grid-cols-2">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`flex flex-col ${
                  selectedPlan?.id === plan.id ? "border-primary" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h4 className="text-xl font-bold">{plan.name}</h4>
                    {plan.type === "pro" && (
                      <Badge variant="default" className="bg-blue-600 text-white">
                        Popular
                      </Badge>
                    )}
                  </div>
                  <p className="text-3xl font-bold">
                    R$ {plan.price.toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">
                      /mês
                    </span>
                  </p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    {currentSubscription?.planType === plan.type ? (
                      <Button disabled className="w-full">
                        Plano Atual
                      </Button>
                    ) : (
                      <Button
                        onClick={() => handleSelectPlan(plan)}
                        disabled={isProcessing || !connectionStatus?.success}
                        className="w-full"
                        variant={plan.type === 'pro' ? 'default' : 'outline'}
                      >
                        {isProcessing ? 'Processando...' : `Assinar ${plan.name}`}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 