"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TokenTradingData } from '@/hooks/useTokenTradingData'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'

interface TradingFormProps {
  tokenData: TokenTradingData
  onTradeComplete: () => void
}

export function TradingForm({ tokenData, onTradeComplete }: TradingFormProps) {
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')
  const [amount, setAmount] = useState('')
  const [isTrading, setIsTrading] = useState(false)

  const formatPrice = (price: number) => {
    if (price < 0.001) {
      return price.toExponential(3)
    }
    return price.toFixed(6)
  }

  const calculateTotal = () => {
    const amountNum = parseFloat(amount) || 0
    if (tradeType === 'buy') {
      return amountNum * tokenData.currentPrice
    } else {
      return amountNum * tokenData.currentPrice
    }
  }

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setIsTrading(true)
    
    try {
      // Simulate trade execution
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // In a real implementation, this would call the smart contract
      console.log(`${tradeType} ${amount} ${tokenData.tokenSymbol} for ${calculateTotal()} SOL`)
      
      alert(`${tradeType === 'buy' ? 'Bought' : 'Sold'} ${amount} ${tokenData.tokenSymbol} successfully!`)
      setAmount('')
      onTradeComplete()
      
    } catch (error) {
      console.error('Trade failed:', error)
      alert('Trade failed. Please try again.')
    } finally {
      setIsTrading(false)
    }
  }

  return (
    <Card className="bg-slate-900/50 border-slate-700/50 sticky top-6">
      <CardHeader>
        <CardTitle className="text-white">Trade {tokenData.tokenSymbol}</CardTitle>
        <CardDescription>
          Buy or sell tokens directly from the pool
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trade Type Toggle */}
        <div className="flex bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => setTradeType('buy')}
            className={cn(
              "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
              tradeType === 'buy'
                ? "bg-green-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            )}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Buy
          </button>
          <button
            onClick={() => setTradeType('sell')}
            className={cn(
              "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
              tradeType === 'sell'
                ? "bg-red-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
            )}
          >
            <TrendingDown className="w-4 h-4 inline mr-2" />
            Sell
          </button>
        </div>

        {/* Price Display */}
        <div className="space-y-2">
          <Label className="text-slate-400">Current Price</Label>
          <div className="p-3 bg-slate-800/30 rounded-lg">
            <div className="text-lg font-bold text-white">
              {formatPrice(tokenData.currentPrice)} SOL
            </div>
            <div className={cn(
              "text-sm flex items-center gap-1",
              tokenData.priceChange24h >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {tokenData.priceChange24h >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {Math.abs(tokenData.priceChange24h).toFixed(2)}% 24h
            </div>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <Label className="text-slate-400">
            Amount ({tokenData.tokenSymbol})
          </Label>
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="bg-slate-800/30 border-slate-600 text-white"
          />
          
          {/* Quick Amount Buttons */}
          <div className="flex gap-2">
            {['25%', '50%', '75%', 'Max'].map((percent) => (
              <Button
                key={percent}
                variant="outline"
                size="sm"
                className="flex-1 text-xs border-slate-600 text-slate-400 hover:bg-slate-700"
                onClick={() => {
                  const maxAmount = tradeType === 'buy' 
                    ? tokenData.solBalance / tokenData.currentPrice 
                    : tokenData.tokenBalance
                  const percentValue = percent === 'Max' ? 100 : parseInt(percent)
                  setAmount(((maxAmount * percentValue) / 100).toFixed(2))
                }}
              >
                {percent}
              </Button>
            ))}
          </div>
        </div>

        {/* Total Calculation */}
        <div className="space-y-2">
          <Label className="text-slate-400">
            {tradeType === 'buy' ? 'Total Cost' : 'Total Receive'} (SOL)
          </Label>
          <div className="p-3 bg-slate-800/30 rounded-lg">
            <div className="text-lg font-bold text-white">
              {calculateTotal().toFixed(6)} SOL
            </div>
          </div>
        </div>

        {/* Pool Info */}
        <div className="space-y-3 pt-4 border-t border-slate-700">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Pool SOL Balance:</span>
            <span className="text-white font-mono">{tokenData.solBalance.toFixed(2)} SOL</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Pool Token Balance:</span>
            <span className="text-white font-mono">{tokenData.tokenBalance.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Market Cap:</span>
            <span className="text-white font-mono">${tokenData.marketCap.toLocaleString()}</span>
          </div>
        </div>

        {/* Trade Button */}
        <Button
          onClick={handleTrade}
          disabled={isTrading || !amount || parseFloat(amount) <= 0}
          className={cn(
            "w-full py-3 font-medium transition-all",
            tradeType === 'buy'
              ? "bg-green-600 hover:bg-green-700 text-white"
              : "bg-red-600 hover:bg-red-700 text-white"
          )}
        >
          {isTrading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              {tradeType === 'buy' ? 'Buy' : 'Sell'} {tokenData.tokenSymbol}
            </div>
          )}
        </Button>

        {/* Disclaimer */}
        <div className="text-xs text-slate-500 text-center">
          <p>⚠️ This is a demo trading interface.</p>
          <p>Real transactions would require wallet connection.</p>
        </div>
      </CardContent>
    </Card>
  )
}