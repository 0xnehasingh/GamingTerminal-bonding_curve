import { Header } from '@/components/layout/Header'
import { CreatePoolForm } from '@/components/pool/CreatePoolForm'

export default function CreatePoolPage() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <CreatePoolForm />
    </main>
  )
} 