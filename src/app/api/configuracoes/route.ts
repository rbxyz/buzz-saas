import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "@/server/db";
import { configuracoes } from "@/server/db/schema";

type ConfigsObj = Record<string, string>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const configs = await db.select().from(configuracoes);
      // Transforma o array [{chave, valor}] em objeto { chave: valor }
      const configsObj: ConfigsObj = {};
      configs.forEach(({ chave, valor }) => {
        configsObj[chave] = valor;
      });
      return res.status(200).json(configsObj);
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
      return res.status(500).json({ error: "Erro interno no servidor." });
    }
  } else if (req.method === "POST") {
    try {
      const dados: ConfigsObj = req.body;

      // Para cada chave-valor, faz upsert (update se existe, insert se não)
      for (const [chave, valor] of Object.entries(dados)) {
        const existente = await db
          .select()
          .from(configuracoes)
          .where(configuracoes.chave.eq(chave))
          .limit(1);

        if (existente.length > 0) {
          await db
            .update(configuracoes)
            .set({ valor })
            .where(configuracoes.chave.eq(chave));
        } else {
          await db.insert(configuracoes).values({ chave, valor });
        }
      }

      return res.status(200).json({ message: "Configurações salvas com sucesso." });
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      return res.status(500).json({ error: "Erro interno no servidor." });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Método ${req.method} não permitido`);
  }
}
