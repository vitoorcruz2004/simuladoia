import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SimuladoIA — Treine onde você perde pontos',
  description: 'Plataforma adaptativa de simulados para ENEM com IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
