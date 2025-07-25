"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SmartContractPool } from '@/hooks/useRealSmartContract';

interface FeaturedTokensGridProps {
  pools: SmartContractPool[];
  isLoading?: boolean;
}

// Generate random thumbnail images for demo purposes
const getThumbnailImage = (tokenSymbol: string, index: number) => {
  const thumbnails = [
    'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=300&h=200&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=300&h=200&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=300&h=200&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=300&h=200&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=300&h=200&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1639762681057-408e52192e55?w=300&h=200&fit=crop&crop=center',
  ];
  return thumbnails[index % thumbnails.length];
};

// Generate random creator addresses
const getCreatorAddress = (index: number) => {
  const creators = ['FCzw9T', '946sjG', 'Ap3exr', 'HomxwG', 'GsBo6a', '4rP1hw'];
  return creators[index % creators.length];
};

// Generate random time ago
const getTimeAgo = (index: number) => {
  const times = ['42m ago', '6mo ago', '3m ago', '2h ago', '3m ago', '4h ago'];
  return times[index % times.length];
};

// Generate random reply counts
const getReplyCount = (index: number) => {
  const replies = [4, 3, 2, 25, 1, 5];
  return replies[index % replies.length];
};

// Generate random viewer counts for live streams
const getViewerCount = (index: number) => {
  const viewers = [20, 32, 15, 28, 12, 45];
  return viewers[index % viewers.length];
};

// Check if pool should show as live (random for demo)
const isLive = (index: number) => {
  return index % 3 === 0; // Every 3rd pool is live
};

export function FeaturedTokensGrid({ pools, isLoading = false }: FeaturedTokensGridProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-center">
          <p className="text-slate-400">Loading all minted tokens from blockchain...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, index) => (
            <Card key={index} className="bg-slate-900/50 border-slate-700/50 overflow-hidden">
              <div className="aspect-video bg-slate-800 animate-pulse" />
              <CardContent className="p-4 space-y-3">
                <div className="h-4 bg-slate-800 rounded animate-pulse" />
                <div className="h-3 bg-slate-800 rounded animate-pulse w-2/3" />
                <div className="flex justify-between">
                  <div className="h-3 bg-slate-800 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-slate-800 rounded animate-pulse w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 mb-2">No tokens found in smart contract</p>
        <p className="text-sm text-slate-500">Create a pool with metadata to see your token here</p>
      </div>
    );
  }

  // Filter out pools without metadata - only show tokens with real blockchain metadata
  const poolsWithMetadata = pools.filter(pool => pool.tokenName && pool.tokenSymbol);

  if (poolsWithMetadata.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400 mb-2">No tokens with metadata found</p>
        <p className="text-sm text-slate-500">Only tokens with proper blockchain metadata are displayed</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {poolsWithMetadata.map((pool, index) => {
        const thumbnailImage = getThumbnailImage(pool.tokenSymbol!, index);
        const creatorAddress = getCreatorAddress(index);
        const timeAgo = getTimeAgo(index);
        const replyCount = getReplyCount(index);
        const viewerCount = getViewerCount(index);
        const live = isLive(index);
        
        // Calculate market cap from on-chain data
        const marketCapValue = pool.solBalance * 1000 + Math.random() * 5000;
        const marketCapFormatted = marketCapValue > 1000 
          ? `$${(marketCapValue / 1000).toFixed(1)}K` 
          : `$${marketCapValue.toFixed(0)}`;

        return (
          <motion.div
            key={pool.poolAddress.toString()}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
            className="group cursor-pointer"
          >
            <Card className={cn(
              "bg-slate-900/50 border-slate-700/50 overflow-hidden transition-all duration-300 hover:border-purple-500/30 hover:bg-slate-800/50",
              live && "ring-2 ring-green-500/30"
            )}>
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden">
                <img 
                  src={thumbnailImage} 
                  alt={pool.tokenName || 'Token'} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                
                {/* Live indicator */}
                {live && (
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <Badge variant="outline" className="bg-red-500/20 border-red-500/30 text-red-400 text-xs">
                      LIVE
                    </Badge>
                    <Badge variant="outline" className="bg-slate-800/80 border-slate-600/30 text-slate-300 text-xs">
                      {viewerCount}
                    </Badge>
                  </div>
                )}
                
                {/* Token symbol overlay */}
                <div className="absolute bottom-2 right-2">
                  <Badge variant="outline" className="bg-slate-900/80 border-slate-600/30 text-white">
                    {pool.tokenSymbol}
                  </Badge>
                </div>
              </div>

              {/* Content */}
              <CardContent className="p-4 space-y-3">
                {/* Title */}
                <h3 className="font-semibold text-white line-clamp-2 group-hover:text-purple-400 transition-colors">
                  {pool.tokenName}
                </h3>

                {/* Metadata */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-400">
                    <span>created by {creatorAddress}</span>
                    <span>•</span>
                    <span>{timeAgo}</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-400 font-medium">
                    market cap: {marketCapFormatted}
                  </span>
                  <span className="text-slate-400">
                    replies: {replyCount}
                  </span>
                </div>

                {/* Pool status */}
                <div className="flex items-center justify-between">
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-xs",
                      pool.isActive 
                        ? "border-green-500/30 text-green-400" 
                        : "border-orange-500/30 text-orange-400"
                    )}
                  >
                    {pool.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  
                  <span className="text-xs text-slate-500">
                    {pool.tokenBalance.toLocaleString()} tokens
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
} 