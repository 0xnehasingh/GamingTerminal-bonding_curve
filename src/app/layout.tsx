import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { WalletProvider } from '@/components/providers/WalletProvider'
import { PoolProvider } from '@/contexts/PoolContext'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Gaming Terminal - Memecoin Launchpad',
  description: 'A comprehensive memecoin launchpad on Solana featuring bonding curves and automatic Raydium migration',
  keywords: ['solana', 'memecoin', 'launchpad', 'defi', 'bonding curve', 'raydium'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProvider>
          <PoolProvider>
            {children}
            <Toaster 
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#333',
                  color: '#fff',
                },
              }}
            />
          </PoolProvider>
        </WalletProvider>
      </body>
    </html>
  )
} 