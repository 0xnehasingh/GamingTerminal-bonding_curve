"use client"

import React from 'react'
import { ExternalLink } from 'lucide-react'
import { RealTrade } from '@/hooks/useTokenTradingData'

interface RecentTradesProps {
  trades: RealTrade[]
}

export function RecentTrades({ trades }: RecentTradesProps) {
  const formatPrice = (price: number) => {
    if (price < 0.001) {
      return price.toExponential(3)
    }
    return price.toFixed(6)
  }

  const formatAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`
    }
    return amount.toFixed(2)
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getRelativeTime = (timestamp: number) => {
    const now = Date.now()
    const diff = now - timestamp
    
    if (diff < 60000) {
      return `${Math.floor(diff / 1000)}s ago`
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`
    } else {
      return `${Math.floor(diff / 3600000)}h ago`
    }
  }

  return (
    <div className="h-96 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-5 gap-2 text-xs text-slate-400 font-medium pb-3 border-b border-slate-700">
        <span>Time</span>
        <span>Type</span>
        <span>Price (SOL)</span>
        <span>Amount</span>
        <span>Tx</span>
      </div>

      {/* Trades List */}
      <div className="space-y-1 max-h-80 overflow-y-auto mt-3">
        {trades.map((trade, index) => (
          <div 
            key={index}
            className="grid grid-cols-5 gap-2 text-xs py-2 px-2 hover:bg-slate-800/50 transition-colors rounded"
          >
            {/* Time */}
            <div className="text-slate-400">
              <div>{formatTime(trade.timestamp)}</div>
              <div className="text-xs text-slate-500">{getRelativeTime(trade.timestamp)}</div>
            </div>

            {/* Type */}
            <div className={`font-medium ${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
              {trade.type === 'buy' ? '↗ Buy' : '↘ Sell'}
            </div>

            {/* Price */}
            <div className={`font-mono ${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
              {formatPrice(trade.price)}
            </div>

            {/* Amount */}
            <div className="text-white font-mono">
              <div>{formatAmount(trade.tokenAmount)} tokens</div>
              <div className="text-xs text-slate-400">{trade.solAmount.toFixed(4)} SOL</div>
            </div>

            {/* Transaction */}
            <div className="flex items-center">
              <a
                href={`https://explorer.solana.com/tx/${trade.signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                title={`View transaction: ${trade.signature}`}
              >
                <span className="font-mono text-xs">{trade.signature.slice(0, 8)}...</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 gap-4 text-xs">
        <div>
          <span className="text-slate-400">Last Price:</span>
          <span className={`ml-2 font-mono ${trades[0]?.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
            {trades[0] ? formatPrice(trades[0].price) : '-'} SOL
          </span>
        </div>
        <div>
          <span className="text-slate-400">Total Trades:</span>
          <span className="ml-2 text-white font-mono">{trades.length}</span>
        </div>
      </div>
    </div>
  )
}