"use client";

import type React from "react";

import { useState, useEffect, useRef } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Phone,
  Clock,
  User,
  Calendar,
  CheckCircle,
  Info,
  Archive,
  MessageSquare,
  Send,
  Bot,
  UserIcon,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function ChatbotPage() {
  // Estados principais
  const [conversaSelecionada, setConversaSelecionada] = useState<string | null>(
    null,
  );
  const [novaMensagem, setNovaMensagem] = useState("");
  const [autoRefresh] = useState(true);

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState<
    "ativa" | "pausada" | "encerrada" | null
  >(null);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Queries
  const {
    data: conversas,
    isLoading,
    error,
    refetch: refetchConversas,
  } = api.conversations.listar.useQuery({
    status: statusFiltro ?? undefined,
    busca: busca ?? undefined,
  });

  const {
    data: mensagens,
    isLoading: loadingMensagens,
    refetch: refetchMensagens,
    error: errorMensagens,
  } = api.messages.listarPorConversa.useQuery(
    { conversationId: conversaSelecionada! },
    { enabled: !!conversaSelecionada },
  );

  // Mutations
  const enviarMensagemMutation = api.messages.enviar.useMutation({
    onSuccess: () => {
      setNovaMensagem("");
      void refetchMensagens();
      void refetchConversas();
    },
    onError: (error) => {
      console.error("Erro ao enviar mensagem:", error);
    },
  });

  const marcarComoLidaMutation = api.messages.marcarComoLida.useMutation({
    onSuccess: () => {
      void refetchMensagens();
      void refetchConversas();
      },
    });

  // Efeitos
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        void refetchConversas();
        if (conversaSelecionada) {
          void refetchMensagens();
        }
      }, 10000); // Atualiza a cada 10 segundos

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, conversaSelecionada, refetchConversas, refetchMensagens]);

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  useEffect(() => {
    // Marcar mensagens como lidas quando uma conversa é selecionada
    if (conversaSelecionada && mensagens) {
      const mensagensNaoLidas = mensagens.filter(
        (m) => !m.lida && m.tipo === "recebida",
      );
      if (mensagensNaoLidas.length > 0) {
        mensagensNaoLidas.forEach((mensagem) => {
          marcarComoLidaMutation.mutate({ messageId: mensagem.id });
        });
      }
    }
  }, [conversaSelecionada, mensagens, marcarComoLidaMutation]);

  // Funções auxiliares
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatarTelefone = (telefone: string) => {
    const numero = telefone.replace(/\D/g, "");
    if (numero.length === 13 && numero.startsWith("55")) {
      const ddd = numero.slice(2, 4);
      const parte1 = numero.slice(4, 9);
      const parte2 = numero.slice(9);
      return `+55 (${ddd}) ${parte1}-${parte2}`;
    }
    if (numero.length === 11) {
      const ddd = numero.slice(0, 2);
      const parte1 = numero.slice(2, 7);
      const parte2 = numero.slice(7);
      return `(${ddd}) ${parte1}-${parte2}`;
    }
    return telefone;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ativa":
        return <CheckCircle className="h-3 w-3" />;
      case "pausada":
        return <Clock className="h-3 w-3" />;
      case "encerrada":
        return <Archive className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  const handleEnviarMensagem = () => {
    if (!novaMensagem.trim() || !conversaSelecionada) return;

    // Alterado para enviar como bot em vez de usuário
    enviarMensagemMutation.mutate({
      conversationId: conversaSelecionada,
      conteudo: novaMensagem.trim(),
      tipo: "enviada", // Isso será convertido para "bot" no backend
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviarMensagem();
    }
  };

  const conversaSelecionadaData = conversas?.find(
    (c) => c.id === conversaSelecionada,
  );

  // Debug de erros
  useEffect(() => {
    if (errorMensagens) {
      console.error("Erro ao carregar mensagens:", errorMensagens);
    }
  }, [errorMensagens]);

  // Formatar data e hora
  const formatarDataHora = (timestamp: string) => {
    const data = new Date(timestamp);
    return format(data, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="mb-6 text-3xl font-bold">Chatbot</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Lista de Conversas */}
        <Card className="md:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-xl">
              <MessageSquare className="h-5 w-5" />
              Conversas
            </CardTitle>
            <div className="relative">
              <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
              <Input
                placeholder="Buscar conversa..."
                className="pl-8"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <Tabs defaultValue="todas" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger
                  value="todas"
                  onClick={() => setStatusFiltro(null)}
                  className="flex-1"
                >
                  Todas
                </TabsTrigger>
                <TabsTrigger
                  value="ativas"
                  onClick={() => setStatusFiltro("ativa")}
                  className="flex-1"
                >
                  Ativas
                </TabsTrigger>
                <TabsTrigger
                  value="pausadas"
                  onClick={() => setStatusFiltro("pausada")}
                  className="flex-1"
                >
                  Pausadas
                </TabsTrigger>
              </TabsList>
              <div className="mt-2 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchConversas()}
                  className="text-xs"
                >
                  Atualizar
                </Button>
              </div>
            </Tabs>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-300px)]">
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex animate-pulse items-center gap-3 rounded-md p-3"
                    >
                      <div className="h-10 w-10 rounded-full bg-gray-200" />
                      <div className="flex-1">
                        <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
                        <div className="h-3 w-1/2 rounded bg-gray-200" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="py-4 text-center text-red-500">
                  <p>Erro ao carregar conversas: {error.message}</p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => refetchConversas()}
                  >
                    Tentar novamente
                  </Button>
                </div>
              ) : conversas && conversas.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {conversas.map((conversa) => (
                    <Button
                      key={conversa.id}
                      variant={
                        conversaSelecionada === conversa.id
                          ? "default"
                          : "ghost"
                      }
                      className="flex h-auto items-start justify-start gap-3 p-3 text-left"
                      onClick={() => setConversaSelecionada(conversa.id)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {conversa.nomeCliente
                            ? conversa.nomeCliente.substring(0, 2).toUpperCase()
                            : conversa.telefone.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <p className="truncate font-medium">
                            {conversa.nomeCliente ??
                              formatarTelefone(conversa.telefone)}
                          </p>
                          <Badge
                            variant={
                              conversa.status === "ativa"
                                ? "default"
                                : conversa.status === "pausada"
                                  ? "outline"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {conversa.status === "ativa"
                              ? "Ativa"
                              : conversa.status === "pausada"
                                ? "Pausada"
                                : "Encerrada"}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground truncate text-sm">
                          {conversa.ultimaMensagem}
                        </p>
                        <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(
                              new Date(conversa.ultimaInteracao),
                              {
                                addSuffix: true,
                                locale: ptBR,
                              },
                            )}
                          </span>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground py-10 text-center">
                  <MessageSquare className="mx-auto mb-2 h-10 w-10 opacity-20" />
                  <p>Nenhuma conversa encontrada</p>
                  <p className="text-sm">
                    As conversas aparecerão aqui quando forem iniciadas.
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Área de Chat */}
        <Card className="md:col-span-2">
          <CardContent className="flex h-[calc(100vh-200px)] flex-col p-0">
            {conversaSelecionadaData ? (
              <>
                {/* Header da Conversa */}
                <div className="border-b p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {conversaSelecionadaData.nomeCliente
                            ? conversaSelecionadaData.nomeCliente
                                .substring(0, 2)
                                .toUpperCase()
                            : conversaSelecionadaData.telefone.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">
                          {conversaSelecionadaData.nomeCliente ??
                            formatarTelefone(conversaSelecionadaData.telefone)}
                        </h3>
                        <div className="text-muted-foreground flex items-center gap-2 text-sm">
                          <Phone className="h-3 w-3" />
                          <span>
                            {formatarTelefone(conversaSelecionadaData.telefone)}
                          </span>
                          <Badge
                            variant={
                              conversaSelecionadaData.status === "ativa"
                                ? "default"
                                : conversaSelecionadaData.status === "pausada"
                                  ? "outline"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {getStatusIcon(conversaSelecionadaData.status)}
                            {conversaSelecionadaData.status === "ativa"
                              ? "Ativa"
                              : conversaSelecionadaData.status === "pausada"
                                ? "Pausada"
                                : "Encerrada"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <User className="mr-1 h-4 w-4" />
                        Ver cliente
                      </Button>
                      <Button variant="outline" size="sm">
                        <Calendar className="mr-1 h-4 w-4" />
                        Agendar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Área de Mensagens */}
                <div className="flex-1 overflow-hidden">
                  <ScrollArea className="h-full p-4">
                    {loadingMensagens ? (
                      <div className="flex flex-col gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                          <div
                            key={i}
                            className="flex animate-pulse items-start gap-3"
                          >
                            <div className="h-8 w-8 rounded-full bg-gray-200" />
                            <div className="flex-1">
                              <div className="mb-2 h-4 w-1/4 rounded bg-gray-200" />
                              <div className="h-16 w-3/4 rounded bg-gray-200" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : errorMensagens ? (
                      <div className="py-4 text-center text-red-500">
                        <p>
                          Erro ao carregar mensagens: {errorMensagens.message}
                        </p>
                        <Button
                          variant="outline"
                          className="mt-2"
                          onClick={() => refetchMensagens()}
                        >
                          Tentar novamente
                        </Button>
                      </div>
                    ) : mensagens && mensagens.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        {mensagens.map((mensagem) => (
                          <div
                            key={mensagem.id}
                            className={`flex items-start gap-3 ${
                              mensagem.tipo === "enviada"
                                ? "flex-row-reverse"
                                : ""
                            }`}
                          >
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {mensagem.tipo === "enviada" ? (
                                  <Bot className="h-4 w-4" />
                                ) : mensagem.tipo === "sistema" ? (
                                  <Info className="h-4 w-4" />
                                ) : (
                                  <UserIcon className="h-4 w-4" />
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={`flex max-w-[70%] flex-col ${
                                mensagem.tipo === "enviada"
                                  ? "items-end"
                                  : "items-start"
                              }`}
                            >
                              <div
                                className={`rounded-lg px-3 py-2 ${
                                  mensagem.tipo === "enviada"
                                    ? "bg-blue-500 text-white"
                                    : mensagem.tipo === "sistema"
                                      ? "bg-gray-100 text-gray-700"
                                      : "bg-gray-100 text-gray-900"
                                }`}
                              >
                                <p className="text-sm">{mensagem.conteudo}</p>
                              </div>
                              <div className="text-muted-foreground mt-1 flex items-center gap-1 text-xs">
                                <Clock className="h-3 w-3" />
                                <span
                                  title={formatarDataHora(mensagem.timestamp)}
                                >
                                  {formatarDataHora(mensagem.timestamp)}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    ) : (
                      <div className="text-muted-foreground flex h-full items-center justify-center">
                        <div className="text-center">
                          <MessageSquare className="mx-auto mb-3 h-12 w-12 opacity-20" />
                          <h3 className="text-lg font-medium">
                            Nenhuma mensagem ainda
                          </h3>
                          <p className="max-w-md">
                            Esta conversa ainda não possui mensagens.
                          </p>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </div>

                {/* Input de Nova Mensagem */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Digite sua mensagem..."
                      value={novaMensagem}
                      onChange={(e) => setNovaMensagem(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={enviarMensagemMutation.isPending}
                    />
                    <Button
                      onClick={handleEnviarMensagem}
                      disabled={
                        !novaMensagem.trim() || enviarMensagemMutation.isPending
                      }
                    >
                      {enviarMensagemMutation.isPending ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              /* Estado quando nenhuma conversa está selecionada */
              <div className="text-muted-foreground flex h-full items-center justify-center p-4">
                <div className="text-center">
                  <MessageSquare className="mx-auto mb-3 h-12 w-12 opacity-20" />
                  <h3 className="text-lg font-medium">
                    Nenhuma conversa selecionada
                  </h3>
                  <p className="max-w-md">
                    Selecione uma conversa na lista ao lado para visualizar as
                    mensagens.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
