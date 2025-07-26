"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Header } from '@/components/layout/Header'
import { TradingInterface } from '@/components/trading/TradingInterface'

function TradingPageContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get('token');

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <TradingInterface preSelectedTokenMint={tokenParam} />
    </main>
  )
}

export default function TradingPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading trading interface...</p>
          </div>
        </div>
      </main>
    }>
      <TradingPageContent />
    </Suspense>
  )
} 