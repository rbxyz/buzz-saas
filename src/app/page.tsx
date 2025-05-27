"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronRight,
  ChevronLeft,
  Star,
  MapPin,
  Phone,
  Clock,
  Users,
  Award,
  Sparkles,
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { CalendarDays } from "lucide-react";
import Image from "next/image";

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 30); // Apenas 30 dias depois da data atual

  // Busca parceiros (tipo "parceria")
  const { data: parcerias } = api.linktree.listarParcerias.useQuery();

  // Busca clientes (tipo "cliente")
  const {
    data: clientes,
    isLoading: loadingClientes,
    isError: errorClientes,
  } = api.linktree.listarClientes.useQuery();

  // Busca configurações da barbearia
  const { data: configs } = api.configuracao.listar.useQuery();

  const handleLogin = () => {
    // Aqui você pode implementar a lógica de login
    // Por enquanto, vamos redirecionar para o dashboard
    window.location.href = "/dashboard";
  };

  const nextSlide = useCallback(() => {
    if (parcerias && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentSlide((prev) => (prev + 1) % parcerias.length);
      setTimeout(() => setIsTransitioning(false), 400);
    }
  }, [parcerias, isTransitioning]);

  const prevSlide = () => {
    if (parcerias && !isTransitioning) {
      setIsTransitioning(true);
      setCurrentSlide(
        (prev) => (prev - 1 + parcerias.length) % parcerias.length,
      );
      setTimeout(() => setIsTransitioning(false), 400);
    }
  };

  const goToSlide = (index: number) => {
    if (!isTransitioning && index !== currentSlide) {
      setIsTransitioning(true);
      setCurrentSlide(index);
      setTimeout(() => setIsTransitioning(false), 400);
    }
  };

  const getSlideIndex = (offset: number) => {
    if (!parcerias) return 0;
    return (currentSlide + offset + parcerias.length) % parcerias.length;
  };

  useEffect(() => {
    if (parcerias && parcerias.length > 1) {
      const interval = setInterval(nextSlide, 6000);
      return () => clearInterval(interval);
    }
  }, [parcerias, nextSlide]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header/Navigation */}
      <header className="relative z-10 bg-black/20 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500">
              <span className="text-lg font-bold text-white">D</span>
            </div>
            <span className="text-xl font-bold text-white">
              {configs?.nome}
            </span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#servicos"
              className="text-gray-300 transition-colors hover:text-white"
            >
              Serviços
            </a>
            <a
              href="#clientes"
              className="text-gray-300 transition-colors hover:text-white"
            >
              Clientes
            </a>
            <a
              href="#parceiros"
              className="text-gray-300 transition-colors hover:text-white"
            >
              Parceiros
            </a>
            <Button
              onClick={() => setShowLogin(true)}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            >
              Entrar
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10" />
        <div className="container mx-auto max-w-6xl text-center">
          <Badge className="mb-6 border-amber-500/30 bg-amber-500/20 text-amber-300">
            <Sparkles className="mr-2 h-4 w-4" />
            Experiência Premium
          </Badge>

          <h1 className="mb-6 text-5xl font-bold text-white md:text-7xl">
            Estilo que
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              {" "}
              Transforma
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-300">
            Mais que um corte, uma experiência completa. Tradição, qualidade e
            inovação em cada atendimento para o homem moderno.
          </p>

          <div className="flex cursor-pointer flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              className="cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-3 font-semibold text-white hover:from-amber-600 hover:to-orange-600"
            >
              Agendar Horário
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Ver Serviços
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">500+</div>
              <div className="text-gray-400">Clientes Satisfeitos</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">5★</div>
              <div className="text-gray-400">Avaliação Média</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">3+</div>
              <div className="text-gray-400">Anos de Experiência</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">15+</div>
              <div className="text-gray-400">Serviços Oferecidos</div>
            </div>
          </div>
        </div>
      </section>

      {/* Informações da Barbearia */}
      {configs && (
        <section className="px-6 py-16">
          <div className="container mx-auto max-w-4xl">
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                    <MapPin className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Localização</h3>
                    <p className="text-sm text-gray-400">
                      {configs.endereco || "Endereço não informado"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                    <Phone className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Contato</h3>
                    <p className="text-sm text-gray-400">
                      {configs.telefone || "Telefone não informado"}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
                    <Clock className="h-6 w-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Horário</h3>
                    <p className="text-sm text-gray-400">
                      {configs.horaInicio} às {configs.horaFim}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Carrossel de Parceiros */}
      {parcerias && parcerias.length > 0 && (
        <section className="px-6 py-20">
          <div className="container mx-auto max-w-[90rem]">
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-4xl font-bold text-white">
                <Award className="mr-3 inline h-8 w-8 text-amber-400" />
                Nossos Parceiros
              </h2>
              <p className="text-lg text-gray-400">
                Parcerias que fortalecem nosso compromisso com a excelência
              </p>
            </div>

            {/* Carrossel com cards mais largos */}
            <div className="relative mx-auto w-full">
              <div className="flex items-center justify-center gap-8 overflow-hidden px-4">
                {/* Card Anterior (Esquerda) */}
                {parcerias.length > 1 && (
                  <div
                    className={`hidden w-[28%] cursor-pointer transition-all duration-300 ease-out lg:block ${
                      isTransitioning
                        ? "opacity-30"
                        : "opacity-60 hover:opacity-80"
                    }`}
                    onClick={() => goToSlide(getSlideIndex(-1))}
                  >
                    <div className="relative aspect-[16/9] transform overflow-hidden rounded-2xl shadow-lg transition-transform duration-300 hover:scale-[1.02]">
                      {parcerias[getSlideIndex(-1)]?.imagem &&
                      parcerias[getSlideIndex(-1)]?.mimeType ? (
                        <Image
                          src={`data:${parcerias[getSlideIndex(-1)]?.mimeType};base64,${parcerias[getSlideIndex(-1)]?.imagem}`}
                          alt={parcerias[getSlideIndex(-1)]?.titulo ?? "Imagem"}
                          fill
                          className="object-cover transition-transform duration-300"
                          priority={true} // ou loading="eager" caso queira carregar antes
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                          <Award className="h-12 w-12 text-amber-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute right-4 bottom-4 left-4">
                        <h4 className="truncate text-lg font-bold text-white">
                          {parcerias[getSlideIndex(-1)]?.titulo}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-300">
                          {parcerias[getSlideIndex(-1)]?.descricao}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Card Principal (Centro) */}
                <div
                  className={`w-full transition-all duration-400 ease-out lg:w-[44%] ${
                    isTransitioning ? "opacity-95" : "opacity-100"
                  }`}
                >
                  <div className="relative aspect-[16/10] transform overflow-hidden rounded-3xl shadow-2xl transition-all duration-400">
                    {parcerias[currentSlide]?.imagem &&
                    parcerias[currentSlide]?.mimeType ? (
                      <div className="relative h-full w-full">
                        <Image
                          src={`data:${parcerias[currentSlide]?.mimeType};base64,${parcerias[currentSlide]?.imagem}`}
                          alt={
                            parcerias[currentSlide]?.titulo ||
                            "Imagem da parceria"
                          }
                          fill
                          className={`object-cover transition-all duration-400 ${
                            isTransitioning ? "scale-[1.01]" : "scale-100"
                          }`}
                          onError={(e) => {
                            console.error(
                              "Erro ao carregar imagem da parceria:",
                              parcerias[currentSlide]?.titulo,
                            );
                            // Oculta a imagem quebrada
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                          priority
                        />
                      </div>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                        <Award className="h-16 w-16 text-amber-400" />
                      </div>
                    )}

                    {/* Overlay com informações */}
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                      <div
                        className={`w-full p-6 text-white transition-all duration-400 lg:p-8 ${
                          isTransitioning
                            ? "translate-y-1 opacity-90"
                            : "translate-y-0 opacity-100"
                        }`}
                      >
                        <h3 className="mb-3 text-2xl leading-tight font-bold lg:text-3xl">
                          {parcerias[currentSlide]?.titulo}
                        </h3>
                        <p className="mb-4 line-clamp-2 text-base leading-relaxed text-gray-200 lg:mb-6 lg:text-lg">
                          {parcerias[currentSlide]?.descricao}
                        </p>
                        {parcerias[currentSlide]?.url && (
                          <a
                            href={parcerias[currentSlide]?.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-300 hover:scale-105 hover:from-amber-600 hover:to-orange-600 hover:shadow-lg lg:px-6 lg:py-3 lg:text-base"
                          >
                            Visitar Site
                            <ChevronRight className="ml-2 h-4 w-4 lg:h-5 lg:w-5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Borda sutil para o card principal */}
                    <div className="absolute inset-0 rounded-3xl ring-1 ring-amber-500/20" />
                  </div>
                </div>

                {/* Card Posterior (Direita) */}
                {parcerias.length > 1 && (
                  <div
                    className={`hidden w-[28%] cursor-pointer transition-all duration-300 ease-out lg:block ${
                      isTransitioning
                        ? "opacity-30"
                        : "opacity-60 hover:opacity-80"
                    }`}
                    onClick={() => goToSlide(getSlideIndex(1))}
                  >
                    <div className="relative aspect-[16/9] transform overflow-hidden rounded-2xl shadow-lg transition-transform duration-300 hover:scale-[1.02]">
                      {parcerias[getSlideIndex(1)]?.imagem &&
                      parcerias[getSlideIndex(1)]?.mimeType ? (
                        <div className="relative h-full w-full">
                          <Image
                            src={`data:${parcerias[getSlideIndex(1)]?.mimeType};base64,${parcerias[getSlideIndex(1)]?.imagem}`}
                            alt={
                              parcerias[getSlideIndex(1)]?.titulo ??
                              "Imagem da parceria seguinte"
                            }
                            fill
                            className="object-cover transition-transform duration-300"
                            onError={(e) => {
                              console.error(
                                "Erro ao carregar imagem da parceria (seguinte):",
                                parcerias[getSlideIndex(1)]?.titulo,
                              );
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                          <Award className="h-12 w-12 text-amber-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <div className="absolute right-4 bottom-4 left-4">
                        <h4 className="truncate text-lg font-bold text-white">
                          {parcerias[getSlideIndex(1)]?.titulo}
                        </h4>
                        <p className="mt-1 line-clamp-2 text-sm text-gray-300">
                          {parcerias[getSlideIndex(1)]?.descricao}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navegação do carrossel */}
              {parcerias.length > 1 && (
                <>
                  <button
                    onClick={prevSlide}
                    disabled={isTransitioning}
                    className="absolute top-1/2 left-2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-50 lg:left-4"
                    aria-label="Slide anterior"
                  >
                    <ChevronLeft className="h-5 w-5 lg:h-6 lg:w-6" />
                  </button>
                  <button
                    onClick={nextSlide}
                    disabled={isTransitioning}
                    className="absolute top-1/2 right-2 z-20 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-50 lg:right-4"
                    aria-label="Próximo slide"
                  >
                    <ChevronRight className="h-5 w-5 lg:h-6 lg:w-6" />
                  </button>

                  {/* Indicadores */}
                  <div className="mt-8 flex justify-center space-x-3">
                    {parcerias.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        disabled={isTransitioning}
                        className={`h-3 w-3 rounded-full transition-all duration-300 disabled:cursor-not-allowed ${
                          index === currentSlide
                            ? "scale-110 bg-amber-500 shadow-md shadow-amber-500/30"
                            : "bg-gray-400 hover:scale-105 hover:bg-gray-300"
                        }`}
                        aria-label={`Ir para slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Section de Agendamento */}
      <section id="agendamento" className="bg-gray-900 px-6 py-20 text-white">
        <div className="container mx-auto max-w-xl text-center">
          <h2 className="mb-6 text-4xl font-bold text-white">
            <CalendarDays className="mr-2 inline-block h-8 w-8 text-amber-400" />
            Agende Seu Horário
          </h2>
          <p className="mb-6 text-lg text-gray-300">
            Escolha uma data a partir de{" "}
            <strong>{minDate.toLocaleDateString()}</strong>.
          </p>

          <div className="mx-auto max-w-sm">
            <DatePicker
              selected={selectedDate}
              onChange={(date) => setSelectedDate(date)}
              minDate={minDate}
              dateFormat="dd/MM/yyyy"
              placeholderText="Selecione uma data"
              className="w-full rounded-lg border border-gray-600 bg-gray-800 p-3 text-white placeholder-gray-400 focus:outline-none"
            />
          </div>

          {selectedDate && (
            <div className="mt-4 text-green-400">
              Você selecionou: {selectedDate.toLocaleDateString()}
            </div>
          )}

          <Button className="mt-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
            Confirmar Agendamento
          </Button>
        </div>
      </section>

      {/* Casos de Sucesso - Clientes */}
      <section id="clientes" className="bg-black/20 px-6 py-16">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-4xl font-bold text-white">
              <Users className="mr-3 inline h-8 w-8 text-amber-400" />
              Melhores clientes
            </h2>
            <p className="text-lg text-gray-400">
              Clientes que confiam no nosso trabalho
            </p>
          </div>

          {loadingClientes ? (
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-amber-500 border-r-transparent"></div>
              <p className="mt-4 text-gray-300">Carregando clientes...</p>
            </div>
          ) : errorClientes ? (
            <p className="text-center text-red-400">
              Erro ao carregar clientes.
            </p>
          ) : clientes && clientes.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {clientes.map((cliente) => (
                <Card
                  key={cliente.id}
                  className="group border-gray-700 bg-gray-800/50 backdrop-blur-sm transition-all duration-300 hover:bg-gray-800/70"
                >
                  <CardContent className="p-6 text-center">
                    <div className="mb-4 flex justify-center">
                      {cliente.imagem && cliente.mimeType ? (
                        <div className="relative h-20 w-20">
                          <Image
                            src={`data:${cliente.mimeType};base64,${cliente.imagem}`}
                            alt={cliente.titulo || "Imagem do cliente"}
                            fill
                            className="rounded-full border-2 border-amber-500/30 object-cover transition-colors group-hover:border-amber-500/60"
                            onError={(e) => {
                              console.error(
                                "Erro ao carregar imagem do cliente:",
                                cliente.titulo,
                              );
                              (e.target as HTMLImageElement).style.display =
                                "none";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/20 to-orange-500/20">
                          <Users className="h-8 w-8 text-amber-400" />
                        </div>
                      )}
                    </div>
                    <h3 className="mb-2 text-xl font-semibold text-white">
                      {cliente.titulo}
                    </h3>
                    <p className="text-sm text-gray-400">{cliente.descricao}</p>
                    <div className="mt-4 flex justify-center">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-current text-amber-400"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
                <Users className="h-8 w-8 text-gray-600" />
              </div>
              <p className="text-gray-400">
                Em breve, casos de sucesso dos nossos clientes
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/40 px-6 py-8">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500">
                <span className="text-sm font-bold text-white">D</span>
              </div>
              <span className="text-lg font-bold text-white">
                {configs?.nome}
              </span>
            </div>
            <p className="text-sm text-gray-400">
              © 2024 {configs?.nome}. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* Modal de Login */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-gray-700 bg-gray-900 p-8">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">Entrar</h2>
              <button
                onClick={() => setShowLogin(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Email
                </label>
                <input
                  type="email"
                  required
                  className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  className="w-full rounded-md border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                Entrar
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-gray-400">
              Não tem conta? Entre em contato conosco.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
