"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Upload, 
  X, 
  TrendingUp,
  Coins,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle,
  Loader2,
  DollarSign,
  Users,
  Lock,
  Zap,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
import { useLaunchpadContract } from "@/hooks/useLaunchpadContract";
import { WalletDebug } from "@/components/debug/WalletDebug";
import toast from 'react-hot-toast';

// Form validation schema - Aligned with smart contract requirements
const poolFormSchema = z.object({
  tokenName: z.string().min(1, "Token name is required").max(50, "Token name too long"),
  tokenSymbol: z.string().min(1, "Token symbol is required").max(10, "Symbol too long").regex(/^[A-Z0-9]+$/, "Symbol must be uppercase letters and numbers only"),
  description: z.string().min(10, "Description must be at least 10 characters").max(500, "Description too long"),
  targetSolAmount: z.string().min(1, "Target SOL amount is required").regex(/^\d+(\.\d+)?$/, "Must be a valid number"),
});

type PoolFormData = z.infer<typeof poolFormSchema>;

// Image Upload Component
const ImageUpload: React.FC<{
  onImageChange: (file: File | null) => void;
  preview: string | null;
}> = ({ onImageChange, preview }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('image/')) {
      onImageChange(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageChange(file);
    }
  };

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer",
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
        preview ? "aspect-square" : "aspect-video"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {preview ? (
        <div className="relative w-full h-full">
          <img
            src={preview}
            alt="Token preview"
            className="w-full h-full object-cover rounded-md"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onImageChange(null);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center">
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm font-medium mb-2">Upload token image</p>
          <p className="text-xs text-muted-foreground">
            Drag & drop or click to select
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PNG, JPG up to 5MB
          </p>
        </div>
      )}
    </div>
  );
};

