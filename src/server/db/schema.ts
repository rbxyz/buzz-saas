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

// Definição do tipo personalizado para 'bytea'
export const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

// Enum para o campo tipo do link
const linkTypeEnum = pgEnum("link_type_enum", ["cliente", "parceria"]);

// 🧩 CLIENTES
export const clientes = pgTable("clientes", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  dataNascimento: date("data_nascimento"), // Por padrão, campos são nulos
  email: text("email"), // Por padrão, campos são nulos
  telefone: varchar("telefone", { length: 20 }).notNull(),
  comprasRecentes: json("compras_recentes"), // Por padrão, campos são nulos
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 🗓️ AGENDAMENTOS
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
  descricao: text("descricao").default(""),
  clienteId: uuid("cliente_id").references(() => clientes.id),
  tipo: linkTypeEnum("tipo").notNull(),
  imagem: bytea("imagem"), // tipo é Uint8Array
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 📊 RELATÓRIOS
export const relatorios = pgTable("relatorios", {
  id: uuid("id").primaryKey().defaultRandom(),
  tipo: text("tipo").notNull(),
  payload: json("payload"),
  geradoEm: timestamp("gerado_em").defaultNow(),
});
