'use client'

import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useLaunchpadContract } from '@/hooks/useLaunchpadContract'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { verifyNetworkConnection, getNetworkInstructions } from '@/lib/verify-network'
import { useState } from 'react'

export function WalletDebug() {
  const { connected, publicKey, wallet } = useWallet()
  const { connection } = useConnection()
  const { connected: contractConnected, program } = useLaunchpadContract()
  const [showInstructions, setShowInstructions] = useState(false)

  const testNetwork = async () => {
    await verifyNetworkConnection(connection)
  }

  const isDevnet = connection.rpcEndpoint.includes('devnet')

  return (
    <Card className="mb-4 bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="text-sm text-yellow-400 flex items-center justify-between">
          🔍 Wallet Debug Info
          <Button size="sm" onClick={testNetwork} className="text-xs">
            Test Network
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p><strong>Wallet Connected:</strong> {connected ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Has Public Key:</strong> {publicKey ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Public Key:</strong> {publicKey?.toString().slice(0, 20)}...</p>
            <p><strong>Wallet Name:</strong> {wallet?.adapter?.name || 'None'}</p>
          </div>
          <div>
            <p><strong>Contract Connected:</strong> {contractConnected ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Has Program:</strong> {program ? '✅ Yes' : '❌ No'}</p>
            <p><strong>RPC Endpoint:</strong> {connection.rpcEndpoint.slice(0, 40)}...</p>
            <p><strong>Network:</strong> {isDevnet ? '✅ Devnet' : '❌ Not Devnet'}</p>
          </div>
        </div>
        
        <div className="mt-4 p-2 bg-slate-900/50 rounded">
          <p className={`font-bold ${contractConnected ? 'text-green-400' : 'text-red-400'}`}>
            <strong>Status:</strong> {
              !connected ? '❌ Wallet not connected - Click wallet button to connect' :
              !publicKey ? '❌ No public key available' :
              !isDevnet ? '❌ Switch wallet to Devnet network' :
              !program ? '❌ Program not initialized - Check console for errors' :
              !contractConnected ? '❌ Contract not connected' :
              '✅ Everything connected and ready!'
            }
          </p>
        </div>

        {(!isDevnet || !connected) && (
          <div className="mt-4">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setShowInstructions(!showInstructions)}
              className="text-xs"
            >
              {showInstructions ? 'Hide' : 'Show'} Network Setup Instructions
            </Button>
            
            {showInstructions && (
              <div className="mt-2 p-3 bg-blue-900/20 border border-blue-500/30 rounded text-blue-300">
                <pre className="text-xs whitespace-pre-wrap">{getNetworkInstructions()}</pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}