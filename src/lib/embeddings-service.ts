// Tipagem para o registro de embedding
export interface EmbeddingRecord {
  id: string;
  uploadId: number;
  content: string;
  embedding: number[];
  createdAt?: Date;
}

// Mock de armazenamento em memória para embeddings (substituir por banco real quando necessário)
const embeddingsStore: EmbeddingRecord[] = [];

// Função para criar embeddings a partir do conteúdo
export async function createEmbeddings(content: string, uploadId: number): Promise<EmbeddingRecord | null> {
  try {
    const mockEmbedding = Array(1536)
      .fill(0)
      .map(() => Math.random() - 0.5);

    const newEmbedding: EmbeddingRecord = {
      id: `emb_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      uploadId,
      content,
      embedding: mockEmbedding,
      createdAt: new Date(),
    };

    // Armazenar em memória (substituir por inserção no banco quando tabela existir)
    embeddingsStore.push(newEmbedding);

    return newEmbedding;
  } catch (error) {
    console.error("Erro ao criar embeddings:", error instanceof Error ? error.message : "Erro desconhecido");
    throw new Error(error instanceof Error ? error.message : "Erro desconhecido ao criar embeddings");
  }
}

// Função para buscar embeddings similares
export async function searchSimilarEmbeddings(query: string, limit = 5): Promise<EmbeddingRecord[]> {
  try {
    // Retornar os primeiros 'limit' embeddings do store (mock)
    const results = embeddingsStore.slice(0, Math.min(limit, embeddingsStore.length));
    return results;
  } catch (error) {
    console.error("Erro ao buscar embeddings similares:", error instanceof Error ? error.message : "Erro desconhecido");
    throw new Error(error instanceof Error ? error.message : "Erro desconhecido ao buscar embeddings");
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

    const count = results.filter(Boolean).length;

    return {
      success: true,
      count,
      message: `${count} embeddings criados com sucesso para o upload ${uploadId}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    };
  }
}