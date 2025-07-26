"use client"

import { use } from 'react'
import { TokenTradingInterface } from '@/components/trading/TokenTradingInterface'

interface TokenPageProps {
  params: Promise<{ address: string }>
}

export default function TokenPage({ params }: TokenPageProps) {
  const { address } = use(params)
  
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <TokenTradingInterface tokenAddress={address} />
    </main>
  )
}