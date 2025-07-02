import { type CoreMessage, generateText, tool, type ToolCall } from "ai";
import { groq } from "@ai-sdk/groq";
import { z } from "zod";
import { db } from "@/server/db";
import { agendamentos, clientes, configuracoes, servicos as servicosSchema } from "@/server/db/schema";
import { and, eq, gte } from "drizzle-orm";
import dayjs from "dayjs";
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { createOpenAI } from '@ai-sdk/openai';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("America/Sao_Paulo");

const openAIWithGroq = createOpenAI({
    apiKey: process.env.GROQ_API_KEY!,
    baseURL: 'https://api.groq.com/openai/v1',
});

const model = openAIWithGroq("gemma2-9b-it");

// --- 1. Definição das Ferramentas (Tools) ---
const tools: any = {
    // Ferramenta para listar horários disponíveis
    listar_horarios_disponiveis: {
        description: "Verifica e lista os horários de agendamento disponíveis para uma data específica e um serviço. Use isso quando o cliente perguntar sobre 'horários livres', 'vagas', 'disponibilidade', etc.",
        parameters: z.object({
            data: z.string().describe("A data para a verificação, no formato AAAA-MM-DD."),
            servico: z.string().describe("O nome do serviço que o cliente deseja. Ex: 'Corte de cabelo', 'Barba'.")
        }),
        execute: async ({ data, servico }: { data: string, servico: string }) => {
            try {
                console.log(`🤖 [Tool] Executando listar_horarios_disponiveis para ${data} e serviço ${servico}...`);
                const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
                const resp = await fetch(`${baseUrl}/api/webhooks/listar-horarios?data=${data}&servico=${servico}`);
                if (!resp.ok) {
                    return { success: false, error: "Falha ao buscar horários." };
                }
                const dataResp = await resp.json();
                return dataResp;
            } catch (error) {
                console.error("Erro na ferramenta listar_horarios_disponiveis:", error);
                return { success: false, error: "Ocorreu um erro interno ao buscar os horários." };
            }
        },
    },

    // Ferramenta para listar serviços disponíveis
    listar_servicos: {
        description: "Lista todos os serviços disponíveis com preços e duração. Use quando o cliente perguntar 'que serviços fazem?', 'qual o preço?', 'quanto custa?', etc.",
        parameters: z.object({}),
        execute: async () => {
            console.log(`🤖 [Tool] Executando listar_servicos...`);
            const servicosAtivos = await db
                .select({
                    nome: servicosSchema.nome,
                    preco: servicosSchema.preco,
                    duracao: servicosSchema.duracao,
                    descricao: servicosSchema.descricao,
                })
                .from(servicosSchema)
                .where(eq(servicosSchema.ativo, true));

            return { servicos: servicosAtivos };
        }
    },

    // Ferramenta para consultar os agendamentos de um cliente
    consultar_meus_agendamentos: {
        description: "Consulta os agendamentos futuros de um cliente. Use quando o cliente perguntar 'meus horários', 'quando eu tenho horário', 'meus agendamentos', etc.",
        parameters: z.object({
            telefoneCliente: z.string().describe("O número de telefone do cliente para a consulta."),
        }),
        execute: async ({ telefoneCliente }: { telefoneCliente: string }) => {
            console.log(`🤖 [Tool] Executando consultar_meus_agendamentos para ${telefoneCliente}...`);
            const agendamentosFuturos = await db
                .select({
                    servico: agendamentos.servico,
                    dataHora: agendamentos.dataHora,
                })
                .from(agendamentos)
                .leftJoin(clientes, eq(agendamentos.clienteId, clientes.id))
                .where(
                    and(
                        eq(clientes.telefone, telefoneCliente.replace(/\D/g, "")),
                        gte(agendamentos.dataHora, dayjs().startOf('day').toDate()),
                        eq(agendamentos.status, "agendado")
                    )
                )
                .orderBy(agendamentos.dataHora);

            return { agendamentos: agendamentosFuturos };
        }
    },

    // Ferramenta para buscar informações gerais da empresa
    buscar_informacoes_empresa: {
        description: "Busca informações gerais sobre a empresa, como endereço, telefone de contato ou horários de funcionamento. Use quando o cliente perguntar 'onde fica', 'qual o endereço', 'qual o telefone', 'até que horas abre', etc.",
        parameters: z.object({}),
        execute: async () => {
            console.log(`🤖 [Tool] Executando buscar_informacoes_empresa...`);
            const config = await db.select().from(configuracoes).limit(1).then(r => r[0]);
            return {
                nomeEmpresa: config?.nomeEmpresa,
                endereco: config?.endereco,
                telefone: config?.telefone,
            };
        }
    },

    // Ferramenta para criar o agendamento
    criar_agendamento: {
        description: "Cria um novo agendamento para o cliente após ter confirmado todos os detalhes (serviço, data, horário e nome).",
        parameters: z.object({
            telefone: z.string().describe("Número de telefone do cliente."),
            nome: z.string().describe("Nome do cliente."),
            servico: z.string().describe("Nome do serviço a ser agendado."),
            data: z.string().describe("Data do agendamento no formato AAAA-MM-DD."),
            horario: z.string().describe("Horário do agendamento no formato HH:mm."),
        }),
        execute: async (params: any) => {
            try {
                console.log(`🤖 [Tool] Executando criar_agendamento com os parâmetros:`, params);
                const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
                const resp = await fetch(`${baseUrl}/api/webhooks/criar-agendamento`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(params),
                });
                const dataResp = await resp.json();
                return dataResp;
            } catch (error) {
                console.error("Erro na ferramenta criar_agendamento:", error);
                return { success: false, error: "Ocorreu um erro interno ao criar o agendamento." };
            }
        }
    }
};

