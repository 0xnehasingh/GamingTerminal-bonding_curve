"use client";

import React, { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Activity, 
  Zap,
  Gamepad2,
  Rocket,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Star,
  Trophy,
  Coins
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRealSmartContract } from "@/hooks/useRealSmartContract";
import { FeaturedTokensGrid } from "@/components/dashboard/FeaturedTokensGrid";

// Animated Radial Chart Component
function AnimatedRadialChart({ 
  value = 74, 
  size = 120,
  strokeWidth = 8,
  className,
  duration = 2
}: {
  value?: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  duration?: number;
}) {
  const radius = size * 0.35;
  const center = size / 2;
  const circumference = Math.PI * radius;

  const animatedValue = useMotionValue(0);
  const offset = useTransform(animatedValue, [0, 100], [circumference, 0]);

  useEffect(() => {
    const controls = animate(animatedValue, value, {
      duration,
      ease: "easeOut",
    });

    return controls.stop;
  }, [value, animatedValue, duration]);

  const fontSize = Math.max(12, size * 0.08);

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size * 0.7 }}>
      <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`} className="overflow-visible">
        <defs>
          <linearGradient id={`progressGradient-${size}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="50%" stopColor="#059669" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>
        </defs>

        <path
          d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
        />

        <motion.path
          d={`M ${center - radius} ${center} A ${radius} ${radius} 0 0 1 ${center + radius} ${center}`}
          fill="none"
          stroke={`url(#progressGradient-${size})`}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="font-bold tracking-tight mt-4"
          style={{ fontSize: `${fontSize}px` }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: duration * 0.75 }}
        >
          <span className="text-green-400">
            <motion.span>{useTransform(animatedValue, (latest) => Math.round(latest))}</motion.span>%
          </span>
        </motion.div>
      </div>
    </div>
  );
}

