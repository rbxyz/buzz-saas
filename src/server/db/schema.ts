import { sql } from "drizzle-orm"
import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  json,
  varchar,
  pgEnum,
  customType,
  numeric,
  boolean,
  integer,
} from "drizzle-orm/pg-core"

// 🔧 Tipo personalizado para campos binários (ex: imagens)
export const bytea = customType<{ data: Uint8Array }>({
  dataType() {
    return "bytea"
  },
})

// 🔗 Enum para o tipo de link no Linktree
export const linkTypeEnum = pgEnum("link_type_enum", ["cliente", "parceria"])

// 💰 Enum para tipos de valor (usado futuramente em serviços com valor fixo)
export const valorTipoEnum = pgEnum("valor_tipo_enum", ["padrao", "premium", "personalizado"])

// Enum para dias da semana (domingo a sábado)
export const diasSemanaEnum = pgEnum("dias_semana", [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
])

// NOVO: Enum para turnos
export const turnoEnum = pgEnum("turno_enum", ["manha", "tarde", "noite"])

// 🧩 Tabela de Clientes
export const clientes = pgTable("clientes", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  dataNascimento: date("data_nascimento"),
  email: text("email"),
  telefone: varchar("telefone", { length: 20 }).notNull(),
  comprasRecentes: json("compras_recentes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// 🗓️ Tabela de Agendamentos
export const agendamentos = pgTable("agendamentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  clienteId: uuid("cliente_id").notNull().references(() => clientes.id),
  dataHora: timestamp("data_hora").notNull(),
  servico: text("servico").notNull(),
  status: text("status", {
    enum: ["agendado", "cancelado", "concluido"],
  }).notNull(),
  valorCobrado: numeric("valor_cobrado", { precision: 10, scale: 2 }).$type<number>(),
  // NOVO: Campo para duração do serviço
  duracaoMinutos: integer("duracao_minutos").notNull().default(30),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// NOVA: Tabela de Intervalos de Trabalho
export const intervalosTrabalho = pgTable("intervalos_trabalho", {
  id: uuid("id").primaryKey().defaultRandom(),
  diaSemana: diasSemanaEnum("dia_semana").notNull(),
  horaInicio: text("hora_inicio").notNull(), // Ex: "08:00"
  horaFim: text("hora_fim").notNull(), // Ex: "12:00"
  turno: turnoEnum("turno").notNull(),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// ⚙️ Tabela de Configurações
export const configuracoes = pgTable("configuracoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull().default(""),
  telefone: text("telefone").notNull().default(""),
  endereco: text("endereco").notNull().default(""),
  dias: diasSemanaEnum("dias")
    .array()
    .notNull()
    .default(sql`ARRAY['segunda','terca','quarta','quinta','sexta']::dias_semana[]`),
  horaInicio: text("hora_inicio").notNull().default("09:00"),
  horaFim: text("hora_fim").notNull().default("18:00"),
  horariosPersonalizados: json("horarios_personalizados").notNull().default(sql`'[]'::jsonb`),
  instanceId: text("instance_id").notNull().default(""),
  token: text("token").notNull().default(""),
  whatsappAtivo: boolean("whatsapp_ativo").notNull().default(false),
  modoTreinoAtivo: boolean("modo_treino_ativo").notNull().default(false),
  contextoIA: text("contexto_ia").notNull().default(""),
  dadosIA: text("dados_ia").notNull().default(""),
  servicos: json("servicos").notNull().default("[]"), // Array JSON com { nome, preco, duracaoMinutos }
  diasAntecedenciaAgendamento: integer("dias_antecedencia_agendamento").notNull().default(30),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// 🔗 Tabela de Links (Linktree / Parcerias)
export const links = pgTable("links", {
  id: uuid("id").primaryKey().defaultRandom(),
  titulo: text("titulo").notNull(),
  url: text("url"),
  descricao: text("descricao").default(""),
  clienteId: uuid("cliente_id").references(() => clientes.id),
  tipo: linkTypeEnum("tipo").notNull(),
  imagem: bytea("imagem"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// 📊 Tabela de Relatórios
export const relatorios = pgTable("relatorios", {
  id: uuid("id").primaryKey().defaultRandom(),
  tipo: text("tipo").notNull(),
  payload: json("payload"),
  geradoEm: timestamp("gerado_em").defaultNow(),
})