import { Header } from '@/components/layout/Header'
import { TradingInterface } from '@/components/trading/TradingInterface'

export default function TradingPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <TradingInterface />
    </main>
  )
} 