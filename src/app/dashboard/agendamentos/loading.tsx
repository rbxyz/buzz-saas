// app/dashboard/agendamentos/loading.tsx

import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="border-border flex items-center gap-3 rounded-lg border bg-white px-6 py-4 shadow-xl dark:bg-zinc-900">
        <Loader2 className="text-primary h-5 w-5 animate-spin" />
        <span className="text-foreground text-sm font-medium">
          Carregando agendamentos...
        </span>
      </div>
    </div>
  );
}
