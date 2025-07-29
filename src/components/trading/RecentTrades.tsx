"use client"

import React from 'react'
import { Clock, ExternalLink, RefreshCw, Loader2, Wifi } from 'lucide-react'
import { useRealTimeTrades, RealTimeTrade } from '@/hooks/useRealTimeTrades'

interface RecentTradesProps {
  poolAddress?: string
  tokenMint?: string
  tokenSymbol?: string
}

export function RecentTrades({ poolAddress, tokenMint, tokenSymbol = "SMOOSH" }: RecentTradesProps) {
  const { trades, isLoading, error, lastUpdated, refreshTrades } = useRealTimeTrades(poolAddress, tokenMint)

  const formatSolAmount = (amount: number) => {
    return amount.toFixed(3)
  }

  const formatTokenAmount = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(2)}m`
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}k`
    }
    return amount.toFixed(0)
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

  const shortenTransaction = (signature: string) => {
    return signature.slice(0, 6)
  }

  const handleRefresh = () => {
    refreshTrades()
  }

  // Check if data is fresh (less than 2 minutes old)
  const isDataFresh = lastUpdated > 0 && (Date.now() - lastUpdated) < 120000

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-medium">Recent Trades</h3>
          {isDataFresh && trades.length > 0 && (
            <div className="flex items-center gap-1 text-green-400 text-xs">
              <Wifi className="w-3 h-3 animate-pulse" />
              <span>Live</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isLoading && (
            <div className="flex items-center gap-1 text-blue-400 text-xs">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading...</span>
            </div>
          )}
          {error && (
            <div className="text-red-400 text-xs">
              {error}
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1 hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
            title="Refresh trades"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Table Headers */}
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">account</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">type</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">SOL</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">{tokenSymbol}</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                date
              </th>
              <th className="text-left px-4 py-3 text-xs font-medium text-slate-400">transaction</th>
            </tr>
          </thead>
          
          {/* Table Body */}
          <tbody>
            {trades.map((trade, index) => (
              <tr 
                key={trade.signature || index}
                className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
              >
                {/* Account */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">🐸</span>
                    </div>
                    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs font-medium">
                      {trade.account}
                    </span>
                  </div>
                </td>

                {/* Type */}
                <td className="px-4 py-3">
                  <span className={`text-sm font-medium ${
                    trade.type === 'buy' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {trade.type}
                  </span>
                </td>

                {/* SOL Amount */}
                <td className="px-4 py-3">
                  <span className="text-white text-sm">
                    {formatSolAmount(trade.solAmount)}
                  </span>
                </td>

                {/* Token Amount */}
                <td className="px-4 py-3">
                  <span className="text-white text-sm">
                    {formatTokenAmount(trade.tokenAmount)}
                  </span>
                </td>

                {/* Date */}
                <td className="px-4 py-3">
                  <span className="text-slate-300 text-sm">
                    {getRelativeTime(trade.timestamp)}
                  </span>
                </td>

                {/* Transaction */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-300 text-sm font-mono">
                      {shortenTransaction(trade.signature)}
                    </span>
                    <a
                      href={`https://explorer.solana.com/tx/${trade.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-400 hover:text-blue-400 transition-colors"
                      title="View transaction"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Loading State */}
      {isLoading && trades.length === 0 && (
        <div className="text-center py-8">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-400" />
          <div className="text-slate-400 text-sm">Loading real-time trades...</div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && trades.length === 0 && (
        <div className="text-center py-8">
          <div className="text-slate-400 text-sm">No recent trades found</div>
          {error && (
            <div className="text-red-400 text-xs mt-2">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Last Updated Info */}
      {lastUpdated > 0 && (
        <div className="px-4 py-2 border-t border-slate-700 bg-slate-800/30">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Last updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
            {isDataFresh && (
              <div className="flex items-center gap-1 text-green-400">
                <Wifi className="w-3 h-3 animate-pulse" />
                <span>Real-time</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}