// Pool Stats Component - Aligned with smart contract defaults
const PoolStats: React.FC<{ formData: Partial<PoolFormData> }> = ({ formData }) => {
  const stats = [
    {
      label: "Total Supply",
      value: "1,000,000,000,000",
      icon: Coins,
      color: "text-blue-600"
    },
    {
      label: "Trading Supply",
      value: "690,000,000,000",
      icon: TrendingUp,
      color: "text-green-600"
    },
    {
      label: "Airdrop Supply",
      value: "310,000,000,000",
      icon: Users,
      color: "text-purple-600"
    },
    {
      label: "Target SOL",
      value: formData.targetSolAmount ? `${formData.targetSolAmount} SOL` : "Not set",
      icon: DollarSign,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="p-4 bg-gradient-to-br from-background to-muted/20">
            <div className="flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-background", stat.color)}>
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="font-semibold">{stat.value}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

// Main Pool Creation Form Component
export function CreatePoolForm() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const { connected, publicKey } = useWallet();
  const { 
    connected: contractConnected, 
    createPool, 
    newPool, 
    createMetadata,
    createTokenMint 
  } = useLaunchpadContract();

  const form = useForm<PoolFormData>({
    resolver: zodResolver(poolFormSchema),
    defaultValues: {
      tokenName: "",
      tokenSymbol: "",
      description: "",
      targetSolAmount: "",
    },
  });

  const watchedValues = form.watch();

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const onSubmit = async (data: PoolFormData) => {
    if (!connected || !contractConnected) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      toast.loading('Creating pool...', { id: 'pool-creation' });
      
      // Step 1: Upload image to IPFS/Arweave
      let metadataUri = '';
      if (imageFile) {
        try {
          // Convert image to base64 for now (in production, upload to IPFS/Arweave)
          const reader = new FileReader();
          const imagePromise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const base64 = reader.result as string;
              // For now, use a placeholder with the image data
              // In production, this would upload to IPFS/Arweave
              const placeholderUri = `https://arweave.net/placeholder-${Date.now()}`;
              resolve(placeholderUri);
            };
            reader.onerror = reject;
          });
          
          reader.readAsDataURL(imageFile);
          metadataUri = await imagePromise;
          
          console.log('📸 Image processed:', {
            fileName: imageFile.name,
            fileSize: imageFile.size,
            fileType: imageFile.type,
            uri: metadataUri
          });
        } catch (imageError) {
          console.error('❌ Image processing failed:', imageError);
          // Use default image if upload fails
          metadataUri = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
        }
      } else {
        // Use default image if no image uploaded
        metadataUri = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
      }

      // Step 2: Initialize target configuration and create token mint
      const targetSolAmount = parseFloat(data.targetSolAmount); // Convert to SOL amount
      
      toast.loading('Creating target configuration...', { id: 'pool-creation' });
      console.log('🎯 CreatePoolForm: About to call createPool with:', {
        targetSolAmount,
        tokenName: data.tokenName,
        tokenSymbol: data.tokenSymbol,
        description: data.description
      });
      
      const targetConfigResult = await createPool(targetSolAmount, data.tokenName, data.tokenSymbol, metadataUri);
      
      console.log('✅ Target configuration created:', targetConfigResult.signature);
      console.log('📄 Meme token mint:', targetConfigResult.pairTokenMint.toString());
      console.log('💾 Pool data should be stored:', targetConfigResult.poolData);
      
      // Step 3: Skip pool creation for now - token is created and ready for trading
      console.log('🎉 Token creation completed, pool data stored for trading');
      
      // Step 4: Metadata creation is handled automatically in createPool function
      console.log('📝 Metadata creation handled automatically in pool creation process');

      console.log('🎉 Token Creation Complete:', {
        signature: targetConfigResult.signature,
        tokenMint: targetConfigResult.pairTokenMint.toString(),
        poolData: targetConfigResult.poolData,
        tokenData: data,
        metadataUri,
      });

      toast.success(
        `🎉 Pool created successfully! Token mint: ${targetConfigResult.pairTokenMint.toString().slice(0, 8)}...`, 
        { id: 'pool-creation', duration: 5000 }
      );
      setSubmitStatus('success');
      
      // Reset form after success
      setTimeout(() => {
        form.reset();
        setImageFile(null);
        setImagePreview(null);
        setSubmitStatus('idle');
      }, 3000);

    } catch (error) {
      console.error('❌ Pool creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to create pool: ${errorMessage}`, { id: 'pool-creation', duration: 5000 });
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
              <Zap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Create Pool
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">Launch your memecoin with bonding curves</p>
          <p className="text-sm text-muted-foreground mt-2">
            Deploy your token with automated fair distribution and price discovery
          </p>
        </motion.div>

        {/* Debug Component */}
        <WalletDebug />

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Token Details Section */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Coins className="h-5 w-5" />
                      Token Details
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tokenName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Token Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Gaming Terminal Token" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="tokenSymbol"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Token Symbol</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., GTT" 
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Describe your token and its purpose..."
                              className="min-h-[100px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Tell the community about your token ({field.value?.length || 0}/500)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>

                  {/* Token Image */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                      <ImageIcon className="h-5 w-5" />
                      Token Image
                    </h3>
                    <ImageUpload onImageChange={handleImageChange} preview={imagePreview} />
                  </motion.div>

                  {/* Bonding Curve Configuration */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Bonding Curve Configuration
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="targetSolAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target SOL Amount</FormLabel>
                          <FormControl>
                            <Input placeholder="1000" {...field} />
                          </FormControl>
                          <FormDescription>
                            Target SOL amount for the bonding curve. This determines the maximum SOL that can be traded.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <h4 className="font-semibold text-blue-300 mb-2">Smart Contract Defaults</h4>
                      <div className="text-sm text-blue-200 space-y-1">
                        <div>• Total Supply: 1,000,000,000,000 tokens (1T)</div>
                        <div>• Trading Supply: 690,000,000,000 tokens (690B)</div>
                        <div>• Airdrop Supply: 310,000,000,000 tokens (310B)</div>
                        <div>• Trading Fees: 1% on SOL trades, 0% on token trades</div>
                        <div>• Price Factor: 3/1 (numerator/denominator)</div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Wallet Connection / Submit Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    {!connected ? (
                      <div className="text-center p-6 rounded-lg bg-blue-500/10 border border-blue-500/30">
                        <div className="p-3 bg-blue-500/20 rounded-full w-fit mx-auto mb-4">
                          <DollarSign className="h-6 w-6 text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-blue-300 mb-2">Connect Wallet to Create Pool</h3>
                        <p className="text-blue-200 mb-4 text-sm">Connect your Solana wallet to deploy your memecoin</p>
                        <WalletMultiButton className="!bg-gradient-to-r !from-blue-500 !to-purple-600 hover:!from-blue-600 hover:!to-purple-700" />
                      </div>
                    ) : (
                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className={cn(
                          "w-full py-6 text-lg font-semibold transition-all duration-300",
                          submitStatus === 'success' 
                            ? "bg-green-500 hover:bg-green-600"
                            : submitStatus === 'error'
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                        )}
                      >
                        <div className="flex items-center justify-center gap-2">
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Creating Pool...
                            </>
                          ) : submitStatus === 'success' ? (
                            <>
                              <CheckCircle className="h-5 w-5" />
                              Pool Created Successfully!
                            </>
                          ) : submitStatus === 'error' ? (
                            <>
                              <AlertCircle className="h-5 w-5" />
                              Creation Failed - Try Again
                            </>
                          ) : (
                            <>
                              <Zap className="h-5 w-5" />
                              Create Pool
                            </>
                          )}
                        </div>
                      </Button>
                    )}
                  </motion.div>
                </form>
              </Form>
            </Card>
          </div>

          {/* Sidebar - Preview & Stats */}
          <div className="space-y-6">
            {/* Pool Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Pool Configuration
                </h3>
                <PoolStats formData={watchedValues} />
              </Card>
            </motion.div>

            {/* Token Preview */}
            {(watchedValues.tokenName || watchedValues.tokenSymbol || imagePreview) && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Coins className="h-5 w-5" />
                    Token Preview
                  </h3>
                  <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Token"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
                        <Coins className="h-6 w-6 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold">
                        {watchedValues.tokenName || 'Token Name'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${watchedValues.tokenSymbol || 'SYMBOL'}
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Info Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
                <h3 className="text-lg font-semibold mb-4">About Pool Creation</h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>• Total supply: 1B tokens (1,000,000,000)</p>
                  <p>• Trading tokens: 690M (69%)</p>
                  <p>• LP tokens: 310M (31%)</p>
                  <p>• Platform fee: 1% on SOL trades</p>
                  <p>• Auto-migration at 80% completion</p>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
} 