// --- 2. Definição do Prompt de Sistema ---
const systemPrompt = `
Você é um assistente de agendamentos para uma barbearia. Seu nome é Buzz.
Sua personalidade é AMIGÁVEL e CASUAL. Use gírias leves como "fechou", "bora", "top", e emojis de forma natural (😊, 👍, 😄, 🚀).

**SUA REGRA DE OURO:**
- **SEMPRE ESCLAREÇA AMBIGUIDADES!** Antes de usar uma ferramenta, se a informação não estiver 100% clara, faça uma pergunta para confirmar.

**GUIA DE INTERPRETAÇÃO DE PERGUNTAS:**

🔍 **Consultar agendamentos existentes** (use: consultar_meus_agendamentos)
- "Meus horários", "quando eu tenho marcado", "meus agendamentos"
- "Que horas é meu corte?", "quando é minha barba?"

📅 **Verificar horários disponíveis** (use: listar_horarios_disponiveis)
- "Que horários tem livre?", "horários disponíveis", "tem vaga?"
- "Quero marcar", "posso agendar?", "tem horário para..."

✂️ **Listar serviços** (use: listar_servicos)
- "Que serviços fazem?", "qual o preço?", "quanto custa?"
- "O que vocês oferecem?", "lista de serviços", "cardápio"

🏪 **Informações da empresa** (use: buscar_informacoes_empresa)
- "Onde fica?", "qual o endereço?", "que horas abre/fecha?"
- "Qual o telefone?", "como entro em contato?"

📝 **Criar agendamento** (use: criar_agendamento)
- APENAS depois de confirmar: serviço, data, horário e nome
- Sempre confirme antes: "Pode confirmar? Serviço X, dia Y às Z horas?"

**TRATAMENTO DE AMBIGUIDADES:**
- "Tem horário amanhã?" → "Você quer ver seus horários JÁ MARCADOS para amanhã ou quer ver os horários LIVRES para um novo agendamento? 😊"
- "Qual o endereço?" → Use buscar_informacoes_empresa diretamente
- "Quero agendar" sem detalhes → Pergunte sobre serviço, data e horário preferido
- "Quanto custa?" → Use listar_servicos para mostrar todos os preços

**COMO RESPONDER:**
1. **Seja natural e conversacional** - não apenas liste dados, explique o que significam
2. **Use contexto** - se alguém pergunta "e amanhã?" considere a conversa anterior
3. **Seja prestativo** - ofereça alternativas quando algo não estiver disponível
4. **Confirme detalhes importantes** - especialmente para agendamentos

**INFORMAÇÕES ADICIONAIS:**
- Data de hoje: ${dayjs().format('DD/MM/YYYY, dddd')}
- Se não souber algo: "Opa, não tenho essa info no sistema! Mas se quiser, liga pra gente que o pessoal te ajuda rapidinho! 😊"
- Para agendamentos: SEMPRE confirme todos os detalhes antes de criar
`;

interface AgentResponse {
    finalAnswer: CoreMessage;
    toolCalls?: ToolCall<any, any>[];
    toolResults?: CoreMessage[];
}

// --- 3. Função Principal de Processamento ---
class AgentService {
    async processMessage(
        history: CoreMessage[],
        telefone: string,
        nomeContato: string
    ): Promise<AgentResponse> {
        console.log(`🤖 [Agent] Processando mensagem para ${telefone}...`);

        const { text, toolCalls } = await generateText({
            model,
            system: systemPrompt,
            messages: history,
            tools,
            temperature: 0.2,
            maxTokens: 1000,
        });

        if (toolCalls && toolCalls.length > 0) {
            const toolCallMessages: CoreMessage[] = toolCalls.map(toolCall => ({
                role: 'assistant',
                content: '',
                toolCalls: [toolCall]
            }));

            const toolResultMessages: CoreMessage[] = [];

            for (const call of toolCalls) {
                try {
                    let params = call.args;

                    if (call.toolName === 'consultar_meus_agendamentos') {
                        params = { telefoneCliente: telefone };
                    } else if (call.toolName === 'criar_agendamento') {
                        params = { ...call.args, telefone, nome: nomeContato };
                    }

                    console.log(`🛠️ [Tool] Executando ${call.toolName} com parâmetros:`, params);
                    const result = await (tools[call.toolName as keyof typeof tools] as any).execute(params);

                    toolResultMessages.push({
                        role: 'tool',
                        content: [
                            {
                                type: 'tool-result',
                                toolCallId: call.toolCallId,
                                toolName: call.toolName,
                                result: result,
                            },
                        ],
                    });
                } catch (error) {
                    console.error(`💥 [Tool] Erro ao executar ${call.toolName}:`, error);
                    toolResultMessages.push({
                        role: 'tool',
                        content: [
                            {
                                type: 'tool-result',
                                toolCallId: call.toolCallId,
                                toolName: call.toolName,
                                result: { error: `Erro na ferramenta ${call.toolName}` },
                            },
                        ],
                    });
                }
            }

            const allMessages = [...history, ...toolCallMessages, ...toolResultMessages];

            const { text: finalText } = await generateText({
                model,
                system: systemPrompt,
                messages: allMessages,
                temperature: 0.2,
                maxTokens: 1000,
            });

            return {
                finalAnswer: { role: 'assistant', content: finalText ?? "" },
                toolCalls: toolCalls,
                toolResults: toolResultMessages,
            };
        }

        return {
            finalAnswer: { role: 'assistant', content: text ?? "" }
        };
    }
}

export const agentService = new AgentService(); 