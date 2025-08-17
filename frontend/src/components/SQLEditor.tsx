import React from 'react';
import CodeEditor from '@uiw/react-textarea-code-editor';
import { cn } from '../utils/cn';

interface SQLEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  rows?: number;
}

export const SQLEditor: React.FC<SQLEditorProps> = ({
  value,
  onChange,
  placeholder = "Write your SQL query here...",
  disabled = false,
  className,
  rows = 10
}) => {
  return (
    <div className={cn("w-full", className)}>
      <CodeEditor
        value={value}
        language="sql"
        placeholder={placeholder}
        onChange={(evn) => onChange(evn.target.value)}
        disabled={disabled}
        data-color-mode="light"
        style={{
          fontSize: 14,
          fontFamily: 'ui-monospace, Monaco, "Cascadia Code", "Segoe UI Mono", monospace',
          minHeight: `${rows * 1.6}rem`,
          backgroundColor: '#fff',
        }}
        className="border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
      
      {/* Tips */}
      <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-md p-2">
        <span className="font-medium text-gray-700"> Tips:</span> Use Tab for indentation • Try keywords: SELECT, FROM, WHERE, JOIN, GROUP BY, ORDER BY, LIMIT
      </div>
    </div>
  );
};