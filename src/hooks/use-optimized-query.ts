import { useQuery, useInfiniteQuery } from "@tanstack/react-query"
import { CACHE_CONFIG } from "@/lib/cache-config"
import type { TRPCClientError } from "@trpc/client"

// Hook otimizado para queries com cache inteligente
export function useOptimizedQuery<TData, TError = TRPCClientError<any>>(
  key: string[],
  queryFn: () => Promise<TData>,
  options?: {
    cacheType?: keyof typeof CACHE_CONFIG
    enabled?: boolean
    refetchOnWindowFocus?: boolean
    retry?: number
  },
) {
  const cacheConfig = CACHE_CONFIG[options?.cacheType ?? "DYNAMIC_DATA"]

  return useQuery<TData, TError>({
    queryKey: key,
    queryFn,
    staleTime: cacheConfig.staleTime,
    cacheTime: cacheConfig.cacheTime,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    retry: options?.retry ?? 1,
    enabled: options?.enabled ?? true,
  })
}

// Hook para queries infinitas (paginação)
export function useOptimizedInfiniteQuery<TData, TError = TRPCClientError<any>>(
  key: string[],
  queryFn: ({ pageParam }: { pageParam: number }) => Promise<TData>,
  options?: {
    enabled?: boolean
    getNextPageParam?: (lastPage: TData, pages: TData[]) => number | undefined
  },
) {
  const cacheConfig = CACHE_CONFIG.PAGINATED_DATA

  return useInfiniteQuery<TData, TError>({
    queryKey: key,
    queryFn,
    staleTime: cacheConfig.staleTime,
    cacheTime: cacheConfig.cacheTime,
    refetchOnWindowFocus: false,
    retry: 1,
    enabled: options?.enabled ?? true,
    getNextPageParam: options?.getNextPageParam ?? (() => undefined),
  })
}
