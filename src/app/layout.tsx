import "./globals.css";

export const metadata = {
  title: "Camiseta da Várzea",
  description: "Camisas para quem vive o futebol de verdade."
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}