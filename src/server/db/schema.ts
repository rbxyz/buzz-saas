import { relations, sql } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  pgEnum,
  serial,
  text,
  timestamp,
  varchar,
  decimal,
  unique,
  real,
  uuid,
  pgTable,
} from "drizzle-orm/pg-core"

// Enums
export const userRoleEnum = pgEnum("user_role_enum", ["superadmin", "admin"])
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system", "bot"])
export const linkTypeEnum = pgEnum("link_type_enum", ["cliente", "parceria"])

// Tabela de usuários
export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    login: varchar("login", { length: 255 }).notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    role: userRoleEnum("role").default("admin").notNull(),
    phone: varchar("phone", { length: 20 }),
    active: boolean("active").default(true).notNull(),
    canDelete: boolean("can_delete").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    lastLogin: timestamp("last_login"),
  },
  (table) => ({
    emailIdx: unique().on(table.email),
    loginIdx: unique().on(table.login),
  }),
)

// Tabela de configurações
export const configuracoes = pgTable(
  "configuracoes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    nomeEmpresa: varchar("nome_empresa", { length: 255 }),
    telefone: varchar("telefone", { length: 255 }),
    endereco: text("endereco"),
    logoUrl: text("logo_url"), // URL ou base64 string para logo
    corPrimaria: varchar("cor_primaria", { length: 255 }).default("#3B82F6"),
    corSecundaria: varchar("cor_secundaria", { length: 255 }).default("#1E40AF"),

    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    userIdIdx: unique().on(table.userId),
  }),
)

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  modelo: varchar("modelo", { length: 50 }).default("groq/llama-3.1-8b-instant"),
  temperatura: real("temperatura").default(0.7),
  ativo: boolean("ativo").default(true),
  ultimoTreinamento: timestamp("ultimo_treinamento"),
  contadorConsultas: integer("contador_consultas").default(0),
  promptSistema: text("prompt_sistema"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Tabela de links - Imagens armazenadas como text (base64 ou URL)
export const links = pgTable("links", {
  id: uuid("id").primaryKey().defaultRandom(),
  titulo: text("titulo").notNull(),
  url: text("url"),
  descricao: text("descricao").default(""),
  clienteId: uuid("cliente_id"),
  tipo: linkTypeEnum("tipo").notNull(),
  imagem: text("imagem"), // Base64 string ou URL da imagem - EXISTE NO BANCO
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Tabela de clientes - APENAS COLUNAS QUE EXISTEM NO BANCO
export const clientes = pgTable(
  "clientes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .default(1),
    nome: varchar("nome", { length: 255 }).notNull(),
    telefone: varchar("telefone", { length: 20 }).notNull(),
    email: varchar("email", { length: 255 }),
    endereco: text("endereco"),
    observacoes: text("observacoes"),
    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    userTelefoneIdx: unique().on(table.userId, table.telefone),
    userIdx: index("clientes_user_idx").on(table.userId),
    telefoneIdx: index("clientes_telefone_idx").on(table.telefone),
  }),
)

export const servicos = pgTable(
  "servicos",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    nome: varchar("nome", { length: 255 }).notNull(),
    descricao: text("descricao"),
    preco: decimal("preco", { precision: 10, scale: 2 }),
    duracao: integer("duracao").notNull(), // em minutos
    ativo: boolean("ativo").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    userIdx: index("servicos_user_idx").on(table.userId),
    ativoIdx: index("servicos_ativo_idx").on(table.ativo),
  }),
)

// Tabela de intervalos de trabalho
export const intervalosTrabalho = pgTable(
  "intervalos_trabalho",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    diaSemana: integer("dia_semana").notNull(), // 0=Domingo, 1=Segunda, etc.
    horaInicio: varchar("hora_inicio", { length: 5 }).notNull(), // formato HH:MM
    horaFim: varchar("hora_fim", { length: 5 }).notNull(), // formato HH:MM
    ativo: boolean("ativo").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    userDiaIdx: unique().on(table.userId, table.diaSemana),
    userIdx: index("intervalos_user_idx").on(table.userId),
  }),
)

// Tabela de agendamentos
export const agendamentos = pgTable(
  "agendamentos",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull()
      .default(1),
    clienteId: integer("cliente_id")
      .references(() => clientes.id, { onDelete: "cascade" })
      .notNull(),
    servicoId: integer("servico_id").references(() => servicos.id, { onDelete: "set null" }),
    servico: varchar("servico", { length: 255 }).notNull(), // Nome do serviço
    dataHora: timestamp("data_hora", { withTimezone: true }).notNull(),
    duracaoMinutos: integer("duracao_minutos").notNull().default(30),
    valorCobrado: decimal("valor_cobrado", { precision: 10, scale: 2 }),
    status: varchar("status", { length: 50 }).default("agendado").notNull(),
    observacoes: text("observacoes"),
    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    userIdx: index("agendamentos_user_idx").on(table.userId),
    clienteIdx: index("agendamentos_cliente_idx").on(table.clienteId),
    dataHoraIdx: index("agendamentos_data_hora_idx").on(table.dataHora),
    statusIdx: index("agendamentos_status_idx").on(table.status),
  }),
)

