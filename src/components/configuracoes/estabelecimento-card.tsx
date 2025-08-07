"use client";

import { zodResolver } from '@hookform/resolvers/zod'
import { Building, Save, AlertCircle } from 'lucide-react'
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
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api } from '@/trpc/react'

const formSchema = z.object({
  nomeEmpresa: z.string().min(1, 'O nome da empresa é obrigatório.'),
  telefone: z.string().min(1, 'O telefone é obrigatório.'),
  endereco: z.string().min(1, 'O endereço é obrigatório.'),
})

type FormData = z.infer<typeof formSchema>

export function EstabelecimentoCard() {
  const utils = api.useUtils()
  const router = useRouter()

  const { data } = api.configuracao.obterConfiguracaoCompleta.useQuery()
  const configuracao = api.configuracao.atualizarConfiguracao.useMutation()

  // Verificar se é a primeira configuração
  const isFirstTimeSetup = !data?.nomeEmpresa && !data?.telefone && !data?.endereco

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
        
        // Tratar erros específicos de validação
        if (err.message.includes('preencha os seguintes campos')) {
          return `Campos obrigatórios: ${err.message}`
        }
        
        if (err.message.includes('nome da empresa é obrigatório')) {
          return 'O nome da empresa é obrigatório.'
        }
        
        return 'Erro ao salvar alterações. Verifique se todos os campos obrigatórios estão preenchidos.'
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
          {isFirstTimeSetup 
            ? "Configure as informações básicas do seu estabelecimento. Todos os campos são obrigatórios para completar a configuração inicial."
            : "Gerencie as informações do seu estabelecimento."
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {isFirstTimeSetup && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Configure as informações básicas do seu estabelecimento para começar a usar o sistema. 
                  Todos os campos marcados com * são obrigatórios.
                </AlertDescription>
              </Alert>
            )}
            
            <FormField
              control={form.control}
              name="nomeEmpresa"
              render={({ field }) => (
                <FormItem>
                  <Label variant="required">Nome da Empresa</Label>
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
                  <Label variant="required">Telefone</Label>
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
                  <Label variant="required">Endereço</Label>
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
              onClick={() => {
                // Validação adicional antes de submeter
                const values = form.getValues()
                const hasEmptyFields = !values.nomeEmpresa?.trim() || !values.telefone?.trim() || !values.endereco?.trim()
                
                if (hasEmptyFields && isFirstTimeSetup) {
                  toast.error("Campos obrigatórios", {
                    description: "Para completar a configuração inicial, preencha todos os campos obrigatórios.",
                    duration: 4000,
                  })
                }
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              {isFirstTimeSetup ? 'Completar Configuração' : 'Salvar Alterações'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
} 