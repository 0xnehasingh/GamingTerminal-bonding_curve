import { Header } from '@/components/layout/Header'
import { Dashboard } from '@/components/dashboard/Dashboard'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <Dashboard />
    </main>
  )
} 