export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    clienteId: integer("cliente_id").references(() => clientes.id, { onDelete: "cascade" }),
    telefone: varchar("telefone", { length: 20 }).notNull(),
    nomeContato: varchar("nome_contato", { length: 255 }),
    ultimaMensagem: text("ultima_mensagem"),
    ultimaInteracao: timestamp("ultima_interacao", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    ativa: boolean("ativa").default(true).notNull(),
    memoriaContext: text("memoria_context"), // Campo para armazenar a memória persistente do agente
    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    userTelefoneIdx: unique().on(table.userId, table.telefone),
    userIdx: index("conversations_user_idx").on(table.userId),
    telefoneIdx: index("conversations_telefone_idx").on(table.telefone),
    ultimaInteracaoIdx: index("conversations_ultima_interacao_idx").on(table.ultimaInteracao),
    ativaIdx: index("conversations_ativa_idx").on(table.ativa),
  }),
)

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    content: text("content").notNull(),
    role: messageRoleEnum("role").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
    messageId: varchar("message_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    conversationIdx: index("messages_conversation_idx").on(table.conversationId),
    timestampIdx: index("messages_timestamp_idx").on(table.timestamp),
    roleIdx: index("messages_role_idx").on(table.role),
    messageIdIdx: index("messages_message_id_idx").on(table.messageId),
  }),
)

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  configuracoes: one(configuracoes),
  clientes: many(clientes),
  servicos: many(servicos),
  intervalosTrabalho: many(intervalosTrabalho),
  agendamentos: many(agendamentos),
  conversations: many(conversations),
}))

export const configuracoesRelations = relations(configuracoes, ({ one }) => ({
  user: one(users, {
    fields: [configuracoes.userId],
    references: [users.id],
  }),
}))

export const clientesRelations = relations(clientes, ({ one, many }) => ({
  user: one(users, {
    fields: [clientes.userId],
    references: [users.id],
  }),
  agendamentos: many(agendamentos),
  conversations: many(conversations),
}))

export const servicosRelations = relations(servicos, ({ one, many }) => ({
  user: one(users, {
    fields: [servicos.userId],
    references: [users.id],
  }),
  agendamentos: many(agendamentos),
}))

export const intervalosTrabalhoRelations = relations(intervalosTrabalho, ({ one }) => ({
  user: one(users, {
    fields: [intervalosTrabalho.userId],
    references: [users.id],
  }),
}))

export const agendamentosRelations = relations(agendamentos, ({ one }) => ({
  user: one(users, {
    fields: [agendamentos.userId],
    references: [users.id],
  }),
  cliente: one(clientes, {
    fields: [agendamentos.clienteId],
    references: [clientes.id],
  }),
  servico: one(servicos, {
    fields: [agendamentos.servicoId],
    references: [servicos.id],
  }),
}))

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  cliente: one(clientes, {
    fields: [conversations.clienteId],
    references: [clientes.id],
  }),
  messages: many(messages),
}))

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}))

// Utilitários para conversão de dias da semana
export const DIAS_SEMANA = {
  0: "domingo",
  1: "segunda",
  2: "terca",
  3: "quarta",
  4: "quinta",
  5: "sexta",
  6: "sabado",
} as const

export const DIAS_SEMANA_REVERSE = {
  domingo: 0,
  segunda: 1,
  terca: 2,
  quarta: 3,
  quinta: 4,
  sexta: 5,
  sabado: 6,
} as const

export function diaSemanaToNumber(dia: string): number {
  return DIAS_SEMANA_REVERSE[dia as keyof typeof DIAS_SEMANA_REVERSE] ?? 0
}

export function numberToDiaSemana(num: number): string {
  return DIAS_SEMANA[num as keyof typeof DIAS_SEMANA] ?? "domingo"
}

// Utilitários para manipulação de imagens como text
export const ImageUtils = {
  // Verifica se é uma URL válida
  isUrl: (str: string): boolean => {
    try {
      new URL(str)
      return true
    } catch {
      return false
    }
  },

  // Verifica se é uma string base64 válida
  isBase64: (str: string): boolean => {
    try {
      return btoa(atob(str)) === str
    } catch {
      return false
    }
  },

  // Verifica se é uma string base64 de imagem (data URL)
  isBase64Image: (str: string): boolean => {
    return str.startsWith("data:image/") && str.includes("base64,")
  },

  // Extrai o tipo MIME de uma string base64 de imagem
  getMimeType: (base64String: string): string | null => {
    const match = /data:([^;]+);base64,/.exec(base64String)
    return match?.[1] ?? null
  },

  // Converte base64 para blob URL (para uso no frontend)
  base64ToBlob: (base64String: string): string => {
    if (!ImageUtils.isBase64Image(base64String)) {
      return base64String // Retorna como está se não for base64
    }

    const parts = base64String.split(",")
    if (parts.length !== 2) {
      return base64String // Retorna como está se formato inválido
    }

    const header = parts[0]
    const data = parts[1]

    if (!header || !data) {
      return base64String // Retorna como está se partes inválidas
    }

    const mimeMatch = /data:([^;]+);base64/.exec(header)
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg"

    try {
      const byteCharacters = atob(data)
      const byteNumbers = new Array(byteCharacters.length)

      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }

      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: mimeType })
      return URL.createObjectURL(blob)
    } catch {
      return base64String // Retorna como está se conversão falhar
    }
  },
}
