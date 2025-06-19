import { pgTable, pgSequence, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const diasSemana = pgEnum("dias_semana", ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'])
export const linkTypeEnum = pgEnum("link_type_enum", ['cliente', 'parceria'])
export const messageRole = pgEnum("message_role", ['user', 'assistant', 'system', 'bot'])
export const userRoleEnum = pgEnum("user_role_enum", ['superadmin', 'admin'])

export const messagesIdSeq = pgSequence("messages_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const servicosIdSeq = pgSequence("servicos_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const usersIdSeq = pgSequence("users_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const agendamentosIdSeq = pgSequence("agendamentos_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const clientesIdSeq = pgSequence("clientes_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const configuracoesIdSeq = pgSequence("configuracoes_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const conversationsIdSeq = pgSequence("conversations_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const intervalosTrabalhoIdSeq = pgSequence("intervalos_trabalho_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })


