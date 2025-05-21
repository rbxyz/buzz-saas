"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type Mensagem = {
  remetente: "usuario" | "bot";
  texto: string;
};

export default function ChatbotPage() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([
    { remetente: "bot", texto: "Olá! Como posso te ajudar hoje?" },
    { remetente: "usuario", texto: "Quais são os horários disponíveis?" },
    { remetente: "bot", texto: "Temos vagas das 10h às 12h e das 14h às 18h." },
  ]);
  const [novaMensagem, setNovaMensagem] = useState("");

  function enviarMensagem() {
    if (!novaMensagem.trim()) return;

    setMensagens([...mensagens, { remetente: "usuario", texto: novaMensagem }]);
    setNovaMensagem("");

    // Simulação de resposta do bot
    setTimeout(() => {
      setMensagens((mensagensAntigas) => [
        ...mensagensAntigas,
        {
          remetente: "bot",
          texto: "Recebido! Em breve um atendente entrará em contato.",
        },
      ]);
    }, 1000);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Chatbot WhatsApp</h1>

      <Card>
        <CardHeader>
          <CardTitle>Configuração do Chatbot</CardTitle>
          <CardDescription>
            Configure as respostas automáticas do seu chatbot
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex h-[500px] flex-col overflow-hidden rounded-md border">
            {/* Mensagens */}
            <div className="bg-muted flex-1 space-y-2 overflow-y-auto p-4">
              {mensagens.map((mensagem, index) => (
                <div
                  key={index}
                  className={`max-w-[75%] rounded-lg px-4 py-2 text-sm whitespace-pre-line ${
                    mensagem.remetente === "bot"
                      ? "self-start bg-white text-black"
                      : "self-end bg-green-500 text-white"
                  }`}
                >
                  {mensagem.texto}
                </div>
              ))}
            </div>

            {/* Campo de mensagem */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviarMensagem();
              }}
              className="flex gap-2 border-t p-4"
            >
              <Input
                placeholder="Digite uma mensagem..."
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
              />
              <Button type="submit">Enviar</Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
