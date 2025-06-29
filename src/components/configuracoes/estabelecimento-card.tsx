"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/trpc/react";
import { Building, Save } from "lucide-react";

// Schema de validação com Zod
const schema = z.object({
  nomeEmpresa: z.string().min(1, "O nome da empresa é obrigatório."),
  telefone: z.string().min(10, "O telefone deve ter pelo menos 10 dígitos."),
  endereco: z.string().min(5, "O endereço é obrigatório."),
});

type FormData = z.infer<typeof schema>;

export function EstabelecimentoCard() {
  const { toast } = useToast();
  const utils = api.useContext();

  // Query para buscar os dados
  const { data: config, isLoading: isLoadingConfig } =
    api.configuracao.obterConfiguracaoCompleta.useQuery();

  // Mutation para atualizar
  const { mutate: atualizarConfig, isPending: isSaving } =
    api.configuracao.atualizarConfiguracao.useMutation({
      onSuccess: () => {
        toast({
          title: "Sucesso!",
          description: "As informações do estabelecimento foram salvas.",
        });
        utils.configuracao.obterConfiguracaoCompleta.invalidate();
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Erro ao salvar",
          description:
            error.message ||
            "Não foi possível salvar as informações. Tente novamente.",
        });
      },
    });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nomeEmpresa: "",
      telefone: "",
      endereco: "",
    },
  });

  // Preencher o formulário quando os dados chegam da API
  useEffect(() => {
    if (config) {
      reset({
        nomeEmpresa: config.nomeEmpresa || "",
        telefone: config.telefone || "",
        endereco: config.endereco || "",
      });
    }
  }, [config, reset]);

  const onSubmit = (data: FormData) => {
    atualizarConfig(data);
  };

  if (isLoadingConfig) {
    return (
      <Card>
        <CardHeader>
          <div className="h-8 w-48 rounded bg-muted/50 animate-pulse" />
          <div className="h-4 w-64 rounded bg-muted/50 animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-10 w-full rounded bg-muted/50 animate-pulse" />
          <div className="h-10 w-full rounded bg-muted/50 animate-pulse" />
          <div className="h-10 w-full rounded bg-muted/50 animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="interactive-hover">
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-heading-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-light/30">
              <Building className="h-4 w-4 text-brand-primary" />
            </div>
            Estabelecimento
          </CardTitle>
          <CardDescription>
            Gerencie as informações principais do seu negócio.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Nome da Empresa */}
          <div>
            <Label htmlFor="nomeEmpresa">Nome da Empresa</Label>
            <Controller
              name="nomeEmpresa"
              control={control}
              render={({ field }) => (
                <Input
                  id="nomeEmpresa"
                  placeholder="Ex: Barbearia do Zé"
                  {...field}
                />
              )}
            />
            {errors.nomeEmpresa && (
              <p className="mt-1 text-sm text-destructive">
                {errors.nomeEmpresa.message}
              </p>
            )}
          </div>

          {/* Telefone */}
          <div>
            <Label htmlFor="telefone">Telefone</Label>
            <Controller
              name="telefone"
              control={control}
              render={({ field }) => (
                <Input
                  id="telefone"
                  placeholder="(99) 99999-9999"
                  {...field}
                />
              )}
            />
            {errors.telefone && (
              <p className="mt-1 text-sm text-destructive">
                {errors.telefone.message}
              </p>
            )}
          </div>

          {/* Endereço */}
          <div>
            <Label htmlFor="endereco">Endereço</Label>
            <Controller
              name="endereco"
              control={control}
              render={({ field }) => (
                <Input
                  id="endereco"
                  placeholder="Rua das Flores, 123"
                  {...field}
                />
              )}
            />
            {errors.endereco && (
              <p className="mt-1 text-sm text-destructive">
                {errors.endereco.message}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="secondary"
              disabled={isSaving || !isDirty}
              className="gap-2"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
} 