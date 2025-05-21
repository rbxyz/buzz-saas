import {
  pgTable,
  uuid,
  text,
  timestamp,
  date,
  json,
  varchar,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";

// 🧩 CLIENTES
export const clientes = pgTable("clientes", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  dataNascimento: date("data_nascimento"),
  email: text("email"),
  telefone: varchar("telefone", { length: 20 }).notNull(),
  comprasRecentes: json("compras_recentes"), // opcional, pode virar uma tabela depois
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 🗓️ AGENDAMENTOS
export const agendamentos = pgTable("agendamentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  clienteId: uuid("cliente_id").references(() => clientes.id).notNull(),
  dataHora: timestamp("data_hora").notNull(),
  servico: text("servico").notNull(), // Para MVP será string, depois pode virar FK
  status: text("status", {
    enum: ["agendado", "cancelado", "concluido"],
  }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ⚙️ CONFIGURAÇÕES
export const configuracoes = pgTable("configuracoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  chave: text("chave").notNull().unique(),
  valor: text("valor").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 🔗 LINKTREE / PARCERIAS
export const links = pgTable("links", {
  id: uuid("id").primaryKey().defaultRandom(),
  titulo: text("titulo").notNull(),
  url: text("url").notNull(),
  descricao: text("descricao"),
  clienteId: uuid("cliente_id").references(() => clientes.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 📊 RELATÓRIOS (log de geração, opcional, pode ser só cálculo dinâmico via TRPC)
export const relatorios = pgTable("relatorios", {
  id: uuid("id").primaryKey().defaultRandom(),
  tipo: text("tipo").notNull(), // exemplo: "agendamentos", "clientes"
  payload: json("payload"), // Dados agregados
  geradoEm: timestamp("gerado_em").defaultNow(),
});
