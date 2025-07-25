"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { runSmartContractTests } from '@/lib/test-smart-contract';

interface TestResult {
  testName: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

export function SmartContractTester() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<any>(null);

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);

    try {
      const testResults = await runSmartContractTests(0);
      setResults(testResults);

      // Calculate summary
      const totalTests = testResults.length;
      const passedTests = testResults.filter(r => r.success).length;
      const failedTests = totalTests - passedTests;
      const totalDuration = testResults.reduce((sum, r) => sum + r.duration, 0);

      setSummary({
        totalTests,
        passedTests,
        failedTests,
        totalDuration,
        allPassed: passedTests === totalTests
      });

    } catch (error) {
      console.error('Test runner failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getTestStatusColor = (success: boolean) => {
    return success ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30';
  };

  const formatDuration = (ms: number) => {
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-900/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            🧪 Smart Contract Tester
          </CardTitle>
          <CardDescription>
            Test your smart contract functionality and data fetching capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isRunning ? 'Running Tests...' : 'Run Smart Contract Tests'}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">📊 Test Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{summary.totalTests}</div>
                <div className="text-sm text-slate-400">Total Tests</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{summary.passedTests}</div>
                <div className="text-sm text-slate-400">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{summary.failedTests}</div>
                <div className="text-sm text-slate-400">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{formatDuration(summary.totalDuration)}</div>
                <div className="text-sm text-slate-400">Total Time</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={summary.allPassed ? 'border-green-500/30 text-green-400' : 'border-red-500/30 text-red-400'}
              >
                {summary.allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}
              </Badge>
            </div>

            <Progress 
              value={(summary.passedTests / summary.totalTests) * 100} 
              className="h-2"
            />
          </CardContent>
        </Card>
      )}

      {results.length > 0 && (
        <Card className="bg-slate-900/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="text-white">🔍 Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.map((result, index) => (
              <div 
                key={index}
                className={`p-4 rounded-lg border ${getTestStatusColor(result.success)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{result.testName}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getTestStatusColor(result.success)}>
                      {result.success ? '✅ PASS' : '❌ FAIL'}
                    </Badge>
                    <span className="text-sm text-slate-400">{formatDuration(result.duration)}</span>
                  </div>
                </div>

                {result.error && (
                  <div className="text-sm mt-2">
                    <strong>Error:</strong> {result.error}
                  </div>
                )}

                {result.data && (
                  <details className="mt-2">
                    <summary className="text-sm cursor-pointer text-slate-300 hover:text-white">
                      View Data
                    </summary>
                    <pre className="text-xs mt-2 p-2 bg-slate-800/50 rounded overflow-x-auto">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 