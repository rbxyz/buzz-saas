import { redirect } from "next/navigation";

export default function DocsIndex() {
  // Redireciona para a documentação principal (API Reference)
  redirect("/docs/api-reference");
  return null;
} 