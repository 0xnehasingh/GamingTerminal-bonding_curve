'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Menu, X, Zap, TrendingUp, PlusCircle, BarChart3 } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Create Pool', href: '/create', icon: PlusCircle },
  { name: 'Trading', href: '/trading', icon: TrendingUp },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { connected } = useWallet()

  return (
    <header className="bg-card/95 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5 flex items-center space-x-2">
            <div className="relative">
              <Zap className="h-8 w-8 text-primary gaming-gradient" />
              <div className="absolute inset-0 rounded-full neon-glow pulse-neon" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Gaming Terminal
            </span>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-foreground"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:gap-x-8">
          {navigation.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center space-x-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200 group"
              >
                <Icon className="h-4 w-4 group-hover:text-primary transition-colors" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </div>

        {/* Wallet connection */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end items-center space-x-4">
          {connected && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />
              <span>Connected</span>
            </div>
          )}
          <WalletMultiButton className="!bg-primary hover:!bg-primary/90 !text-primary-foreground !rounded-lg !px-4 !py-2 !font-medium !transition-all !duration-200 hover:!scale-105" />
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50" />
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-background px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-border">
            <div className="flex items-center justify-between">
              <Link href="/" className="-m-1.5 p-1.5 flex items-center space-x-2">
                <Zap className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  Gaming Terminal
                </span>
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-border">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => {
                    const Icon = item.icon
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="flex items-center space-x-3 rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-muted transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Icon className="h-5 w-5 text-primary" />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
                <div className="py-6">
                  <WalletMultiButton className="!w-full !bg-primary hover:!bg-primary/90 !text-primary-foreground !rounded-lg !px-4 !py-2 !font-medium" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
} 