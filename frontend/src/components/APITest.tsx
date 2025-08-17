import React, { useState } from 'react';
import { apiClient } from '../utils/api';
import { Button } from './Button';

export const APITest: React.FC = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const runTests = async () => {
    setIsTesting(true);
    setTestResults([]);
    
    try {
      // Test 1: Health Check
      addResult('Testing backend health check...');
      const healthResponse = await apiClient.healthCheck();
      if (healthResponse.data) {
        addResult(`✅ Health check passed: ${healthResponse.data.status}`);
      } else {
        addResult(`❌ Health check failed: ${healthResponse.error}`);
      }

      // Test 2: API Client Methods
      addResult('Testing API client methods...');
      const methods = [
        'generateSchema',
        'executeSQL', 
        'populateTables',
        'generateQuestions',
        'getSessions',
        'createSession',
        'getSchemas'
      ];
      
      methods.forEach(method => {
        if (typeof (apiClient as any)[method] === 'function') {
          addResult(`✅ ${method} method exists`);
        } else {
          addResult(`❌ ${method} method missing`);
        }
      });

      // Test 3: Component Imports
      addResult('Testing component imports...');
      try {
        const { SQLPractice } = await import('./SQLPractice');
        addResult('✅ SQLPractice component imported successfully');
      } catch (error) {
        addResult(`❌ SQLPractice import failed: ${error}`);
      }

      try {
        const { SchemaCard } = await import('./SchemaCard');
        addResult('✅ SchemaCard component imported successfully');
      } catch (error) {
        addResult(`❌ SchemaCard import failed: ${error}`);
      }

      try {
        const { QuestionCard } = await import('./QuestionCard');
        addResult('✅ QuestionCard component imported successfully');
      } catch (error) {
        addResult(`❌ QuestionCard import failed: ${error}`);
      }

      // Test 4: Utility Functions
      addResult('Testing utility functions...');
      try {
        const { cn } = await import('../utils/cn');
        if (typeof cn === 'function') {
          addResult('✅ cn utility function imported successfully');
        } else {
          addResult('❌ cn utility function is not a function');
        }
      } catch (error) {
        addResult(`❌ cn utility import failed: ${error}`);
      }

      addResult('🎉 All tests completed!');

    } catch (error) {
      addResult(`❌ Test suite failed: ${error}`);
    } finally {
      setIsTesting(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Frontend Test Suite</h2>
        <p className="text-gray-600 mb-6">
          This component tests the frontend functionality, component imports, and API client setup.
        </p>
        
        <div className="flex space-x-4 mb-6">
          <Button
            onClick={runTests}
            disabled={isTesting}
            className="flex items-center space-x-2"
          >
            {isTesting ? 'Running Tests...' : 'Run Tests'}
          </Button>
          
          <Button
            onClick={clearResults}
            variant="outline"
            disabled={testResults.length === 0}
          >
            Clear Results
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Test Results:</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {testResults.map((result, index) => (
                <div key={index} className="text-sm font-mono bg-white p-2 rounded border">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 