import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vesmírná agentura Terminál – simulátor Linuxu',
  description: 'Výukový simulátor Linuxového terminálu na téma vesmírná agentura.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className="min-h-screen bg-bg text-fg antialiased">{children}</body>
    </html>
  )
}
