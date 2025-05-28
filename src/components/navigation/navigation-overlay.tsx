"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

export function NavigationOverlay() {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Escuta eventos customizados de navegação
    const handleNavigationStart = () => setIsLoading(true);
    const handleNavigationEnd = () => setIsLoading(false);

    window.addEventListener("navigation-start", handleNavigationStart);
    window.addEventListener("navigation-end", handleNavigationEnd);

    return () => {
      window.removeEventListener("navigation-start", handleNavigationStart);
      window.removeEventListener("navigation-end", handleNavigationEnd);
    };
  }, []);

  // Remove loading quando a rota muda
  useEffect(() => {
    setIsLoading(false);
    window.dispatchEvent(new Event("navigation-end"));
  }, [pathname]);

  if (!isLoading) return null;

  return (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground text-sm">Carregando...</p>
      </div>
    </div>
  );
}
