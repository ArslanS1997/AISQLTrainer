import React, { useState } from 'react';
import { Button } from './Button';
import { CheckCircle, Upload, Eye, EyeOff, Copy, Download } from 'lucide-react';

interface SchemaCardProps {
  schema: string;
  isSchemaCreated: boolean;
  isTablesPopulated: boolean;
  onPopulateTables: () => Promise<void>;
  isPopulating: boolean;
}

export const SchemaCard: React.FC<SchemaCardProps> = ({
  schema,
  isSchemaCreated,
  isTablesPopulated,
  onPopulateTables,
  isPopulating
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(schema);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy schema:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([schema], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'database_schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isVisible) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-gray-700">Schema Generated</span>
          </div>
          <Button
            onClick={() => setIsVisible(true)}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>Show Schema</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Generated Database Schema</h3>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setIsVisible(false)}
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <EyeOff className="h-4 w-4" />
            <span>Hide</span>
          </Button>
        </div>
      </div>

      {/* Schema Status */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          {isSchemaCreated && (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span className="text-sm">Schema Created</span>
            </div>
          )}
          {isTablesPopulated && (
            <div className="flex items-center text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span className="text-sm">Tables Populated</span>
            </div>
          )}
        </div>
      </div>

      {/* Schema Content */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">SQL Schema</span>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <Copy className="h-3 w-3" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="flex items-center space-x-1"
            >
              <Download className="h-3 w-3" />
              <span>Download</span>
            </Button>
          </div>
        </div>
        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-x-auto">{schema}</pre>
      </div>

      {/* Actions */}
      {isSchemaCreated && !isTablesPopulated && (
        <div className="flex items-center justify-center">
          <Button
            onClick={onPopulateTables}
            disabled={isPopulating}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {isPopulating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                <span>Populating...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Populate Tables with Sample Data</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}; 