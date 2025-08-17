import React, { useState } from 'react';
import { TableData } from '../types';
import { ChevronDown, ChevronRight, Database, Table } from 'lucide-react';

interface TableDataViewerProps {
  tables: TableData[];
  className?: string;
}

export const TableDataViewer: React.FC<TableDataViewerProps> = ({ tables, className = '' }) => {
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const toggleTable = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
    } else {
      newExpanded.add(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const isExpanded = (tableName: string) => expandedTables.has(tableName);

  return (
    <div className={`bg-white rounded-lg border border-secondary-200 ${className}`}>
      <div className="p-4 border-b border-secondary-200">
        <h3 className="text-lg font-semibold text-secondary-900 flex items-center">
          <Database className="h-5 w-5 mr-2" />
          Database Schema & Sample Data
        </h3>
        <p className="text-sm text-secondary-600 mt-1">
          Click on tables to view their structure and sample data
        </p>
      </div>
      
      <div className="p-4 space-y-4">
        {tables.map((table) => (
          <div key={table.tableName} className="border border-secondary-200 rounded-lg">
            <button
              onClick={() => toggleTable(table.tableName)}
              className="w-full p-3 flex items-center justify-between hover:bg-secondary-50 transition-colors"
            >
              <div className="flex items-center">
                <Table className="h-4 w-4 mr-2 text-secondary-500" />
                <span className="font-medium text-secondary-900">{table.tableName}</span>
                <span className="ml-2 text-sm text-secondary-500">
                  ({table.rowCount} rows)
                </span>
              </div>
              {isExpanded(table.tableName) ? (
                <ChevronDown className="h-4 w-4 text-secondary-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-secondary-500" />
              )}
            </button>
            
            {isExpanded(table.tableName) && (
              <div className="border-t border-secondary-200 p-4 space-y-4">
                {/* Table Structure */}
                <div>
                  <h4 className="text-sm font-medium text-secondary-700 mb-2">Structure</h4>
                  <div className="bg-secondary-50 rounded-md p-3">
                    <div className="grid grid-cols-4 gap-2 text-xs font-medium text-secondary-600 mb-2">
                      <div>Column</div>
                      <div>Type</div>
                      <div>Nullable</div>
                      <div>Key</div>
                    </div>
                    {table.columns.map((column, index) => (
                      <div key={index} className="grid grid-cols-4 gap-2 text-xs py-1 border-b border-secondary-200 last:border-b-0">
                        <div className="font-mono text-secondary-900">{column.name}</div>
                        <div className="text-secondary-700">{column.type}</div>
                        <div className="text-secondary-700">
                          {column.nullable ? 'YES' : 'NO'}
                        </div>
                        <div className="text-secondary-700">
                          {column.primaryKey ? 'PK' : column.foreignKey ? 'FK' : '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Sample Data */}
                <div>
                  <h4 className="text-sm font-medium text-secondary-700 mb-2">Sample Data</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-secondary-50">
                          {table.columns.map((column, index) => (
                            <th key={index} className="px-2 py-2 text-left font-medium text-secondary-700 border-b border-secondary-200">
                              {column.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.sampleData.slice(0, 5).map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-b border-secondary-100 last:border-b-0">
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="px-2 py-2 text-secondary-900">
                                {typeof cell === 'string' && cell.includes('@') ? (
                                  <span className="text-blue-600">{cell}</span>
                                ) : typeof cell === 'number' ? (
                                  <span className="text-green-600">{cell}</span>
                                ) : (
                                  <span>{cell}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {table.sampleData.length > 5 && (
                      <div className="text-xs text-secondary-500 text-center py-2">
                        Showing 5 of {table.sampleData.length} rows
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}; 