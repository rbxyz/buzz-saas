"use client"

import { useRouter } from "next/navigation"
import { useState, useCallback } from "react"

export function useInstantNavigation() {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const navigateInstantly = useCallback(
    (href: string) => {
      // Mostra loading imediatamente
      setIsNavigating(true)

      // Navega para a página
      router.push(href)

      // Remove loading após um tempo mínimo para garantir que a nova página carregou
      setTimeout(() => {
        setIsNavigating(false)
      }, 100)
    },
    [router],
  )

  return { navigateInstantly, isNavigating }
}
