import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function LinktreePage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Linktree Manager</h1>

      <Card>
        <CardHeader>
          <CardTitle>Gerenciador de Links</CardTitle>
          <CardDescription>Personalize sua página de links para compartilhar com clientes</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aqui será implementada a interface drag-and-drop para gerenciar os links.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
