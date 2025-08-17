import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Table, Eye, EyeOff } from 'lucide-react';
import { cn } from '../utils/cn';

interface QueryResultViewerProps {
  tableHeader?: string;
  isCorrect?: boolean;
  explanation?: string;
  className?: string;
}

export const QueryResultViewer: React.FC<QueryResultViewerProps> = ({
  tableHeader,
  isCorrect,
  explanation,
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Parse table header if it's provided
  const parseTableHeader = (header: string) => {
    if (!header || header.trim() === '') return null;
    
    try {
      // Parse markdown table format
      const lines = header.split('\n').filter(line => line.trim());
      if (lines.length === 0) return null;

      // Check if it's a markdown table (should have | separators)
      if (lines[0].includes('|')) {
        const headerLine = lines[0];
        const separatorLine = lines.length > 1 ? lines[1] : '';
        
        // Parse headers
        const headers = headerLine
          .split('|')
          .map(h => h.trim())
          .filter(h => h && h !== '');
        
        // Parse data rows (skip separator line if it exists)
        const dataLines = lines.slice(separatorLine.includes('-') ? 2 : 1);
        const rows = dataLines
          .filter(line => line.includes('|'))
          .map(line => 
            line
              .split('|')
              .map(cell => cell.trim())
              .filter(cell => cell !== '')
          )
          .filter(row => row.length > 0);
        
        return { headers, rows };
      }

      // Try to parse as HTML table
      const parser = new DOMParser();
      const doc = parser.parseFromString(header, 'text/html');
      const table = doc.querySelector('table');
      
      if (table) {
        const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent?.trim() || '');
        const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => 
          Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim() || '')
        );
        return { headers, rows };
      }

      // Try to parse as pipe-separated or tab-separated
      const firstLine = lines[0];
      const separators = ['|', '\t', ','];
      let separator = '';
      
      for (const sep of separators) {
        if (firstLine.includes(sep)) {
          separator = sep;
          break;
        }
      }

      if (separator) {
        const headers = firstLine.split(separator).map(h => h.trim()).filter(h => h);
        const rows = lines.slice(1).map(line => 
          line.split(separator).map(cell => cell.trim()).filter(cell => cell)
        ).filter(row => row.length > 0);
        
        return { headers, rows };
      }

      // If no separator found, treat as simple text
      return { headers: ['Result'], rows: [[header]] };
    } catch (error) {
      console.warn('Failed to parse table header:', error);
      return { headers: ['Result'], rows: [[header]] };
    }
  };

  const parsedTable = tableHeader ? parseTableHeader(tableHeader) : null;

  if (!tableHeader && !explanation) return null;

  return (
    <div className={cn("border rounded-lg overflow-hidden bg-white", className)}>
      {/* Header */}
      <div 
        className={cn(
          "px-4 py-3 border-b cursor-pointer flex items-center justify-between",
          isCorrect === true && "bg-green-50 border-green-200",
          isCorrect === false && "bg-red-50 border-red-200",
          isCorrect === undefined && "bg-gray-50 border-gray-200"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <Table className="h-4 w-4" />
          <span className="font-medium text-sm">
            Query Results
            {isCorrect !== undefined && (
              <span className={cn(
                "ml-2 px-2 py-1 rounded-full text-xs font-medium",
                isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              )}>
                {isCorrect ? "Correct" : "Incorrect"}
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button className="text-gray-400 hover:text-gray-600">
            {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {/* Table Data */}
          {parsedTable && parsedTable.headers.length > 0 && (
            <div className="mb-4">
              <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm max-w-full">
                <table className="min-w-full divide-y divide-gray-200 table-auto">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      {parsedTable.headers.map((header, index) => (
                        <th
                          key={index}
                          className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0 whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {parsedTable.rows.length > 0 ? (
                      parsedTable.rows.map((row, rowIndex) => (
                        <tr key={rowIndex} className={`hover:bg-blue-50 transition-colors ${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          {parsedTable.headers.map((_, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-4 py-3 text-sm text-gray-900 border-r border-gray-100 last:border-r-0 font-mono whitespace-nowrap"
                            >
                              {row[cellIndex] || <span className="text-gray-400 italic">null</span>}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={parsedTable.headers.length}
                          className="px-6 py-12 text-center text-gray-500 text-sm"
                        >
                          <div className="flex flex-col items-center">
                            <Table className="h-8 w-8 text-gray-300 mb-2" />
                            <span>No data returned</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Row count */}
              {parsedTable.rows.length > 0 && (
                <div className="text-xs text-gray-500 mt-2 px-1">
                  Showing {parsedTable.rows.length} row{parsedTable.rows.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          {/* Raw table header if parsing failed */}
          {tableHeader && !parsedTable && (
            <div className="mb-4">
              <div className="bg-gray-50 rounded-lg p-3 border">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                  {tableHeader}
                </pre>
              </div>
            </div>
          )}

          {/* Explanation */}
          {explanation && (
            <div className={cn(
              "p-3 rounded-lg text-sm",
              isCorrect === true && "bg-green-50 text-green-800 border border-green-200",
              isCorrect === false && "bg-red-50 text-red-800 border border-red-200",
              isCorrect === undefined && "bg-gray-50 text-gray-700 border border-gray-200"
            )}>
              <div className="font-medium mb-1">
                {isCorrect === true ? "Excellent!" : isCorrect === false ? "Explanation:" : "Info:"}
              </div>
              <div className="whitespace-pre-wrap">{explanation}</div>
            </div>
          )}

          {/* Empty state */}
          {!tableHeader && !explanation && (
            <div className="text-center py-8 text-gray-500">
              <Table className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No results to display</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

