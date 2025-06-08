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
  real,
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

// Enum para turnos
export const turnoEnum = pgEnum("turno_enum", ["manha", "tarde", "noite"])

// Enum para roles de usuário
export const userRoleEnum = pgEnum("user_role_enum", ["admin", "superadmin"])

// Enum para status de conversas
export const conversationStatusEnum = pgEnum("conversation_status", ["ativa", "encerrada", "pausada"])

// Enum para remetente de mensagens
export const messageRoleEnum = pgEnum("message_role", ["cliente", "bot", "atendente"])

// Enum para tipo de mensagem
export const messageTypeEnum = pgEnum("message_type", ["texto", "imagem", "audio", "documento"])

// Tabela de Usuários
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  login: varchar("login", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull(),
  phone: varchar("phone", { length: 20 }),
  active: boolean("active").notNull().default(true),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// 🧩 Tabela de Clientes
export const clientes = pgTable("clientes", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  dataNascimento: date("data_nascimento"),
  email: text("email"),
  telefone: varchar("telefone", { length: 20 }).notNull().unique(), // Adicionado unique para evitar duplicatas
  comprasRecentes: json("compras_recentes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// 🗓️ Tabela de Agendamentos
export const agendamentos = pgTable("agendamentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  clienteId: uuid("cliente_id")
    .notNull()
    .references(() => clientes.id, { onDelete: "cascade" }), // Adicionado onDelete cascade
  dataHora: timestamp("data_hora").notNull(),
  servico: text("servico").notNull(),
  status: text("status", {
    enum: ["agendado", "cancelado", "concluido"],
  }).notNull(),
  valorCobrado: numeric("valor_cobrado", { precision: 10, scale: 2 }).$type<number>(),
  duracaoMinutos: integer("duracao_minutos").notNull().default(30),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Tabela de Intervalos de Trabalho
export const intervalosTrabalho = pgTable("intervalos_trabalho", {
  id: uuid("id").primaryKey().defaultRandom(),
  diaSemana: diasSemanaEnum("dia_semana").notNull(),
  horaInicio: text("hora_inicio").notNull(),
  horaFim: text("hora_fim").notNull(),
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
  servicos: json("servicos").notNull().default("[]"),
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
  clienteId: uuid("cliente_id").references(() => clientes.id, { onDelete: "set null" }), // Adicionado onDelete set null
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

// 🤖 TABELAS PARA IA/WHATSAPP

// Tabela de Conversas (para IA/WhatsApp)
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  clienteId: uuid("cliente_id").references(() => clientes.id, { onDelete: "set null" }),
  telefone: varchar("telefone", { length: 20 }).notNull(),
  status: conversationStatusEnum("status").notNull().default("ativa"),
  ultimaMensagem: text("ultima_mensagem"), // Texto da última mensagem
  metadata: json("metadata"), // Para dados extras como ID da conversa no WhatsApp
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),

  // Índices para melhorar performance
  // Índice para busca por telefone
  telefoneIdx: varchar("telefone_idx").references(() => conversations.telefone),
  // Índice para busca por status
  statusIdx: conversationStatusEnum("status_idx").references(() => conversations.status),
})

// Tabela de Mensagens
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }), // Adicionado onDelete cascade
  remetente: messageRoleEnum("remetente").notNull(),
  conteudo: text("conteudo").notNull(),
  tipo: messageTypeEnum("tipo").notNull().default("texto"),
  metadata: json("metadata"), // Para dados extras como ID da mensagem no WhatsApp
  createdAt: timestamp("created_at").defaultNow(),

  // Índices para melhorar performance
  // Índice para busca por conversationId
  conversationIdIdx: uuid("conversation_id_idx").references(() => messages.conversationId),
  // Índice para ordenação por data
  createdAtIdx: timestamp("created_at_idx").references(() => messages.createdAt),
})

// Tabela de Agentes de IA
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

// 💡 Tabela de Embeddings
export const embeddings = pgTable("embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  uploadId: integer("upload_id").notNull(),
  content: text("content").notNull(),
  embedding: json("embedding").notNull(), // array de números
  createdAt: timestamp("created_at").defaultNow(),
})
