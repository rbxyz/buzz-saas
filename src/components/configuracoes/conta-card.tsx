"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Key, Save, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const contaSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  senhaAtual: z.string().optional(),
  novaSenha: z.string().optional(),
  confirmarSenha: z.string().optional(),
}).refine((data) => {
  if (data.novaSenha || data.confirmarSenha) {
    return data.senhaAtual && data.novaSenha && data.confirmarSenha && 
           data.novaSenha === data.confirmarSenha && data.novaSenha.length >= 6;
  }
  return true;
}, {
  message: "Para alterar a senha, preencha todos os campos de senha e certifique-se de que a nova senha tenha pelo menos 6 caracteres",
  path: ["novaSenha"],
});

type ContaFormData = z.infer<typeof contaSchema>;

export function ContaCard() {
  const [isLoading, setIsLoading] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
    reset,
  } = useForm<ContaFormData>({
    resolver: zodResolver(contaSchema),
    defaultValues: {
      nome: "Administrador",
      email: "admin@buzz-saas.com",
      senhaAtual: "",
      novaSenha: "",
      confirmarSenha: "",
    },
  });

  const novaSenha = watch("novaSenha");
  const confirmarSenha = watch("confirmarSenha");

  const onSubmit = async (data: ContaFormData) => {
    setIsLoading(true);
    
    try {
      // Simular chamada API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Dados atualizados",
        description: "Suas informações foram salvas com sucesso.",
      });

      // Reset password fields
      if (isChangingPassword) {
        reset({
          ...data,
          senhaAtual: "",
          novaSenha: "",
          confirmarSenha: "",
        });
        setIsChangingPassword(false);
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: "Não foi possível atualizar suas informações. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="interactive-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-heading-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light/30">
            <User className="h-4 w-4 text-brand-primary" />
          </div>
          Informações da Conta
        </CardTitle>
        <CardDescription>
          Gerencie suas informações pessoais e preferências de segurança
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome" variant="required">
                Nome Completo
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="nome"
                  {...register("nome")}
                  className="pl-10"
                  placeholder="Digite seu nome completo"
                />
              </div>
              {errors.nome && (
                <p className="text-caption text-destructive">{errors.nome.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" variant="required">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  className="pl-10"
                  placeholder="seu@email.com"
                />
              </div>
              {errors.email && (
                <p className="text-caption text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Seção de Senha */}
          <div className="space-y-4 border-t border-subtle pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-body font-medium text-foreground">Alterar Senha</h4>
                <p className="text-body-small text-muted-foreground mt-1">
                  {isChangingPassword ? "Preencha os campos abaixo para alterar sua senha" : "Manter sua senha sempre atualizada é importante para a segurança"}
                </p>
              </div>
              {!isChangingPassword && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsChangingPassword(true)}
                  className="shrink-0"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Alterar Senha
                </Button>
              )}
            </div>

            {isChangingPassword && (
              <div className="space-y-4 rounded-lg border border-subtle bg-muted/30 p-4">
                <div className="space-y-2">
                  <Label htmlFor="senhaAtual" variant="required">
                    Senha Atual
                  </Label>
                  <Input
                    id="senhaAtual"
                    type="password"
                    {...register("senhaAtual")}
                    placeholder="Digite sua senha atual"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="novaSenha" variant="required">
                      Nova Senha
                    </Label>
                    <Input
                      id="novaSenha"
                      type="password"
                      {...register("novaSenha")}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmarSenha" variant="required">
                      Confirmar Nova Senha
                    </Label>
                    <Input
                      id="confirmarSenha"
                      type="password"
                      {...register("confirmarSenha")}
                      placeholder="Confirme a nova senha"
                      className={cn(
                        novaSenha && confirmarSenha && novaSenha !== confirmarSenha && "border-destructive focus:ring-destructive"
                      )}
                    />
                  </div>
                </div>

                {errors.novaSenha && (
                  <p className="text-caption text-destructive">{errors.novaSenha.message}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsChangingPassword(false);
                      reset();
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-between pt-4 border-t border-subtle">
            <p className="text-caption text-muted-foreground">
              {isDirty ? "Você tem alterações não salvas" : "Todas as alterações foram salvas"}
            </p>
            
            <Button 
              type="submit" 
              disabled={!isDirty || isLoading}
              className="min-w-24"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
