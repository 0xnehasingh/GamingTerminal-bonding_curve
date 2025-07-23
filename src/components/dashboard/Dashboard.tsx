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

  Star,
  Trophy,
  Coins
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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

  const metrics = [
    {
      title: "Total Pools Created",
      value: "1,247",
      change: "+12.5%",
      trend: "up",
      icon: Gamepad2,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Trading Volume",
      value: "$2.4M",
      change: "+8.2%",
      trend: "up",
      icon: DollarSign,
      color: "text-green-400",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Active Traders",
      value: "8,932",
      change: "-2.1%",
      trend: "down",
      icon: Users,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Migration Success",
      value: "94.7%",
      change: "+1.3%",
      trend: "up",
      icon: Rocket,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
    },
  ];

  const featuredPools = [
    {
      name: "PEPE Terminal",
      symbol: "PEPE",
      progress: 85,
      raised: "$420K",
      target: "$500K",
      participants: 1247,
      timeLeft: "2d 14h",
      status: "active",
    },
    {
      name: "SHIB Rocket",
      symbol: "SHIB",
      progress: 92,
      raised: "$736K",
      target: "$800K",
      participants: 2156,
      timeLeft: "1d 8h",
      status: "active",
    },
    {
      name: "DOGE Launch",
      symbol: "DOGE",
      progress: 78,
      raised: "$312K",
      target: "$400K",
      participants: 892,
      timeLeft: "3d 2h",
      status: "active",
    },
  ];

  const recentActivity = [
    {
      type: "pool_created",
      user: "0x1234...5678",
      action: "Created new pool",
      token: "WOJAK",
      amount: "$50K",
      time: "2m ago",
      icon: Zap,
      color: "text-purple-400",
    },
    {
      type: "trade",
      user: "0x8765...4321",
      action: "Bought tokens",
      token: "PEPE",
      amount: "$12.5K",
      time: "5m ago",
      icon: TrendingUp,
      color: "text-green-400",
    },
    {
      type: "migration",
      user: "0x9876...1234",
      action: "Migrated to DEX",
      token: "SHIB",
      amount: "$800K",
      time: "12m ago",
      icon: Rocket,
      color: "text-blue-400",
    },
    {
      type: "trade",
      user: "0x5432...8765",
      action: "Sold tokens",
      token: "DOGE",
      amount: "$8.2K",
      time: "18m ago",
      icon: TrendingDown,
      color: "text-red-400",
    },
  ];

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
          {metrics.map((metric, index) => (
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

        {/* Featured Pools and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Featured Pools */}
          <motion.div 
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-400" />
                  Featured Memecoin Pools
                </CardTitle>
                <CardDescription>
                  Top performing pools with highest activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {featuredPools.map((pool, index) => (
                  <motion.div
                    key={pool.name}
                    className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/30 hover:border-purple-500/30 transition-all duration-300 bonding-curve"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                          <Coins className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{pool.name}</h3>
                          <p className="text-sm text-slate-400">{pool.symbol}</p>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className="border-green-500/30 text-green-400"
                      >
                        {pool.status}
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-white">{pool.progress}%</span>
                      </div>
                      <Progress value={pool.progress} className="h-2" />
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Raised: </span>
                          <span className="text-green-400 font-medium">{pool.raised}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Target: </span>
                          <span className="text-white">{pool.target}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Participants: </span>
                          <span className="text-blue-400">{pool.participants}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Time left: </span>
                          <span className="text-orange-400">{pool.timeLeft}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="h-5 w-5 text-blue-400" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Live trading and pool updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <motion.div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/20 hover:bg-slate-800/40 transition-all duration-300"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                  >
                    <div className={cn("p-2 rounded-lg bg-slate-800/50")}>
                      <activity.icon className={cn("h-4 w-4", activity.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">
                        <span className="text-slate-400">{activity.user}</span>
                        <br />
                        {activity.action} <span className="text-purple-400">{activity.token}</span>
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm font-medium text-green-400">{activity.amount}</span>
                        <span className="text-xs text-slate-500">
                          {activity.time}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>

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
                <AnimatedRadialChart value={94} size={200} />
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
      </div>
    </div>
  );
} 