import { db } from "@/server/db"
import {
    servicos,
    intervalosTrabalho,
    agendamentos,
    clientes,
    users,
} from "@/server/db/schema"
import { and, eq, gte, like, lt } from "drizzle-orm"
import dayjs from "dayjs"
import utc from "dayjs/plugin/utc"
import timezone from "dayjs/plugin/timezone"

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.tz.setDefault("America/Sao_Paulo")

/**
 * Lista todos os serviços ativos no banco de dados.
 */
export async function listarServicosDisponiveis() {
    console.log("Executando Ação: listarServicosDisponiveis")
    const listaServicos = await db
        .select({
            nome: servicos.nome,
            descricao: servicos.descricao,
            preco: servicos.preco,
            duracao: servicos.duracao,
        })
        .from(servicos)
        .where(eq(servicos.ativo, true))

    if (listaServicos.length === 0) {
        return "Nenhum serviço disponível no momento."
    }

    return listaServicos
        .map(
            (s) =>
                `- ${s.nome} (Duração: ${s.duracao} min, Preço: R$${s.preco})`,
        )
        .join("\n")
}

/**
 * Verifica os horários disponíveis para um serviço específico em uma data.
 * @param nomeServico O nome do serviço desejado.
 * @param dataString A data para a verificação (formato YYYY-MM-DD).
 * @param preco O preço do serviço para desambiguar serviços que tenham o mesmo nome.
 * @returns Uma lista de horários disponíveis ou uma mensagem de erro.
 */
export async function listarHorariosDisponiveis(
    nomeServico: string,
    dataString: string,
    preco?: number,
) {
    console.log(
        `Executando Ação: listarHorariosDisponiveis para '${nomeServico}' em '${dataString}' (Preço: ${preco ?? 'N/A'})`,
    )
    const data = dayjs.tz(dataString)
    const diaSemana = data.day()

    // 1. Buscar o serviço e sua duração
    const baseConditions = [
        eq(servicos.ativo, true),
        like(servicos.nome, `%${nomeServico}%`),
    ]

    const servicosEncontrados = await db
        .select({
            nome: servicos.nome,
            preco: servicos.preco,
            duracao: servicos.duracao
        })
        .from(servicos)
        .where(and(...baseConditions));

    if (servicosEncontrados.length > 1 && !preco) {
        const precos = servicosEncontrados.map(s => `R$${s.preco}`).join(', ');
        return `Existem vários serviços chamados "${nomeServico}". Por favor, especifique qual deles você deseja pelo preço. Opções: ${precos}.`;
    }

    const finalConditions = [...baseConditions];
    if (preco) {
        finalConditions.push(eq(servicos.preco, preco.toFixed(2)))
    }

    const [servico] = await db
        .select({ duracao: servicos.duracao })
        .from(servicos)
        .where(and(...finalConditions))
        .limit(1)

    if (!servico) {
        if (preco) {
            return `Serviço "${nomeServico}" com preço R$${preco.toFixed(2)} não encontrado ou inativo.`
        } else {
            return `Serviço "${nomeServico}" não encontrado ou inativo.`
        }
    }
    const duracaoServico = servico.duracao

    // 2. Buscar os intervalos de trabalho para o dia da semana
    const intervalos = await db
        .select()
        .from(intervalosTrabalho)
        .where(
            and(
                eq(intervalosTrabalho.diaSemana, diaSemana),
                eq(intervalosTrabalho.ativo, true),
            ),
        )

    if (intervalos.length === 0) {
        return "Não há horários de trabalho definidos para este dia."
    }

    // 3. Buscar todos os agendamentos para o dia
    const inicioDia = data.startOf("day").toDate()
    const fimDia = data.endOf("day").toDate()
    const agendamentosDoDia = await db
        .select()
        .from(agendamentos)
        .where(
            and(
                gte(agendamentos.dataHora, inicioDia),
                lt(agendamentos.dataHora, fimDia),
            ),
        )

    // 4. Calcular os horários disponíveis
    const horariosDisponiveis: string[] = []
    const agora = dayjs.tz()

    for (const intervalo of intervalos) {
        let slotAtual = dayjs.tz(
            `${dataString}T${intervalo.horaInicio}`,
            "YYYY-MM-DDTHH:mm",
        )
        const fimIntervalo = dayjs.tz(
            `${dataString}T${intervalo.horaFim}`,
            "YYYY-MM-DDTHH:mm",
        )

        while (slotAtual.add(duracaoServico, "minutes").isBefore(fimIntervalo)) {
            if (slotAtual.isAfter(agora)) {
                const slotFim = slotAtual.add(duracaoServico, "minutes")
                const conflito = agendamentosDoDia.some((ag) => {
                    const agInicio = dayjs(ag.dataHora)
                    const agFim = agInicio.add(ag.duracaoMinutos, "minutes")
                    return slotAtual.isBefore(agFim) && slotFim.isAfter(agInicio)
                })

                if (!conflito) {
                    horariosDisponiveis.push(slotAtual.format("HH:mm"))
                }
            }
            slotAtual = slotAtual.add(15, "minutes") // Intervalo entre slots
        }
    }

    if (horariosDisponiveis.length === 0) {
        return `Não há horários disponíveis para "${nomeServico}" no dia ${data.format("DD/MM")}.`
    }

    return `Horários disponíveis para "${nomeServico}" no dia ${data.format("DD/MM")}:\n- ${horariosDisponiveis.join("\n- ")}`
}

