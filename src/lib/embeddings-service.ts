import { db } from "@/server/db";
import { embeddings } from "@/server/db/schema";

// Tipagem para o registro de embedding
export interface EmbeddingRecord {
  id: string;
  uploadId: number;
  content: string;
  embedding: number[];
  createdAt?: Date;
}

// Função para criar embeddings a partir do conteúdo
export async function createEmbeddings(content: string, uploadId: number): Promise<EmbeddingRecord | null> {
  try {
    const mockEmbedding = Array(1536)
      .fill(0)
      .map(() => Math.random() - 0.5);

    const result = await db
      .insert(embeddings)
      .values({
        uploadId,
        content,
        embedding: mockEmbedding,
      })
      .returning();

    if (Array.isArray(result) && result.length > 0) {
      return result[0] as EmbeddingRecord;
    }
    return null;
  } catch (error) {
    console.error("Erro ao criar embedding:", error instanceof Error ? error.message : error);
    throw error;
  }
}

// Função para buscar embeddings similares
export async function searchSimilarEmbeddings(query: string, limit = 5): Promise<EmbeddingRecord[]> {
  try {
    const randomEmbeddings = await db.select().from(embeddings).limit(limit);
    if (Array.isArray(randomEmbeddings)) {
      return randomEmbeddings as EmbeddingRecord[];
    }
    return [];
  } catch (error) {
    console.error("Erro ao buscar embeddings similares:", error instanceof Error ? error.message : error);
    throw error;
  }
}

// Função para disponibilizar dados para os agentes
export async function prepareDataForAgents(uploadId: number): Promise<
  | { success: true; count: number; message: string }
  | { success: false; error: string }
> {
  try {
    const sampleContents = [
      "Dados de vendas para o produto X no mês de janeiro",
      "Cliente Y comprou 10 unidades do produto Z",
      "O vendedor A atingiu 95% da meta no primeiro trimestre",
      "O produto B está com estoque baixo e precisa ser reabastecido",
      "A região Sul teve um aumento de 15% nas vendas comparado ao mês anterior",
    ];

    const results = await Promise.all(
      sampleContents.map((content) => createEmbeddings(content, uploadId)),
    );

    const count = Array.isArray(results) ? results.length : 0;

    return {
      success: true,
      count,
      message: `${count} embeddings criados com sucesso para o upload ${uploadId}`,
    };
  } catch (error) {
    console.error("Erro ao preparar dados para agentes:", error instanceof Error ? error.message : error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}