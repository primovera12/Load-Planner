import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/providers'
import { Navigation } from '@/components/ui/navigation'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Load Planner - AI-Powered Freight Load Optimization',
  description: 'Automate heavy haul quotation with AI email parsing, truck recommendations, and permit calculations.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            <Navigation />
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
