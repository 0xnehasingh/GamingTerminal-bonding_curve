"use client"

import React from 'react'

interface OrderBookProps {
  orderBook: {
    bids: Array<{ price: number; amount: number }>
    asks: Array<{ price: number; amount: number }>
  }
}

export function OrderBook({ orderBook }: OrderBookProps) {
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
    return amount.toFixed(0)
  }

  const maxBidAmount = Math.max(...orderBook.bids.map(b => b.amount))
  const maxAskAmount = Math.max(...orderBook.asks.map(a => a.amount))
  const maxAmount = Math.max(maxBidAmount, maxAskAmount)

  return (
    <div className="h-96 overflow-hidden">
      <div className="grid grid-cols-2 gap-4 h-full">
        {/* Buy Orders (Bids) */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400 font-medium pb-2 border-b border-slate-700">
            <span>Price (SOL)</span>
            <span>Amount</span>
          </div>
          
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {orderBook.bids.map((bid, index) => {
              const widthPercent = (bid.amount / maxAmount) * 100
              return (
                <div 
                  key={index}
                  className="relative flex justify-between text-xs py-1 px-2 hover:bg-slate-800/50 transition-colors"
                >
                  {/* Background bar */}
                  <div 
                    className="absolute left-0 top-0 h-full bg-green-500/10"
                    style={{ width: `${widthPercent}%` }}
                  />
                  
                  <span className="text-green-400 font-mono relative z-10">
                    {formatPrice(bid.price)}
                  </span>
                  <span className="text-white font-mono relative z-10">
                    {formatAmount(bid.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sell Orders (Asks) */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400 font-medium pb-2 border-b border-slate-700">
            <span>Price (SOL)</span>
            <span>Amount</span>
          </div>
          
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {orderBook.asks.map((ask, index) => {
              const widthPercent = (ask.amount / maxAmount) * 100
              return (
                <div 
                  key={index}
                  className="relative flex justify-between text-xs py-1 px-2 hover:bg-slate-800/50 transition-colors"
                >
                  {/* Background bar */}
                  <div 
                    className="absolute left-0 top-0 h-full bg-red-500/10"
                    style={{ width: `${widthPercent}%` }}
                  />
                  
                  <span className="text-red-400 font-mono relative z-10">
                    {formatPrice(ask.price)}
                  </span>
                  <span className="text-white font-mono relative z-10">
                    {formatAmount(ask.amount)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Spread */}
      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Spread:</span>
          <span className="text-yellow-400 font-mono">
            {formatPrice(orderBook.asks[0]?.price - orderBook.bids[0]?.price)} SOL
          </span>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-slate-400">Spread %:</span>
          <span className="text-yellow-400 font-mono">
            {(((orderBook.asks[0]?.price - orderBook.bids[0]?.price) / orderBook.bids[0]?.price) * 100).toFixed(3)}%
          </span>
        </div>
      </div>
    </div>
  )
}