"use client"

import { api } from "@/trpc/react"
import { useEffect } from "react"

interface PreloadConfig {
  dashboard?: boolean
  agendamentos?: boolean
  clientes?: boolean
  linktree?: boolean
  configuracoes?: boolean
  chatbot?: boolean
}

export function usePreloadData(config: PreloadConfig) {
  const utils = api.useContext()

  useEffect(() => {
    const today = new Date()

    if (config.dashboard) {
      void utils.dashboard.getStats.prefetch()
      void utils.dashboard.getUltimosAgendamentos.prefetch()
      void utils.dashboard.getOverviewData.prefetch()
    }

    if (config.agendamentos) {
      void utils.agendamento.getByData.prefetch({
        date: today.toISOString(),
      })
      void utils.configuracao.listar.prefetch()
    }

    if (config.clientes) {
      void utils.cliente.listar.prefetch()
    }

    if (config.linktree) {
      void utils.linktree.listar.prefetch()
    }

    if (config.configuracoes) {
      void utils.configuracao.listar.prefetch()
      void utils.intervalosTrabalho.listar.prefetch()
    }

    if (config.chatbot) {
      void utils.configuracao.listar.prefetch()
    }
  }, [utils, config])
}
