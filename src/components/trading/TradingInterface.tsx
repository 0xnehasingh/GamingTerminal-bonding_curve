"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowUpDown,
  Coins,
  DollarSign,
  Users,
  Target,
  Zap,
  RefreshCw,
  AlertTriangle,
  Wallet,
  X
} from "lucide-react";
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useLaunchpadContract } from "@/hooks/useLaunchpadContract";
import { usePoolContext } from "@/contexts/PoolContext";
import type { PoolData } from "@/hooks/usePoolStorage";
import toast from 'react-hot-toast';

// Use PoolData directly instead of separate Pool interface
type Pool = PoolData;


export function TradingInterface() {
  const { pools, refreshPools, clearPools } = usePoolContext();
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [solAmount, setSolAmount] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { connected, publicKey } = useWallet();
  const { 
    connected: contractConnected, 
    swapTokensForSol, 
    swapSolForTokens, 
    getSwapPreview,
    checkPoolStatus,
    testSmartContract,
    testAllContractFunctions,
    diagnoseBondingCurve
  } = useLaunchpadContract();

  // Debug: Log pools whenever they change
  useEffect(() => {
    console.log('🏊 TradingInterface - Pools changed:', pools.length, pools);
    if (typeof window !== 'undefined') {
      console.log('🔍 LocalStorage check:', localStorage.getItem('launchpad_pools'));
    }
  }, [pools]);

  // Set default selected pool when pools are loaded
  useEffect(() => {
    if (pools.length > 0 && !selectedPool) {
      console.log('🎯 Setting default selected pool:', pools[0]);
      setSelectedPool(pools[0]);
    }
  }, [pools, selectedPool]);

  // Refresh pools when component mounts and on window focus
  useEffect(() => {
    refreshPools(); // Initial load
    
    const handleFocus = () => {
      console.log('🔄 Window focused, refreshing pools...');
      refreshPools();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshPools]); // Safe to include since refreshPools is now memoized with useCallback

  const handleTrade = async () => {
    if (!connected || !contractConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!selectedPool) {
      toast.error('Please select a pool');
      return;
    }

    if (!solAmount && !tokenAmount) {
      toast.error('Please enter an amount');
      return;
    }

    setIsLoading(true);
    toast.loading(`${tradeType === 'buy' ? 'Buying' : 'Selling'} tokens...`, { id: 'trade' });

    try {
      // Validate addresses before creating PublicKeys
      let poolPubkey: PublicKey;
      let mintPubkey: PublicKey;
      
      try {
        poolPubkey = new PublicKey(selectedPool.poolAddress);
        mintPubkey = new PublicKey(selectedPool.mint);
      } catch (addressError) {
        console.error('❌ Invalid address format:', { 
          poolAddress: selectedPool.poolAddress, 
          mint: selectedPool.mint 
        });
        toast.error('Invalid pool or token address format', { id: 'trade' });
        return;
      }

      // Check pool status before attempting swap
      console.log('🔍 Checking pool status before swap...');
      const poolStatus = await checkPoolStatus(poolPubkey);
      console.log('Pool status result:', poolStatus);
      
      if (!poolStatus.exists) {
        console.log('⚠️ Pool does not exist on-chain, but continuing with swap attempt...');
      }
      
      // Validate amounts are positive before proceeding
      const solAmountFloat = parseFloat(solAmount);
      const tokenAmountFloat = parseFloat(tokenAmount);
      
      if (solAmountFloat <= 0 || tokenAmountFloat <= 0) {
        toast.error('Amount must be greater than 0', { id: 'trade' });
        return;
      }
      
      // Additional validation for reasonable limits
      if (tradeType === 'buy' && solAmountFloat < 0.001) {
        toast.error('Minimum buy amount is 0.001 SOL', { id: 'trade' });
        return;
      }
      
      if (tradeType === 'sell' && tokenAmountFloat < 1) {
        toast.error('Minimum sell amount is 1 token', { id: 'trade' });
        return;
      }
      
      let result;
      if (tradeType === 'buy') {
        const solAmountLamports = Math.floor(Math.abs(solAmountFloat) * 1e9);
        const minTokens = Math.floor(Math.abs(tokenAmountFloat) * 0.98 * 1e6);
        
        console.log('🔢 Buy calculation:', {
          solAmount: solAmountFloat,
          tokenAmount: tokenAmountFloat,
          solAmountLamports,
          minTokens
        });
        
        result = await swapSolForTokens(
          poolPubkey,
          mintPubkey,
          solAmountLamports,
          minTokens
        );
      } else {
        const tokenAmountUnits = Math.floor(Math.abs(tokenAmountFloat) * 1e6);
        const minSolLamports = Math.floor(Math.abs(solAmountFloat) * 0.98 * 1e9);
        
        console.log('🔢 Sell calculation:', {
          solAmount: solAmountFloat,
          tokenAmount: tokenAmountFloat,
          tokenAmountUnits,
          minSolLamports
        });
        
        result = await swapTokensForSol(
          poolPubkey,
          mintPubkey,
          tokenAmountUnits,
          minSolLamports
        );
      }
      
      console.log('Transaction signature:', result.signature);
      toast.success(`${tradeType === 'buy' ? 'Bought' : 'Sold'} tokens successfully!`, { id: 'trade' });
      
      // Reset form
      setSolAmount('');
      setTokenAmount('');
    } catch (error) {
      console.error('Trade error:', error);
      toast.error('Trade failed. Please try again.', { id: 'trade' });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTokenAmount = (sol: string) => {
    if (!sol || !selectedPool || parseFloat(sol) <= 0) return '';
    const solNum = Math.abs(parseFloat(sol)); // Ensure positive
    const tokens = solNum / selectedPool.price;
    return Math.max(0, tokens).toFixed(0); // Ensure non-negative
  };

  const calculateSolAmount = (tokens: string) => {
    if (!tokens || !selectedPool || parseFloat(tokens) <= 0) return '';
    const tokensNum = Math.abs(parseFloat(tokens)); // Ensure positive
    const sol = tokensNum * selectedPool.price;
    return Math.max(0, sol).toFixed(6); // Ensure non-negative
  };

  const handleSolAmountChange = (value: string) => {
    // Only allow positive numbers and decimal points
    const sanitizedValue = value.replace(/[^0-9.]/g, '');
    if (sanitizedValue === '' || parseFloat(sanitizedValue) >= 0) {
      setSolAmount(sanitizedValue);
      setTokenAmount(calculateTokenAmount(sanitizedValue));
    }
  };

  const handleTokenAmountChange = (value: string) => {
    // Only allow positive numbers and decimal points
    const sanitizedValue = value.replace(/[^0-9.]/g, '');
    if (sanitizedValue === '' || parseFloat(sanitizedValue) >= 0) {
      setTokenAmount(sanitizedValue);
      setSolAmount(calculateSolAmount(sanitizedValue));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Trading Hub
          </h1>
          <p className="text-slate-400">Buy and sell memecoins on bonding curves</p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Pool List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5" />
                    Available Pools
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={refreshPools}
                      className="text-slate-400 hover:text-white"
                      title="Refresh pools"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearPools}
                      className="text-red-400 hover:text-red-300"
                      title="Clear all pools"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Debug info */}
                <div className="text-xs text-slate-500 mb-2 p-2 bg-slate-800 rounded">
                  <div>Pools in Context: {pools.length}</div>
                  <div>LocalStorage: {typeof window !== 'undefined' ? 'Available' : 'SSR'}</div>
                  {pools.length > 0 && (
                    <div className="mt-1">
                      <div>Pool names: {pools.map(p => p.name).join(', ')}</div>
                    </div>
                  )}
                </div>
                
                {pools.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 mb-2">No pools created yet</p>
                    <p className="text-sm text-slate-500">Create a token first to see pools here</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={refreshPools}
                      className="mt-2"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                ) : pools.some(pool => {
                  try {
                    new PublicKey(pool.poolAddress);
                    new PublicKey(pool.mint);
                    return false; // Valid pool found
                  } catch {
                    return true; // Invalid pool found
                  }
                }) ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 mb-2">Invalid pools detected</p>
                    <p className="text-sm text-slate-500 mb-4">Some pools have invalid addresses and need to be cleared</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearPools}
                      className="text-red-400 border-red-400 hover:bg-red-400 hover:text-white"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Invalid Pools
                    </Button>
                  </div>
                ) : (
                  pools.map((pool) => (
                  <motion.div
                    key={pool.id}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer transition-all duration-300",
                      selectedPool?.id === pool.id
                        ? "border-primary bg-primary/10"
                        : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600"
                    )}
                    onClick={() => setSelectedPool(pool)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-white">{pool.name}</h3>
                        <p className="text-sm text-slate-400">${pool.symbol}</p>
                      </div>
                      <Badge
                        variant={pool.migrationStatus === 'migrated' ? 'secondary' : 'outline'}
                        className={cn(
                          pool.migrationStatus === 'migrated' && "border-green-500/30 text-green-400",
                          pool.migrationStatus === 'near_migration' && "border-orange-500/30 text-orange-400",
                          pool.migrationStatus === 'active' && "border-blue-500/30 text-blue-400"
                        )}
                      >
                        {pool.migrationStatus === 'migrated' ? 'Migrated' : 
                         pool.migrationStatus === 'near_migration' ? 'Near Migration' : 'Active'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white">${pool.price.toFixed(6)}</span>
                      <span className={cn(
                        "font-medium",
                        pool.change24h >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {pool.change24h >= 0 ? '+' : ''}{pool.change24h}%
                      </span>
                    </div>
                    
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Progress</span>
                        <span>{pool.progress}%</span>
                      </div>
                      <Progress value={pool.progress} className="h-1" />
                    </div>
                  </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Trading Interface */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
          >
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ArrowUpDown className="h-5 w-5" />
                  Trade {selectedPool?.symbol || 'Token'}
                </CardTitle>
                <CardDescription>
                  {selectedPool ? (
                    <>
                      Current price: ${selectedPool.price.toFixed(6)} • 24h change: 
                      <span className={cn(
                        "ml-1 font-medium",
                        selectedPool.change24h >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {selectedPool.change24h >= 0 ? '+' : ''}{selectedPool.change24h}%
                      </span>
                    </>
                  ) : (
                    'Select a pool to start trading'
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Trade Type Selector */}
                <div className="flex bg-slate-800/50 rounded-lg p-1">
                  <button
                    onClick={() => setTradeType('buy')}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all",
                      tradeType === 'buy'
                        ? "bg-green-600 text-white"
                        : "text-slate-400 hover:text-white"
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
                        : "text-slate-400 hover:text-white"
                    )}
                  >
                    <TrendingDown className="w-4 h-4 inline mr-2" />
                    Sell
                  </button>
                </div>


                {/* Current Status Info */}
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 mb-4">
                  <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Current Status</span>
                  </div>
                  <p className="text-sm text-blue-300">
                    ✅ Token creation: Real SPL tokens created on devnet<br/>
                    ✅ Pool creation: Real smart contract pools working<br/>
                    ❌ Trading: Smart contract bonding curve panics at line 132<br/>
                    💡 Status: Infrastructure ready, but smart contract has bonding curve bug
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        console.log('🔍 Testing smart contract...')
                        const result = await testSmartContract()
                        console.log('📊 Smart contract test result:', result)
                        if (result.exists) {
                          toast.success('Smart contract is deployed and accessible!')
                        } else {
                          toast.error(`Smart contract issue: ${result.error}`)
                        }
                      }}
                      className="text-xs"
                    >
                      🔍 Test Contract
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        console.log('🧪 Testing all contract functions...')
                        const results = await testAllContractFunctions()
                        console.log('📊 All function test results:', results)
                        const successCount = results.filter(r => r.success).length
                        toast.success(`Function test complete: ${successCount}/${results.length} functions recognized`)
                      }}
                      className="text-xs"
                    >
                      🧪 Test All Functions
                    </Button>
                    {selectedPool && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          console.log('📊 Diagnosing bonding curve...')
                          try {
                            const poolPubkey = new PublicKey(selectedPool.poolAddress)
                            const mintPubkey = new PublicKey(selectedPool.mint)
                            const result = await diagnoseBondingCurve(poolPubkey, mintPubkey)
                            console.log('📊 Bonding curve diagnostic result:', result)
                            if (result.poolReady) {
                              toast.success(`Bonding curve ready! Recommended max: ${result.recommendedMaxSwap} SOL`)
                            } else {
                              toast.error(`Bonding curve issue: ${result.error}`)
                            }
                          } catch (error) {
                            toast.error(`Diagnostic failed: ${error.message}`)
                          }
                        }}
                        className="text-xs"
                      >
                        📊 Diagnose Curve
                      </Button>
                    )}
                  </div>
                </div>

                {/* Migration Warning */}
                {selectedPool?.migrationStatus === 'near_migration' && (
                  <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/30">
                    <div className="flex items-center gap-2 text-orange-400 mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Migration Alert</span>
                    </div>
                    <p className="text-sm text-orange-300">
                      This pool is near the 80% threshold for automatic migration to Raydium DEX.
                    </p>
                  </div>
                )}

                {/* Trade Inputs */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                      {tradeType === 'buy' ? 'You Pay (SOL)' : 'You Receive (SOL)'}
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0.0"
                        value={solAmount}
                        onChange={(e) => handleSolAmountChange(e.target.value)}
                        className="pr-16 bg-slate-800/50 border-slate-700 text-white"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-slate-400">
                        SOL
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="p-2 bg-slate-800/50 rounded-full">
                      <ArrowUpDown className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">
                      {tradeType === 'buy' ? 'You Receive' : 'You Pay'} ({selectedPool?.symbol || 'TOKEN'})
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0"
                        value={tokenAmount}
                        onChange={(e) => handleTokenAmountChange(e.target.value)}
                        className="pr-20 bg-slate-800/50 border-slate-700 text-white"
                      />
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-slate-400">
                        {selectedPool?.symbol || 'TOKEN'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trade Summary */}
                {(solAmount || tokenAmount) && selectedPool && (
                  <div className="p-4 rounded-lg bg-slate-800/30 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Rate</span>
                      <span className="text-white">1 {selectedPool.symbol} = ${selectedPool.price.toFixed(6)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Platform Fee (1%)</span>
                      <span className="text-white">
                        {solAmount ? (parseFloat(solAmount) * 0.01).toFixed(6) : '0'} SOL
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Slippage Tolerance</span>
                      <span className="text-white">2%</span>
                    </div>
                  </div>
                )}

                {/* Wallet Connection */}
                {!connected ? (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
                    <Wallet className="h-6 w-6 mx-auto mb-2 text-blue-400" />
                    <p className="text-blue-300 mb-4">Connect your wallet to start trading</p>
                    <WalletMultiButton className="!bg-gradient-to-r !from-blue-500 !to-blue-600 hover:!from-blue-600 hover:!to-blue-700" />
                  </div>
                ) : (
                  /* Trade Button */
                  <Button
                    onClick={handleTrade}
                    disabled={isLoading || (!solAmount && !tokenAmount)}
                    className={cn(
                      "w-full py-6 text-lg font-semibold transition-all duration-300",
                      tradeType === 'buy'
                        ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                        : "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700"
                    )}
                  >
                    {isLoading ? (
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    ) : tradeType === 'buy' ? (
                      <TrendingUp className="w-5 h-5 mr-2" />
                    ) : (
                      <TrendingDown className="w-5 h-5 mr-2" />
                    )}
                    {isLoading ? 'Processing...' : `${tradeType === 'buy' ? 'Buy' : 'Sell'} ${selectedPool?.symbol || 'Token'}`}
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pool Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Pool Stats */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Pool Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPool ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Market Cap</span>
                      <span className="text-white font-medium">{selectedPool.marketCap}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">24h Volume</span>
                      <span className="text-white font-medium">{selectedPool.volume24h}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Participants</span>
                      <span className="text-white font-medium">{selectedPool.participants.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Progress to Migration</span>
                      <span className="text-white font-medium">{selectedPool.progress}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-slate-400">Select a pool to view stats</p>
                  </div>
                )}
                
                {selectedPool && (
                  <div className="pt-3 border-t border-slate-700">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-400">Migration Progress</span>
                      <span className="text-white">{selectedPool.progress}/100%</span>
                    </div>
                    <Progress 
                      value={selectedPool.progress} 
                      className={cn(
                        "h-2",
                        selectedPool.progress >= 80 && "migration-ready"
                      )} 
                    />
                    <p className="text-xs text-slate-500 mt-2">
                      {selectedPool.progress >= 80 
                        ? 'Ready for automatic migration to Raydium'
                        : `${80 - selectedPool.progress}% remaining until migration`
                      }
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pool Actions */}
            <Card className="bg-slate-900/50 border-slate-700/50">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full" onClick={() => handleSolAmountChange('0.001')}>
                  Test 0.001 SOL
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handleSolAmountChange('0.01')}>
                  Test 0.01 SOL  
                </Button>
                <Button variant="outline" className="w-full" onClick={() => handleSolAmountChange('0.1')}>
                  Test 0.1 SOL
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 