/**
 * Cria um novo agendamento no sistema.
 * @param nomeServico O nome do serviço.
 * @param dataString A data do agendamento (YYYY-MM-DD).
 * @param horarioString O horário do agendamento (HH:mm).
 * @param telefoneCliente O telefone do cliente para associar ou criar.
 * @returns Uma mensagem de sucesso ou erro.
 */
export async function criarAgendamento(
    nomeServico: string,
    dataString: string,
    horarioString: string,
    telefoneCliente: string,
) {
    console.log(
        `Executando Ação: criarAgendamento para '${nomeServico}' em '${dataString} ${horarioString}'`,
    )
    // 1. Validar serviço usando a mesma lógica de listarHorariosDisponiveis
    const baseConditions = [
        eq(servicos.ativo, true),
        like(servicos.nome, `%${nomeServico}%`),
    ]

    const servicosEncontrados = await db
        .select()
        .from(servicos)
        .where(and(...baseConditions));

    if (servicosEncontrados.length > 1) {
        const precos = servicosEncontrados.map(s => `R$${s.preco}`).join(', ');
        return `Existem vários serviços chamados "${nomeServico}". Por favor, especifique qual deles você deseja pelo preço. Opções: ${precos}.`;
    }

    const [servico] = servicosEncontrados;
    if (!servico) return `Serviço "${nomeServico}" não encontrado.`

    // 2. Validar cliente
    const [cliente] = await db
        .select()
        .from(clientes)
        .where(eq(clientes.telefone, telefoneCliente))
        .limit(1)
    if (!cliente) {
        return "Cliente não encontrado. Por favor, peça o nome completo do cliente para que eu possa cadastrá-lo usando a ferramenta criarCliente."
    }

    // 3. Criar data do agendamento
    const dataAgendamento = dayjs
        .tz(`${dataString}T${horarioString}`, "YYYY-MM-DDTHH:mm")
        .toDate()

    // 4. Inserir agendamento
    try {
        await db.insert(agendamentos).values({
            userId: cliente.userId,
            clienteId: cliente.id,
            servicoId: servico.id,
            servico: servico.nome,
            dataHora: dataAgendamento,
            duracaoMinutos: servico.duracao,
            valorCobrado: servico.preco,
            status: "agendado",
        })
        return `Agendamento para ${servico.nome} no dia ${dataString} às ${horarioString} confirmado com sucesso!`
    } catch (error) {
        console.error("Erro ao criar agendamento:", error)
        return "Ocorreu um erro ao tentar criar o agendamento. Tente novamente."
    }
}

/**
 * Cria um novo cliente no sistema se ele não existir.
 * @param nomeCliente O nome completo do cliente.
 * @param telefoneCliente O telefone do cliente.
 * @returns Uma mensagem de sucesso ou informando que o cliente já existe.
 */
export async function criarCliente(
    nomeCliente: string,
    telefoneCliente: string,
) {
    console.log(`Executando Ação: criarCliente para '${nomeCliente}'`)

    // 1. Verificar se o cliente já existe
    const [clienteExistente] = await db
        .select()
        .from(clientes)
        .where(eq(clientes.telefone, telefoneCliente))
        .limit(1)

    if (clienteExistente) {
        return `O cliente com este número de telefone já está cadastrado como ${clienteExistente.nome}.`
    }

    // 2. Buscar o primeiro usuário para associar (regra de negócio atual)
    const [user] = await db.select({ id: users.id }).from(users).limit(1)
    if (!user) {
        return "Erro: Nenhum usuário administrador encontrado no sistema para associar o cliente."
    }

    // 3. Criar novo cliente
    try {
        await db.insert(clientes).values({
            userId: user.id,
            nome: nomeCliente,
            telefone: telefoneCliente,
        })
        return `Cliente ${nomeCliente} cadastrado com sucesso! Agora podemos prosseguir com o agendamento.`
    } catch (error) {
        console.error("Erro ao criar cliente:", error)
        return "Ocorreu um erro ao tentar cadastrar o cliente."
    }
} 