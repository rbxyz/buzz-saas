import { pgTable, pgSequence, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const businessType = pgEnum("business_type", ['barbershop', 'freelancer', 'healthcare'])
export const diasSemana = pgEnum("dias_semana", ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'])
export const linkTypeEnum = pgEnum("link_type_enum", ['cliente', 'parceria'])
export const messageRole = pgEnum("message_role", ['user', 'assistant', 'system', 'bot', 'tool'])
export const paymentStatusEnum = pgEnum("payment_status_enum", ['pending', 'approved', 'rejected', 'cancelled'])
export const planTypeEnum = pgEnum("plan_type_enum", ['starter', 'pro'])
export const subscriptionStatusEnum = pgEnum("subscription_status_enum", ['active', 'inactive', 'cancelled', 'expired', 'past_due'])
export const userRoleEnum = pgEnum("user_role_enum", ['superadmin', 'admin'])

export const messagesIdSeq = pgSequence("messages_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const servicosIdSeq = pgSequence("servicos_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const usersIdSeq = pgSequence("users_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const plansIdSeq = pgSequence("plans_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const subscriptionsIdSeq = pgSequence("subscriptions_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const paymentsIdSeq = pgSequence("payments_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const mercadoPagoConfigIdSeq = pgSequence("mercado_pago_config_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const companiesIdSeq = pgSequence("companies_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const agendamentosIdSeq = pgSequence("agendamentos_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const clientesIdSeq = pgSequence("clientes_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const configuracoesIdSeq = pgSequence("configuracoes_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const conversationsIdSeq = pgSequence("conversations_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })
export const intervalosTrabalhoIdSeq = pgSequence("intervalos_trabalho_id_seq", {  startWith: "1", increment: "1", minValue: "1", maxValue: "2147483647", cache: "1", cycle: false })


