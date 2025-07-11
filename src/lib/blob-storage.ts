"use server";
import { env } from "@/env";
import { put } from "@vercel/blob"
import { nanoid } from "nanoid";

export async function uploadToBlob(file: File, folder = "uploads") {
  try {
    // Gerar um ID único para o arquivo
    const uniqueId = nanoid();

    // Extrair a extensão do arquivo
    //    const extension = file.name.split(".").pop();

    // Criar um nome de arquivo único
    const fileName = `${folder}/${uniqueId}-${file.name.replace(/\s+/g, "_")}`;

    // Verificar se o token está disponível
    if (!env.BLOB_READ_WRITE_TOKEN) {
      throw new Error("BLOB_READ_WRITE_TOKEN não está configurado");
    }

    // Fazer upload para o Vercel Blob
    const blob = await put(fileName, file, {
      access: "public",
      addRandomSuffix: false,
      token: env.BLOB_READ_WRITE_TOKEN,
    });

    return {
      success: true,
      url: blob.url,
      fileName: blob.pathname,
      size: file.size,
      type: file.type,
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Erro desconhecido no upload",
    };
  }
}
