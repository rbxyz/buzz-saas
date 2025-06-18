/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { trpc } from "@/utils/trpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Pencil, Plus, Trash, UserCog } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type User = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "superadmin";
  login?: string;
  password?: string;
};

export function UsuariosCard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin" as "admin" | "superadmin",
    phone: "",
  });

  // Consulta para listar usuários
  const { data: users, refetch } = trpc.auth.listUsers.useQuery();

  // Mutation para criar usuário
  const createUserMutation = trpc.auth.createUser.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Usuário criado com sucesso!",
        description: `Login: ${data.login} | Senha: ${data.password}`,
      });
      setIsDialogOpen(false);
      resetForm();
      void refetch();
    },
    onError: (error) => {
      let errorMessage = error.message;

      // Tratar erros específicos de senha
      if (
        error.message.includes("password") ||
        error.message.includes("senha")
      ) {
        if (
          error.message.includes("short") ||
          error.message.includes("curta")
        ) {
          errorMessage = "A senha deve ter pelo menos 6 caracteres.";
        } else if (
          error.message.includes("weak") ||
          error.message.includes("fraca")
        ) {
          errorMessage =
            "A senha deve ser mais forte. Use letras, números e símbolos.";
        }
      }

      toast({
        title: "Erro ao criar usuário",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar usuário
  const updateUserMutation = trpc.auth.updateUser.useMutation({
    onSuccess: () => {
      toast({
        title: "Usuário atualizado com sucesso!",
      });
      setIsDialogOpen(false);
      resetForm();
      void refetch();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar usuário
  const deleteUserMutation = trpc.auth.deleteUser.useMutation({
    onSuccess: () => {
      toast({
        title: "Usuário removido com sucesso!",
      });
      setIsDeleteDialogOpen(false);
      void refetch();
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover usuário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function handleCreateUser() {
    setSelectedUser(null);
    resetForm();
    setIsDialogOpen(true);
  }

  function handleEditUser(user: User) {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      phone: "",
    });
    setIsDialogOpen(true);
  }

  function handleDeleteUser(user: User) {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  }

  function confirmDeleteUser() {
    if (selectedUser) {
      deleteUserMutation.mutate({ id: selectedUser.id });
    }
  }

  function resetForm() {
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "admin",
      phone: "",
    });
    setShowPassword(false);
  }

  function handleSubmit() {
    // Validação personalizada de senha
    if (!selectedUser && formData.password && formData.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (selectedUser) {
      // Atualizar usuário existente
      updateUserMutation.mutate({
        id: selectedUser.id,
        name: formData.name,
        email: formData.email,
        password: formData.password ?? undefined,
        role: formData.role,
        phone: formData.phone,
      });
    } else {
      // Criar novo usuário
      createUserMutation.mutate({
        name: formData.name,
        email: formData.email,
        password: formData.password ?? undefined,
        role: formData.role,
        phone: formData.phone,
      });
    }
  }

  const isPending =
    createUserMutation.isPending ||
    updateUserMutation.isPending ||
    deleteUserMutation.isPending;

  return (
    <Card className="w-full border-gray-200 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="rounded-lg bg-gray-100 p-2">
            <UserCog className="h-5 w-5 text-gray-600" />
          </div>
          Gerenciamento de Usuários
        </CardTitle>
        <CardDescription className="text-sm text-gray-600">
          Crie e gerencie os usuários com acesso ao sistema
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button
            onClick={handleCreateUser}
            className="flex items-center gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {users && users.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {user.role === "superadmin" ? "Super Admin" : "Admin"}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              Nenhum usuário cadastrado. Clique em "Novo Usuário" para
              adicionar.
            </p>
          </div>
        )}

        {/* Modal de criação/edição de usuário */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {selectedUser ? "Editar Usuário" : "Novo Usuário"}
              </DialogTitle>
              <DialogDescription>
                {selectedUser
                  ? "Atualize as informações do usuário"
                  : "Preencha os dados para criar um novo usuário"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Nome completo"
                  disabled={isPending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@exemplo.com"
                  disabled={isPending}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">
                  {selectedUser ? "Nova Senha (opcional)" : "Senha"}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder={
                      selectedUser
                        ? "Deixe em branco para manter a atual"
                        : "Senha"
                    }
                    disabled={isPending}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-0 right-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Função</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      role: value as "admin" | "superadmin",
                    })
                  }
                  disabled={isPending}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecione uma função" />
                  </SelectTrigger>
                  <SelectContent className="cursor-pointer bg-black/40 backdrop-blur-sm">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Telefone (opcional)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="(00) 00000-0000"
                  disabled={isPending}
                />
              </div>
            </div>

            {createUserMutation.isSuccess && selectedUser === null && (
              <Alert className="mb-4 bg-green-50">
                <AlertDescription className="flex items-center text-green-800">
                  <div>
                    <p>
                      <strong>Usuário criado com sucesso!</strong>
                    </p>
                    <p>
                      Login: {createUserMutation.data?.login} | Senha:{" "}
                      {createUserMutation.data?.password}
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de confirmação de exclusão */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirmar exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o usuário{" "}
                <strong>{selectedUser?.name}</strong>? Esta ação não pode ser
                desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteUser}
                disabled={isPending}
              >
                {isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
