import type React from "react";
import ClientLayout from "./client";

export const metadata = {
  title: "Barbearia do Tio Moa",
  description: "Sistema completo de gestão para barbearias e salões",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}
