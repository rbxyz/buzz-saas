// Configurações centralizadas de cache para toda a aplicação
export const CACHE_CONFIG = {
    // Cache de dados estáticos (configurações, etc.)
    STATIC_DATA: {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
    },
  
    // Cache de dados dinâmicos (agendamentos, clientes)
    DYNAMIC_DATA: {
      staleTime: 30 * 1000, // 30 segundos
      cacheTime: 2 * 60 * 1000, // 2 minutos
    },
  
    // Cache de dados em tempo real (dashboard stats)
    REALTIME_DATA: {
      staleTime: 10 * 1000, // 10 segundos
      cacheTime: 30 * 1000, // 30 segundos
    },
  
    // Cache de listas paginadas
    PAGINATED_DATA: {
      staleTime: 1 * 60 * 1000, // 1 minuto
      cacheTime: 5 * 60 * 1000, // 5 minutos
    },
  } as const
  
  // Chaves de cache padronizadas
  export const CACHE_KEYS = {
    DASHBOARD_STATS: "dashboard-stats",
    AGENDAMENTOS: "agendamentos",
    CLIENTES: "clientes",
    CONFIGURACOES: "configuracoes",
    LINKTREE: "linktree",
    OVERVIEW: "overview",
  } as const
  