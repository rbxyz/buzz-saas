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
} from "drizzle-orm/pg-core";

// 🔧 Tipo personalizado para campos binários (ex: imagens)
export const bytea = customType<{ data: Uint8Array }>({
  dataType() {
    return "bytea";
  },
});

// 🔗 Enum para o tipo de link no Linktree
export const linkTypeEnum = pgEnum("link_type_enum", ["cliente", "parceria"]);

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
});

// 🗓️ Tabela de Agendamentos
export const agendamentos = pgTable("agendamentos", {
  id: uuid("id").primaryKey().defaultRandom(),
  clienteId: uuid("cliente_id").notNull().references(() => clientes.id),
  dataHora: timestamp("data_hora").notNull(),
  servico: text("servico").notNull(),
  status: text("status", {
    enum: ["agendado", "cancelado", "concluido"],
  }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ⚙️ Tabela de Configurações
export const configuracoes = pgTable("configuracoes", {
  id: uuid("id").primaryKey().defaultRandom(),
  chave: text("chave").notNull().unique(),
  valor: text("valor").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 🔗 Tabela de Links (Linktree / Parcerias)
export const links = pgTable("links", {
  id: uuid("id").primaryKey().defaultRandom(),
  titulo: text("titulo").notNull(),
  url: text("url").notNull(),
  descricao: text("descricao").default(""),
  clienteId: uuid("cliente_id").references(() => clientes.id),
  tipo: linkTypeEnum("tipo").notNull(),
  imagem: bytea("imagem"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 📊 Tabela de Relatórios
export const relatorios = pgTable("relatorios", {
  id: uuid("id").primaryKey().defaultRandom(),
  tipo: text("tipo").notNull(),
  payload: json("payload"),
  geradoEm: timestamp("gerado_em").defaultNow(),
});
