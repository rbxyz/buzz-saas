"use client";

import { zodResolver } from '@hookform/resolvers/zod'
import { Building, Save } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { api } from '@/trpc/react'

const formSchema = z.object({
  nomeEmpresa: z.string().min(1, 'O nome da empresa é obrigatório.'),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

export function EstabelecimentoCard() {
  const utils = api.useUtils()
  const router = useRouter()

  const { data } = api.configuracao.obterConfiguracaoCompleta.useQuery()
  const configuracao = api.configuracao.atualizarConfiguracao.useMutation()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nomeEmpresa: '',
      telefone: '',
      endereco: '',
    },
  })

  const onSubmit = (formData: FormData) => {
    const promise = configuracao.mutateAsync(formData)
    void toast.promise(promise, {
      loading: 'Salvando alterações...',
      success: () => {
        void utils.configuracao.obterConfiguracaoCompleta.invalidate()
        router.refresh()
        return 'Alterações salvas com sucesso!'
      },
      error: (err: Error) => {
        console.error('Erro ao atualizar configuração:', err)
        return 'Erro ao salvar alterações.'
      },
    })
  }

  useEffect(() => {
    if (data) {
      form.reset({
        nomeEmpresa: data.nomeEmpresa ?? '',
        telefone: data.telefone ?? '',
        endereco: data.endereco ?? '',
      })
    }
  }, [data, form])

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Building className="mr-2 inline-block h-5 w-5" />
          Estabelecimento
        </CardTitle>
        <CardDescription>
          Gerencie as informações do seu estabelecimento.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="nomeEmpresa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Empresa</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Barbearia do Zé" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(99) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endereco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Rua, número, bairro, cidade"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              variant="secondary"
              disabled={!form.formState.isDirty || configuracao.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
} 