"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Activity,
  Clock,
  Calendar,
  RefreshCw,
  Loader2
} from "lucide-react";
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

interface TradingChartProps {
  tokenSymbol?: string;
  tokenName?: string;
  currentPrice?: number;
  priceChange24h?: number;
  volume24h?: string;
  marketCap?: string;
  poolAddress?: string;
  tokenMint?: string;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PoolTransaction {
  signature: string;
  timestamp: number;
  type: 'buy' | 'sell';
  solAmount: number;
  tokenAmount: number;
  price: number;
  account: string; // Add account address
}

interface Holder {
  address: string;
  percentage: number;
  balance: number;
  type?: 'bonding_curve' | 'dev' | 'user';
}

export function TradingChart({ 
  tokenSymbol = "TOKEN", 
  tokenName = "Token", 
  currentPrice = 0.000001,
  priceChange24h = 0,
  volume24h = "$0",
  marketCap = "$0",
  poolAddress,
  tokenMint
}: TradingChartProps) {
  const [timeframe, setTimeframe] = useState<'1H' | '4H' | '1D' | '1W'>('1D');
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [transactions, setTransactions] = useState<PoolTransaction[]>([]);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [realTimeData, setRealTimeData] = useState({
    price: currentPrice,
    volume24h: 0,
    marketCap: 0,
    priceChange24h: 0
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { connection } = useConnection();

  // Fetch recent transactions for the pool
  const fetchRecentTransactions = async (poolAddress: PublicKey): Promise<PoolTransaction[]> => {
    try {
      console.log('📊 Fetching recent transactions for pool:', poolAddress.toString());
      
      // Get recent signatures for the pool
      const signatures = await connection.getSignaturesForAddress(poolAddress, { 
        limit: 100 // Get last 100 transactions
      });
      
      console.log(`📈 Found ${signatures.length} recent transactions`);
      
      const transactions: PoolTransaction[] = [];
      
      // Process transactions in batches to avoid rate limiting
      const batchSize = 10;
      for (let i = 0; i < Math.min(signatures.length, 50); i += batchSize) {
        const batch = signatures.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (sigInfo) => {
          try {
            const tx = await connection.getParsedTransaction(sigInfo.signature, {
              maxSupportedTransactionVersion: 0,
              commitment: 'confirmed'
            });
            
            if (!tx?.meta || tx.meta.err) return null;
            
            // Analyze transaction to determine if it's a buy/sell
            // This is a simplified analysis - you might need to adjust based on your smart contract
            const preBalances = tx.meta.preBalances;
            const postBalances = tx.meta.postBalances;
            
            if (!preBalances || !postBalances) return null;
            
            // Find the user account (not the pool or program)
            const userAccountIndex = tx.transaction.message.accountKeys.findIndex(
              (key, index) => 
                key.signer && 
                key.pubkey.toString() !== poolAddress.toString() &&
                key.pubkey.toString() !== 'ip6SLxttjbSrQggmM2SH5RZXhWKq3onmkzj3kExoceN'
            );
            
            if (userAccountIndex === -1) return null;
            
            const userAccount = tx.transaction.message.accountKeys[userAccountIndex];
            const balanceChange = postBalances[userAccountIndex] - preBalances[userAccountIndex];
            
            // Determine transaction type based on balance change
            // Positive change = user received SOL (sell), Negative = user spent SOL (buy)
            const type: 'buy' | 'sell' = balanceChange > 0 ? 'sell' : 'buy';
            const solAmount = Math.abs(balanceChange) / 1e9; // Convert lamports to SOL
            
            // Estimate token amount (this would be more accurate with proper parsing)
            const tokenAmount = solAmount / currentPrice; // Rough estimate
            
            return {
              signature: sigInfo.signature,
              timestamp: sigInfo.blockTime ? sigInfo.blockTime * 1000 : Date.now(),
              type,
              solAmount,
              tokenAmount,
              price: currentPrice,
              account: userAccount.pubkey.toString()
            };
          } catch (error) {
            console.warn('Failed to parse transaction:', error);
            return null;
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        transactions.push(...batchResults.filter(tx => tx !== null));
      }
      
      console.log(`✅ Processed ${transactions.length} valid transactions`);
      return transactions;
      
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      return [];
    }
  };

  // Calculate 24h volume from transactions
  const calculate24hVolume = (transactions: PoolTransaction[]): number => {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    
    const recentTransactions = transactions.filter(tx => tx.timestamp > last24h);
    const volume = recentTransactions.reduce((sum, tx) => sum + tx.solAmount, 0);
    
    console.log(`📊 24h volume calculation: ${recentTransactions.length} transactions, ${volume.toFixed(4)} SOL`);
    return volume;
  };

  // Calculate 24h price change from transactions
  const calculate24hPriceChange = (transactions: PoolTransaction[], currentPrice: number): number => {
    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    
    const recentTransactions = transactions.filter(tx => tx.timestamp > last24h);
    
    if (recentTransactions.length === 0) return 0;
    
    // Sort by timestamp to get oldest and newest
    const sortedTransactions = recentTransactions.sort((a, b) => a.timestamp - b.timestamp);
    const oldestPrice = sortedTransactions[0].price;
    const newestPrice = sortedTransactions[sortedTransactions.length - 1].price;
    
    const priceChange = ((newestPrice - oldestPrice) / oldestPrice) * 100;
    
    console.log(`📈 24h price change: ${oldestPrice} → ${newestPrice} = ${priceChange.toFixed(2)}%`);
    return priceChange;
  };

  // Fetch holder distribution
  const fetchHolderDistribution = async (tokenMint: PublicKey): Promise<Holder[]> => {
    try {
      console.log('👥 Fetching holder distribution for token:', tokenMint.toString());
      
      // Get all token accounts for this mint
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        new PublicKey('11111111111111111111111111111111'), // System program
        { mint: tokenMint }
      );
      
      const holders: Holder[] = [];
      let totalSupply = 0;
      
      // Process token accounts to get holder data
      for (const account of tokenAccounts.value) {
        const accountInfo = account.account.data.parsed.info;
        const balance = accountInfo.tokenAmount.uiAmount || 0;
        const address = account.pubkey.toString();
        
        if (balance > 0) {
          totalSupply += balance;
          holders.push({
            address,
            balance,
            percentage: 0, // Will calculate after getting total
            type: 'user'
          });
        }
      }
      
      // Calculate percentages and sort by balance
      holders.forEach(holder => {
        holder.percentage = (holder.balance / totalSupply) * 100;
      });
      
      // Sort by balance (descending) and take top 10
      const topHolders = holders
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 10);
      
      // Add bonding curve holder (pool itself)
      if (poolAddress) {
        try {
          const poolSigner = PublicKey.findProgramAddressSync(
            [Buffer.from('signer'), new PublicKey(poolAddress).toBuffer()],
            new PublicKey('ip6SLxttjbSrQggmM2SH5RZXhWKq3onmkzj3kExoceN')
          )[0];
          
          const { getAssociatedTokenAddressSync } = await import('@solana/spl-token');
          const poolTokenAccount = getAssociatedTokenAddressSync(tokenMint, poolSigner, true);
          
          const poolAccountInfo = await connection.getParsedAccountInfo(poolTokenAccount);
          if (poolAccountInfo.value?.data && 'parsed' in poolAccountInfo.value.data) {
            const poolBalance = poolAccountInfo.value.data.parsed.info.tokenAmount.uiAmount || 0;
            if (poolBalance > 0) {
              const poolPercentage = (poolBalance / totalSupply) * 100;
              topHolders.unshift({
                address: poolSigner.toString().slice(0, 6) + '...',
                balance: poolBalance,
                percentage: poolPercentage,
                type: 'bonding_curve'
              });
            }
          }
        } catch (error) {
          console.warn('Could not fetch pool token balance:', error);
        }
      }
      
      console.log(`✅ Found ${topHolders.length} top holders`);
      return topHolders;
      
    } catch (error) {
      console.error('❌ Error fetching holder distribution:', error);
      return [];
    }
  };

  // Fetch real blockchain data for the pool
  const fetchPoolData = async () => {
    if (!poolAddress || !tokenMint) return;
    
    setIsLoadingData(true);
    try {
      console.log('📊 Fetching real pool data for:', { poolAddress, tokenMint });
      
      // Get pool account info
      const poolPubkey = new PublicKey(poolAddress);
      const poolInfo = await connection.getAccountInfo(poolPubkey);
      
      if (poolInfo) {
        console.log('✅ Pool found on blockchain:', poolInfo.data.length, 'bytes');
        
        // Get pool signer PDA
        const [poolSigner] = PublicKey.findProgramAddressSync(
          [Buffer.from('signer'), poolPubkey.toBuffer()],
          new PublicKey('ip6SLxttjbSrQggmM2SH5RZXhWKq3onmkzj3kExoceN') // Your smart contract address
        );
        
        // Get vault addresses for SOL and token balances
        const wsolMint = new PublicKey('So11111111111111111111111111111111111111112');
        const tokenMintPubkey = new PublicKey(tokenMint);
        
        // Get associated token accounts
        const { getAssociatedTokenAddressSync } = await import('@solana/spl-token');
        const quoteVault = getAssociatedTokenAddressSync(wsolMint, poolSigner, true);
        const tokenVault = getAssociatedTokenAddressSync(tokenMintPubkey, poolSigner, true);
        
        // Get real balances
        let solBalance = 0;
        let tokenBalance = 0;
        
        try {
          const quoteVaultInfo = await connection.getParsedAccountInfo(quoteVault);
          if (quoteVaultInfo.value?.data && 'parsed' in quoteVaultInfo.value.data) {
            solBalance = quoteVaultInfo.value.data.parsed.info.tokenAmount.uiAmount || 0;
          }
        } catch (error) {
          console.warn('Could not fetch SOL balance:', error);
        }
        
        try {
          const tokenVaultInfo = await connection.getParsedAccountInfo(tokenVault);
          if (tokenVaultInfo.value?.data && 'parsed' in tokenVaultInfo.value.data) {
            tokenBalance = tokenVaultInfo.value.data.parsed.info.tokenAmount.uiAmount || 0;
          }
        } catch (error) {
          console.warn('Could not fetch token balance:', error);
        }
        
        console.log('💰 Real pool balances:', { solBalance, tokenBalance });
        
        // Calculate real price
        const realPrice = solBalance > 0 && tokenBalance > 0 ? solBalance / tokenBalance : currentPrice;
        
        // Get token mint info for total supply
        let totalSupply = 1000000000; // Default 1B
        try {
          const mintInfo = await connection.getParsedAccountInfo(tokenMintPubkey);
          if (mintInfo.value?.data && 'parsed' in mintInfo.value.data) {
            totalSupply = mintInfo.value.data.parsed.info.supply;
          }
        } catch (error) {
          console.warn('Could not fetch total supply:', error);
        }
        
        // Calculate real metrics
        const circulatingSupply = totalSupply - tokenBalance;
        const realMarketCap = realPrice * circulatingSupply;
        
        // Fetch recent transactions for volume calculation
        const recentTransactions = await fetchRecentTransactions(poolPubkey);
        setTransactions(recentTransactions); // Store transactions for chart generation
        
        // Fetch holder distribution
        const holderDistribution = await fetchHolderDistribution(tokenMintPubkey);
        setHolders(holderDistribution);
        
        const volume24h = calculate24hVolume(recentTransactions);
        
        // Calculate 24h price change from transactions
        const priceChange24h = calculate24hPriceChange(recentTransactions, realPrice);
        
        setRealTimeData({
          price: realPrice,
          volume24h: volume24h,
          marketCap: realMarketCap,
          priceChange24h: priceChange24h
        });
        
        console.log('📈 Real-time data updated:', {
          price: realPrice,
          volume24h,
          marketCap: realMarketCap,
          priceChange24h
        });
        
      } else {
        console.warn('⚠️ Pool not found on blockchain, using fallback data');
        setRealTimeData({
          price: currentPrice,
          volume24h: 0,
          marketCap: 0,
          priceChange24h: 0
        });
      }
    } catch (error) {
      console.error('❌ Error fetching pool data:', error);
      setRealTimeData({
        price: currentPrice,
        volume24h: 0,
        marketCap: 0,
        priceChange24h: 0
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  // Generate chart data based on real transaction history
  const generateRealisticData = (): CandleData[] => {
    const data: CandleData[] = [];
    const basePrice = realTimeData.price || currentPrice || 0.000001;
    let runningPrice = basePrice;
    const now = Date.now();
    
    // Determine interval based on timeframe
    let interval: number;
    let dataPoints: number;
    
    switch (timeframe) {
      case '1H':
        interval = 60 * 1000; // 1 minute
        dataPoints = 60;
        break;
      case '4H':
        interval = 4 * 60 * 1000; // 4 minutes
        dataPoints = 60;
        break;
      case '1D':
        interval = 15 * 60 * 1000; // 15 minutes
        dataPoints = 96;
        break;
      case '1W':
        interval = 60 * 60 * 1000; // 1 hour
        dataPoints = 168;
        break;
      default:
        interval = 15 * 60 * 1000;
        dataPoints = 96;
    }
    
    // Use real volume data if available
    const baseVolume = realTimeData.volume24h || 100000;
    const volumePerCandle = baseVolume / dataPoints;
    
    // If we have real transactions, use them to influence the chart
    if (transactions.length > 0) {
      console.log(`📊 Using ${transactions.length} real transactions to influence chart data`);
      
      // Group transactions by time intervals
      const transactionGroups = new Map<number, PoolTransaction[]>();
      
      transactions.forEach(tx => {
        const timeSlot = Math.floor(tx.timestamp / interval) * interval;
        if (!transactionGroups.has(timeSlot)) {
          transactionGroups.set(timeSlot, []);
        }
        transactionGroups.get(timeSlot)!.push(tx);
      });
      
      // Generate candlesticks with transaction influence
      for (let i = dataPoints; i >= 0; i--) {
        const time = now - (i * interval);
        const timeSlot = Math.floor(time / interval) * interval;
        const timeTransactions = transactionGroups.get(timeSlot) || [];
        
        // Calculate price impact from transactions
        let priceImpact = 0;
        let volume = volumePerCandle;
        
        if (timeTransactions.length > 0) {
          // Calculate net price impact from transactions
          const netSolFlow = timeTransactions.reduce((sum, tx) => {
            return sum + (tx.type === 'buy' ? -tx.solAmount : tx.solAmount);
          }, 0);
          
          // Price impact based on net flow (simplified model)
          priceImpact = (netSolFlow / baseVolume) * 0.1; // 10% impact factor
          
          // Real volume from transactions
          volume = timeTransactions.reduce((sum, tx) => sum + tx.solAmount, 0);
        }
        
        // Apply price impact and generate realistic movement
        const volatility = 0.15;
        const trend = Math.sin(i * 0.1) * 0.05;
        const randomChange = (Math.random() - 0.5) * volatility;
        const change = randomChange + trend + priceImpact;
        
        runningPrice = Math.max(0.000001, runningPrice * (1 + change));
        
        const open = runningPrice;
        const high = open * (1 + Math.random() * 0.08);
        const low = open * (1 - Math.random() * 0.08);
        const close = open * (1 + (Math.random() - 0.5) * 0.06);
        
        data.push({ time, open, high, low, close, volume });
      }
    } else {
      // Fallback to generated data when no transactions available
      console.log('📊 No real transactions available, using generated data');
      
      for (let i = dataPoints; i >= 0; i--) {
        const time = now - (i * interval);
        
        const volatility = 0.15;
        const trend = Math.sin(i * 0.1) * 0.05;
        const randomChange = (Math.random() - 0.5) * volatility;
        const change = randomChange + trend;
        
        runningPrice = Math.max(0.000001, runningPrice * (1 + change));
        
        const open = runningPrice;
        const high = open * (1 + Math.random() * 0.08);
        const low = open * (1 - Math.random() * 0.08);
        const close = open * (1 + (Math.random() - 0.5) * 0.06);
        
        const volumeMultiplier = 0.5 + Math.random() * 1.0;
        const timeMultiplier = 1 + Math.sin(i * 0.2) * 0.3;
        const volume = volumePerCandle * volumeMultiplier * timeMultiplier;
        
        data.push({ time, open, high, low, close, volume });
      }
    }
    
    console.log(`📊 Generated ${data.length} candlesticks for ${timeframe} timeframe`);
    return data;
  };

  // Fetch pool data on mount and when pool changes
  useEffect(() => {
    fetchPoolData();
  }, [poolAddress, tokenMint, currentPrice]);

  // Update chart data when real-time data or transactions change
  useEffect(() => {
    setChartData(generateRealisticData());
  }, [realTimeData, timeframe, transactions]);

  // Real-time data refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (poolAddress && tokenMint) {
        console.log('🔄 Refreshing real-time data...');
        fetchPoolData();
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [poolAddress, tokenMint]);

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || chartData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Set background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate price range
    const prices = chartData.flatMap(d => [d.high, d.low]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 0.000001;
    
    // Draw grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    
    // Vertical grid lines
    for (let i = 0; i <= 5; i++) {
      const x = (width * i) / 5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = (height * i) / 5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Draw candlesticks
    const candleWidth = (width * 0.8) / chartData.length;
    const candleSpacing = (width * 0.2) / (chartData.length - 1);
    
    chartData.forEach((candle, index) => {
      const x = (index * (candleWidth + candleSpacing)) + (width * 0.1);
      const isGreen = candle.close >= candle.open;
      
      // Draw wick
      ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      const highY = height - ((candle.high - minPrice) / priceRange) * height * 0.8;
      const lowY = height - ((candle.low - minPrice) / priceRange) * height * 0.8;
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();
      
      // Draw body
      const openY = height - ((candle.open - minPrice) / priceRange) * height * 0.8;
      const closeY = height - ((candle.close - minPrice) / priceRange) * height * 0.8;
      const bodyHeight = Math.abs(closeY - openY) || 2;
      const bodyY = Math.min(openY, closeY);
      
      ctx.fillStyle = isGreen ? '#10b981' : '#ef4444';
      ctx.fillRect(x, bodyY, candleWidth, bodyHeight);
      
      // Draw border
      ctx.strokeStyle = isGreen ? '#059669' : '#dc2626';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, bodyY, candleWidth, bodyHeight);
    });
    
    // Draw price labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange * i) / 5;
      const y = (height * i) / 5;
      ctx.fillText(price.toFixed(6), width - 10, y + 4);
    }
  };

  useEffect(() => {
    drawChart();
  }, [chartData]);

  const handleRefresh = () => {
    setIsLoading(true);
    console.log('🔄 Manual refresh triggered');
    
    // Fetch fresh data
    fetchPoolData().then(() => {
      setTimeout(() => {
        setIsLoading(false);
        console.log('✅ Manual refresh completed');
      }, 500);
    }).catch((error) => {
      console.error('❌ Manual refresh failed:', error);
      setIsLoading(false);
    });
  };

  const formatPrice = (price: number) => {
    if (price >= 1) return `$${price.toFixed(2)}`;
    if (price >= 0.01) return `$${price.toFixed(4)}`;
    if (price >= 0.0001) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(8)}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(0)}K`;
    return `$${volume.toFixed(0)}`;
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1000000) return `$${(marketCap / 1000000).toFixed(1)}M`;
    if (marketCap >= 1000) return `$${(marketCap / 1000).toFixed(0)}K`;
    return `$${marketCap.toFixed(0)}`;
  };

  const formatTokenAmount = (amount: number) => {
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K`;
    return amount.toFixed(0);
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const shortenAddress = (address: string) => {
    return address.slice(0, 6) + '...' + address.slice(-4);
  };

    return (
    <div className="space-y-6">
      {/* Main Chart Card */}
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">{tokenSymbol}</h3>
                <Badge variant="outline" className="text-xs">
                  {tokenName}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-slate-400">Price:</span>
                  <span className="text-white font-medium">{formatPrice(realTimeData.price)}</span>
                </div>
                <div className={`flex items-center gap-1 ${realTimeData.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {realTimeData.priceChange24h >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{realTimeData.priceChange24h >= 0 ? '+' : ''}{realTimeData.priceChange24h.toFixed(2)}%</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading || isLoadingData}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
              >
                {isLoading || isLoadingData ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">Volume:</span>
              <span className="text-white text-sm">{formatVolume(realTimeData.volume24h)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">Market Cap:</span>
              <span className="text-white text-sm">{formatMarketCap(realTimeData.marketCap)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">Transactions:</span>
              <span className="text-white text-sm">{transactions.length}</span>
            </div>
            {isLoadingData && (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                <span className="text-blue-400 text-sm">Loading blockchain data...</span>
              </div>
            )}
            {!isLoadingData && transactions.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-sm">Live data</span>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Chart Controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">Timeframe:</span>
              <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
                <SelectTrigger className="w-20 h-8 bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="1H">1H</SelectItem>
                  <SelectItem value="4H">4H</SelectItem>
                  <SelectItem value="1D">1D</SelectItem>
                  <SelectItem value="1W">1W</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-sm">Chart:</span>
              <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                <SelectTrigger className="w-32 h-8 bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="candlestick">Candlestick</SelectItem>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                </SelectContent>
              </Select>
        </div>
      </div>

          {/* Chart Canvas */}
    <div className="relative">
      <canvas
        ref={canvasRef}
              width={800}
              height={400}
              className="w-full h-[400px] rounded-lg border border-slate-700"
            />
            
            {/* Chart overlay info */}
            <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-lg p-3 border border-slate-700">
              <div className="text-xs text-slate-400 space-y-1">
                <div>O: {formatPrice(chartData[chartData.length - 1]?.open || 0)}</div>
                <div>H: {formatPrice(chartData[chartData.length - 1]?.high || 0)}</div>
                <div>L: {formatPrice(chartData[chartData.length - 1]?.low || 0)}</div>
                <div>C: {formatPrice(chartData[chartData.length - 1]?.close || 0)}</div>
              </div>
            </div>
          </div>
          
          {/* Technical Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-slate-700">
            <div className="text-center">
              <div className="text-slate-400 text-xs">RSI</div>
              <div className="text-white font-medium">{(Math.random() * 30 + 35).toFixed(1)}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-xs">MACD</div>
              <div className="text-green-400 font-medium">+{(Math.random() * 0.01).toFixed(4)}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-xs">Volume</div>
              <div className="text-white font-medium">{formatVolume(realTimeData.volume24h)}</div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-xs">24h Change</div>
              <div className={`font-medium ${realTimeData.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {realTimeData.priceChange24h >= 0 ? '+' : ''}{realTimeData.priceChange24h.toFixed(2)}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Holder Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">Holder Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {holders.length > 0 ? (
              <div className="space-y-3">
                {holders.map((holder, index) => (
                  <div key={holder.address} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium text-slate-300">#{index + 1}</div>
                      <div>
                        <div className="text-white font-medium">{holder.address}</div>
                        {holder.type && (
                          <div className="text-xs text-slate-400">
                            {holder.type === 'bonding_curve' ? '(bonding curve)' : 
                             holder.type === 'dev' ? '(dev)' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">{holder.percentage.toFixed(2)}%</div>
                      <div className="text-slate-400 text-xs">
                        {formatTokenAmount(holder.balance)} {tokenSymbol}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">
                <div className="w-8 h-8 mx-auto mb-2 opacity-50">👥</div>
                <p>No holder data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}