import React, { useState } from 'react';
import { DatabaseSchema } from '../types';
import { Database, Table, Link, ChevronUp, ChevronDown } from 'lucide-react';

interface DatabaseSchemaDiagramProps {
  schema: DatabaseSchema;
  className?: string;
}

export const DatabaseSchemaDiagram: React.FC<DatabaseSchemaDiagramProps> = ({ 
  schema, 
  className = '' 
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div className={`bg-white rounded-lg border border-secondary-200 shadow-lg ${className}`}>
      <div className="p-6 border-b border-secondary-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Database className="h-8 w-8 mr-3 text-blue-600" />
            <div>
              <h3 className="text-2xl font-bold text-secondary-900">
                Database Schema Diagram
              </h3>
              <p className="text-base text-secondary-600 mt-1">
                Visual representation of tables and their relationships - Use this as your reference for the questions below
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-2 rounded-md hover:bg-blue-100 transition-colors"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? (
              <ChevronDown className="h-6 w-6 text-blue-600" />
            ) : (
              <ChevronUp className="h-6 w-6 text-blue-600" />
            )}
          </button>
        </div>
      </div>
      
              {!isMinimized && (
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {schema.tables.map((table) => (
              <div key={table.tableName} className="border border-secondary-300 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm">
                <div className="flex items-center mb-4">
                  <Table className="h-5 w-5 mr-3 text-blue-600" />
                  <h4 className="font-bold text-secondary-900 text-lg">
                    {table.tableName}
                  </h4>
                </div>
                
                <div className="space-y-2">
                  {table.columns.map((column, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center space-x-2">
                        {column.primaryKey && (
                          <span className="w-3 h-3 bg-yellow-400 rounded-full" title="Primary Key"></span>
                        )}
                        {column.foreignKey && (
                          <span className="w-3 h-3 bg-green-400 rounded-full" title="Foreign Key"></span>
                        )}
                        {!column.primaryKey && !column.foreignKey && (
                          <span className="w-3 h-3 bg-gray-300 rounded-full"></span>
                        )}
                        <span className="font-mono text-secondary-800 font-medium">{column.name}</span>
                      </div>
                      <span className="text-secondary-600 text-sm font-medium">{column.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Relationships */}
          {schema.relationships.length > 0 && (
            <div className="mt-8">
              <h4 className="text-lg font-semibold text-secondary-700 mb-4 flex items-center">
                <Link className="h-5 w-5 mr-3" />
                Table Relationships
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {schema.relationships.map((rel, index) => (
                  <div key={index} className="bg-secondary-50 rounded-lg p-4 text-base border border-secondary-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-secondary-900">
                        {rel.fromTable}.{rel.fromColumn}
                      </span>
                      <span className="text-secondary-500 mx-3 text-lg">→</span>
                      <span className="font-semibold text-secondary-900">
                        {rel.toTable}.{rel.toColumn}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}; 