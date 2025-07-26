"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCw, ExternalLink, Copy } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useTokenTradingData } from '@/hooks/useTokenTradingData'
import { TradingChart } from './TradingChart'
import { RecentTrades } from './RecentTrades'
import { TradingForm } from './TradingForm'

interface TokenTradingInterfaceProps {
  tokenAddress: string
}

export function TokenTradingInterface({ tokenAddress }: TokenTradingInterfaceProps) {
  const router = useRouter()
  const { tradingData, isLoading, error, refreshTradingData } = useTokenTradingData(tokenAddress)
  const [activeTab, setActiveTab] = useState<'chart' | 'trades'>('chart')

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const formatNumber = (num: number): string => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(2)}M`
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`
    }
    return num.toFixed(4)
  }

  const formatPrice = (price: number): string => {
    if (price < 0.001) {
      return price.toExponential(3)
    }
    return price.toFixed(6)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Loading trading data...</p>
          <p className="text-slate-400">Fetching blockchain data for token</p>
        </div>
      </div>
    )
  }

  if (error || !tradingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">Failed to load trading data</p>
          <p className="text-slate-400 mb-4">{error || 'Unknown error'}</p>
          <Button onClick={refreshTradingData} className="bg-purple-600 hover:bg-purple-700">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-900/50 to-slate-950"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      <div className="relative z-10 p-6">
        {/* Header */}
        <motion.div 
          className="flex items-center gap-6 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Button
            onClick={() => router.back()}
            variant="outline"
            size="sm"
            className="border-slate-600 text-slate-400 hover:bg-slate-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <div className="flex items-center gap-4">
            {tradingData.imageUri && (
              <img 
                src={tradingData.imageUri} 
                alt={tradingData.tokenName}
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">
                {tradingData.tokenName || 'Unknown Token'}
              </h1>
              <div className="flex items-center gap-2 text-slate-400">
                <span>{tradingData.tokenSymbol || 'UNK'}</span>
                <button 
                  onClick={() => copyToClipboard(tokenAddress)}
                  className="hover:text-white transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <a 
                  href={`https://explorer.solana.com/address/${tokenAddress}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          <Button
            onClick={refreshTradingData}
            variant="outline"
            size="sm"
            className="ml-auto border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>
        </motion.div>

        {/* Price Stats */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="text-sm text-slate-400 mb-1">Price</div>
              <div className="text-lg font-bold text-white">
                {formatPrice(tradingData.currentPrice)} SOL
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="text-sm text-slate-400 mb-1">24h Change</div>
              <div className={cn(
                "text-lg font-bold flex items-center gap-1",
                tradingData.priceChange24h >= 0 ? "text-green-400" : "text-red-400"
              )}>
                {tradingData.priceChange24h >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {Math.abs(tradingData.priceChange24h).toFixed(2)}%
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="text-sm text-slate-400 mb-1">24h Volume</div>
              <div className="text-lg font-bold text-white">
                {formatNumber(tradingData.volume24h)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="text-sm text-slate-400 mb-1">Market Cap</div>
              <div className="text-lg font-bold text-white">
                ${formatNumber(tradingData.marketCap)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="text-sm text-slate-400 mb-1">Circulating</div>
              <div className="text-lg font-bold text-white">
                {formatNumber(tradingData.circulatingSupply)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-700/50">
            <CardContent className="p-4">
              <div className="text-sm text-slate-400 mb-1">Pool SOL</div>
              <div className="text-lg font-bold text-white">
                {tradingData.solBalance.toFixed(2)} SOL
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Trading Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Side - Chart and Tabs */}
          <div className="lg:col-span-3 space-y-6">
            {/* Chart/OrderBook/Trades Tabs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="bg-slate-900/50 border-slate-700/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-white">Trading View</CardTitle>
                    <div className="flex bg-slate-800/50 rounded-lg p-1">
                      {(['chart', 'trades'] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={cn(
                            "px-4 py-2 rounded-md text-sm font-medium transition-all capitalize",
                            activeTab === tab
                              ? "bg-purple-600 text-white"
                              : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                          )}
                        >
                          {tab === 'chart' ? 'Trading Chart' : 'Recent Trades'}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {activeTab === 'chart' && (
                    <TradingChart 
                      data={tradingData.chartData}
                      currentPrice={tradingData.currentPrice}
                      tokenSymbol={tradingData.tokenSymbol || 'TOKEN'}
                    />
                  )}
                  {activeTab === 'trades' && (
                    <RecentTrades trades={tradingData.recentTrades} />
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Side - Trading Form */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <TradingForm 
                tokenData={tradingData}
                onTradeComplete={refreshTradingData}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}