// Main Dashboard Component
export function Dashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("24h");
  const { pools, metrics, isLoading, error, refreshContractData } = useRealSmartContract();

  // Format metrics data for display from smart contract
  const formattedMetrics = [
    {
      title: "Total Pools Created",
      value: metrics.totalPools.toLocaleString(),
      change: "+12.5%", // Could be calculated from historical data
      trend: "up" as const,
      icon: Gamepad2,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Trading Volume",
      value: metrics.totalVolume > 1000000 
        ? `$${(metrics.totalVolume / 1000000).toFixed(1)}M`
        : metrics.totalVolume > 1000
        ? `$${(metrics.totalVolume / 1000).toFixed(0)}K`
        : `$${metrics.totalVolume.toFixed(0)}`,
      change: "+8.2%",
      trend: "up" as const,
      icon: DollarSign,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Active Traders",
      value: metrics.activeTraders.size.toLocaleString(),
      change: "-2.1%",
      trend: "down" as const,
      icon: Users,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Migration Success",
      value: `${metrics.migrationSuccessRate.toFixed(1)}%`,
      change: "+1.3%",
      trend: "up" as const,
      icon: Rocket,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
    },
  ];

  // Activity icons mapping
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'pool_created': return Zap;
      case 'trade': return TrendingUp;
      case 'migration': return Rocket;
      default: return Activity;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'pool_created': return 'text-purple-400';
      case 'trade': return 'text-green-400';
      case 'migration': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-900/50 to-slate-950"></div>
      <div className="fixed inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      <div className="relative z-10 p-6 space-y-8">
        {/* Header */}
        <motion.div 
          className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Gaming Terminal
            </h1>
            <p className="text-slate-400 mt-2">Memecoin Launchpad Dashboard</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              onClick={refreshContractData}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              {isLoading ? "Refreshing..." : "Refresh Data"}
            </Button>
            
            <div className="flex bg-slate-800/50 rounded-lg p-1">
              {["1h", "24h", "7d", "30d"].map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => setSelectedTimeframe(timeframe)}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-all",
                    selectedTimeframe === timeframe
                      ? "bg-purple-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  )}
                >
                  {timeframe}
                </button>
              ))}
            </div>
            <Button 
              onClick={refreshContractData}
              variant="outline"
              disabled={isLoading}
              className="border-purple-500/30 text-purple-400 hover:bg-purple-600 hover:text-white"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Refresh Contract Data
            </Button>
            {error && (
              <div className={cn(
                "px-3 py-1 border rounded text-sm",
                error.includes("Rate limited") || error.includes("demo data")
                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              )}>
                {error.includes("Rate limited") || error.includes("demo data") 
                  ? "🔄 Using demo data (rate limited)" 
                  : `Contract Error: ${error.slice(0, 30)}...`
                }
              </div>
            )}
            <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
              <Gamepad2 className="w-4 h-4 mr-2" />
              Create Pool
            </Button>
          </div>
        </motion.div>

        {/* Metrics Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {formattedMetrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm hover:bg-slate-800/50 transition-all duration-300 card-hover">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-400">
                    {metric.title}
                  </CardTitle>
                  <div className={cn("p-2 rounded-lg", metric.bgColor)}>
                    <metric.icon className={cn("h-4 w-4", metric.color)} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{metric.value}</div>
                  <div className="flex items-center text-xs">
                    {metric.trend === "up" ? (
                      <ArrowUpRight className="h-3 w-3 text-green-400 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-400 mr-1" />
                    )}
                    <span className={metric.trend === "up" ? "text-green-400" : "text-red-400"}>
                      {metric.change}
                    </span>
                    <span className="text-slate-400 ml-1">vs last {selectedTimeframe}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Featured Tokens Grid */}
        <motion.div 
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
                      <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">All Minted Tokens</h2>
                <p className="text-slate-400">
                  {error && (error.includes("Rate limited") || error.includes("demo data"))
                    ? "Showing demo data due to rate limiting"
                    : `Showing ${pools.filter(p => p.tokenName && p.tokenSymbol).length} tokens with real blockchain metadata from smart contract ip6SLxttjbSrQggmM2SH5RZXhWKq3onmkzj3kExoceN`
                  }
                  {error && (error.includes("Rate limited") || error.includes("demo data")) && (
                    <Badge variant="outline" className="ml-2 border-yellow-500/30 text-yellow-400 text-xs">
                      Demo Data
                    </Badge>
                  )}
                  {!error && (
                    <Badge variant="outline" className="ml-2 border-green-500/30 text-green-400 text-xs">
                      {pools.filter(p => p.tokenName && p.tokenSymbol).length} Real Tokens
                    </Badge>
                  )}
                </p>
              </div>
              <Button
                onClick={refreshContractData}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mr-2" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </Button>
            </div>
          
          <FeaturedTokensGrid pools={pools} isLoading={isLoading} />
        </motion.div>

        {/* Charts and Migration Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Migration Success Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Migration Success Rate</CardTitle>
                <CardDescription>
                  Percentage of successful pool migrations to DEX
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center py-8">
                <AnimatedRadialChart value={metrics.migrationSuccessRate} size={200} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Quick Actions</CardTitle>
                <CardDescription>
                  Launch, trade, and manage your tokens
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {[
                  { label: "Create Pool", icon: Gamepad2, color: "from-purple-600 to-pink-600" },
                  { label: "Trade Tokens", icon: TrendingUp, color: "from-green-600 to-emerald-600" },
                  { label: "View Analytics", icon: Activity, color: "from-blue-600 to-cyan-600" },
                  { label: "Migrate Pool", icon: Rocket, color: "from-orange-600 to-red-600" },
                ].map((action, index) => (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
                  >
                    <Button 
                      className={cn(
                        "w-full h-16 bg-gradient-to-r hover:scale-105 transition-all duration-300",
                        action.color
                      )}
                    >
                      <action.icon className="w-5 h-5 mr-2" />
                      {action.label}
                    </Button>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Optimization Status and Cache Manager */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {/* OptimizationStatus component was removed, so this section is now empty */}
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            {/* CacheManager component was removed, so this section is now empty */}
          </motion.div>
        </div>

        {/* Smart Contract Tester */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          {/* SmartContractTester component was removed, so this section is now empty */}
        </motion.div>
      </div>
    </div>
  );
} 