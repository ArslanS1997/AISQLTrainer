import { Difficulty, SQLQuestion, DatabaseSchema, TableData } from '../types';

// Add proper types for table data
export const tableData: Record<string, DatabaseSchema> = {
  ecommerce: {
    tables: [
      {
        tableName: 'users',
        columns: [
          { name: 'id', type: 'INT', nullable: false, primaryKey: true },
          { name: 'name', type: 'VARCHAR(100)', nullable: false },
          { name: 'email', type: 'VARCHAR(100)', nullable: false },
          { name: 'age', type: 'INT', nullable: true },
          { name: 'created_at', type: 'TIMESTAMP', nullable: false }
        ],
        sampleData: [
          [1, 'John Doe', 'john@example.com', 25, '2024-01-15 10:30:00'],
          [2, 'Jane Smith', 'jane@example.com', 30, '2024-01-16 14:20:00'],
          [3, 'Mike Johnson', 'mike@example.com', 22, '2024-01-17 09:15:00'],
          [4, 'Sarah Wilson', 'sarah@example.com', 28, '2024-01-18 16:45:00'],
          [5, 'David Brown', 'david@example.com', 35, '2024-01-19 11:30:00']
        ],
        rowCount: 5
      },
      {
        tableName: 'orders',
        columns: [
          { name: 'id', type: 'INT', nullable: false, primaryKey: true },
          { name: 'user_id', type: 'INT', nullable: false, foreignKey: { table: 'users', column: 'id' } },
          { name: 'product_name', type: 'VARCHAR(100)', nullable: false },
          { name: 'amount', type: 'DECIMAL(10,2)', nullable: false },
          { name: 'order_date', type: 'TIMESTAMP', nullable: false }
        ],
        sampleData: [
          [1, 1, 'Laptop', 999.99, '2024-02-01 10:00:00'],
          [2, 1, 'Mouse', 29.99, '2024-02-02 14:30:00'],
          [3, 2, 'Keyboard', 89.99, '2024-02-03 09:45:00'],
          [4, 3, 'Monitor', 299.99, '2024-02-04 16:20:00'],
          [5, 2, 'Headphones', 149.99, '2024-02-05 11:15:00'],
          [6, 4, 'Tablet', 399.99, '2024-02-06 13:40:00'],
          [7, 5, 'Phone', 699.99, '2024-02-07 15:30:00']
        ],
        rowCount: 7
      },
      {
        tableName: 'products',
        columns: [
          { name: 'id', type: 'INT', nullable: false, primaryKey: true },
          { name: 'name', type: 'VARCHAR(100)', nullable: false },
          { name: 'category', type: 'VARCHAR(50)', nullable: false },
          { name: 'price', type: 'DECIMAL(10,2)', nullable: false },
          { name: 'stock', type: 'INT', nullable: false }
        ],
        sampleData: [
          [1, 'Gaming Laptop', 'Electronics', 1299.99, 10],
          [2, 'Wireless Mouse', 'Accessories', 29.99, 50],
          [3, 'Mechanical Keyboard', 'Accessories', 89.99, 25],
          [4, '4K Monitor', 'Electronics', 299.99, 15],
          [5, 'Noise Cancelling Headphones', 'Audio', 149.99, 30],
          [6, 'iPad Pro', 'Tablets', 399.99, 20],
          [7, 'iPhone 15', 'Phones', 699.99, 12]
        ],
        rowCount: 7
      }
    ],
    relationships: [
      { fromTable: 'orders', fromColumn: 'user_id', toTable: 'users', toColumn: 'id' }
    ]
  },
  
  banking: {
    tables: [
      {
        tableName: 'customers',
        columns: [
          { name: 'id', type: 'INT', nullable: false, primaryKey: true },
          { name: 'name', type: 'VARCHAR(100)', nullable: false },
          { name: 'email', type: 'VARCHAR(100)', nullable: false },
          { name: 'account_type', type: 'VARCHAR(20)', nullable: false },
          { name: 'balance', type: 'DECIMAL(12,2)', nullable: false },
          { name: 'created_date', type: 'DATE', nullable: false }
        ],
        sampleData: [
          [1, 'Alice Johnson', 'alice@bank.com', 'Savings', 5000.00, '2023-01-15'],
          [2, 'Bob Smith', 'bob@bank.com', 'Checking', 2500.00, '2023-02-20'],
          [3, 'Carol Davis', 'carol@bank.com', 'Savings', 7500.00, '2023-03-10'],
          [4, 'David Wilson', 'david@bank.com', 'Checking', 1200.00, '2023-04-05'],
          [5, 'Eva Brown', 'eva@bank.com', 'Savings', 3000.00, '2023-05-12']
        ],
        rowCount: 5
      },
      {
        tableName: 'transactions',
        columns: [
          { name: 'id', type: 'INT', nullable: false, primaryKey: true },
          { name: 'customer_id', type: 'INT', nullable: false, foreignKey: { table: 'customers', column: 'id' } },
          { name: 'transaction_type', type: 'VARCHAR(20)', nullable: false },
          { name: 'amount', type: 'DECIMAL(12,2)', nullable: false },
          { name: 'transaction_date', type: 'TIMESTAMP', nullable: false }
        ],
        sampleData: [
          [1, 1, 'Deposit', 1000.00, '2024-01-15 09:30:00'],
          [2, 2, 'Withdrawal', 500.00, '2024-01-16 14:20:00'],
          [3, 1, 'Transfer', 200.00, '2024-01-17 11:45:00'],
          [4, 3, 'Deposit', 1500.00, '2024-01-18 16:30:00'],
          [5, 2, 'Withdrawal', 300.00, '2024-01-19 10:15:00'],
          [6, 4, 'Deposit', 800.00, '2024-01-20 13:40:00'],
          [7, 5, 'Transfer', 400.00, '2024-01-21 15:20:00']
        ],
        rowCount: 7
      }
    ],
    relationships: [
      { fromTable: 'transactions', fromColumn: 'customer_id', toTable: 'customers', toColumn: 'id' }
    ]
  },
  
  school: {
    tables: [
      {
        tableName: 'students',
        columns: [
          { name: 'id', type: 'INT', nullable: false, primaryKey: true },
          { name: 'name', type: 'VARCHAR(100)', nullable: false },
          { name: 'grade_level', type: 'INT', nullable: false },
          { name: 'enrollment_date', type: 'DATE', nullable: false }
        ],
        sampleData: [
          [1, 'Alex Thompson', 10, '2023-09-01'],
          [2, 'Maria Garcia', 11, '2023-09-01'],
          [3, 'James Wilson', 9, '2023-09-01'],
          [4, 'Lisa Chen', 12, '2023-09-01'],
          [5, 'Ryan Miller', 10, '2023-09-01']
        ],
        rowCount: 5
      },
      {
        tableName: 'courses',
        columns: [
          { name: 'id', type: 'INT', nullable: false, primaryKey: true },
          { name: 'name', type: 'VARCHAR(100)', nullable: false },
          { name: 'teacher', type: 'VARCHAR(100)', nullable: false },
          { name: 'credits', type: 'INT', nullable: false }
        ],
        sampleData: [
          [1, 'Mathematics', 'Dr. Johnson', 4],
          [2, 'English Literature', 'Ms. Davis', 3],
          [3, 'Physics', 'Dr. Smith', 4],
          [4, 'History', 'Mr. Brown', 3],
          [5, 'Computer Science', 'Prof. Wilson', 4]
        ],
        rowCount: 5
      },
      {
        tableName: 'enrollments',
        columns: [
          { name: 'id', type: 'INT', nullable: false, primaryKey: true },
          { name: 'student_id', type: 'INT', nullable: false, foreignKey: { table: 'students', column: 'id' } },
          { name: 'course_id', type: 'INT', nullable: false, foreignKey: { table: 'courses', column: 'id' } },
          { name: 'grade', type: 'DECIMAL(3,2)', nullable: true },
          { name: 'semester', type: 'VARCHAR(20)', nullable: false }
        ],
        sampleData: [
          [1, 1, 1, 3.8, 'Fall 2023'],
          [2, 1, 2, 3.5, 'Fall 2023'],
          [3, 2, 1, 4.0, 'Fall 2023'],
          [4, 2, 3, 3.7, 'Fall 2023'],
          [5, 3, 2, 3.2, 'Fall 2023'],
          [6, 3, 4, 3.9, 'Fall 2023'],
          [7, 4, 1, 4.0, 'Fall 2023'],
          [8, 4, 5, 3.6, 'Fall 2023'],
          [9, 5, 3, 3.4, 'Fall 2023'],
          [10, 5, 4, 3.8, 'Fall 2023']
        ],
        rowCount: 10
      }
    ],
    relationships: [
      { fromTable: 'enrollments', fromColumn: 'student_id', toTable: 'students', toColumn: 'id' },
      { fromTable: 'enrollments', fromColumn: 'course_id', toTable: 'courses', toColumn: 'id' }
    ]
  }
};





export const getTableData = (scenario: string): DatabaseSchema => {
  return tableData[scenario] || tableData.ecommerce;
};

export const getAvailableScenarios = (): string[] => {
  return Object.keys(tableData);
};

export const generateSchemaFromTables = (tables: TableData[]): string => {
  let schema = '';
  
  tables.forEach(table => {
    schema += `CREATE TABLE ${table.tableName} (\n`;
    const columns = table.columns.map((col: { 
      name: string; 
      type: string; 
      nullable: boolean; 
      primaryKey?: boolean;
    }) => {
      let colDef = `  ${col.name} ${col.type}`;
      if (!col.nullable) colDef += ' NOT NULL';
      if (col.primaryKey) colDef += ' PRIMARY KEY';
      return colDef;
    });
    schema += columns.join(',\n');
    schema += '\n);\n\n';
  });
  
  return schema;
};

// Update question types to use 'basic' instead of 'beginner'
const questionTypes = {
  basic: [
    {
      template: 'Show me all {table} records',
      query: 'SELECT * FROM {table};',
      points: 10
    },
    {
      template: 'Display the {column1} and {column2} from {table}',
      query: 'SELECT {column1}, {column2} FROM {table};',
      points: 10
    },
    {
      template: 'Find all {table} where {column} is greater than {value}',
      query: 'SELECT * FROM {table} WHERE {column} > {value};',
      points: 15
    }
  ],
  intermediate: [
    {
      template: 'What is the total {column} from {table}?',
      query: 'SELECT SUM({column}) as total_{column} FROM {table};',
      points: 20
    },
    {
      template: 'Show me {table1} with their corresponding {table2} information',
      query: 'SELECT t1.*, t2.* FROM {table1} t1 JOIN {table2} t2 ON t1.{fk_column} = t2.{pk_column};',
      points: 25
    },
    {
      template: 'How many {table} do we have?',
      query: 'SELECT COUNT(*) as total_{table} FROM {table};',
      points: 20
    }
  ],
  advanced: [
    {
      template: 'Find {table1} that have {condition} based on {table2}',
      query: 'SELECT t1.* FROM {table1} t1 WHERE EXISTS (SELECT 1 FROM {table2} t2 WHERE t2.{fk_column} = t1.{pk_column} AND {condition});',
      points: 35
    },
    {
      template: 'Calculate the running total of {column} from {table} ordered by {order_column}',
      query: 'SELECT {order_column}, {column}, SUM({column}) OVER (ORDER BY {order_column}) as running_total FROM {table};',
      points: 40
    }
  ]
};

// Generate AI-powered natural language questions based on the database schema
export const generateAINaturalLanguageQuestions = (
  schema: DatabaseSchema,
  difficulty: Difficulty,
  count: number = 5
): SQLQuestion[] => {
  const questions: SQLQuestion[] = [];
  // const tableNames = schema.tables.map(t => t.tableName);
  
  // Generate questions based on available tables and difficulty
  const availableTypes = questionTypes[difficulty];
  
  for (let i = 0; i < count; i++) {
    const table = schema.tables[Math.floor(Math.random() * schema.tables.length)];
    const questionType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    
    // Generate a natural language question based on the template
    let prompt = questionType.template;
    let query = questionType.query;
    
    // Replace placeholders with actual table/column names
    prompt = prompt.replace('{table}', table.tableName);
    query = query.replace('{table}', table.tableName);
    
    // For columns, use actual column names from the table
    const columns = table.columns.filter((col: { primaryKey?: boolean }) => !col.primaryKey);
    if (columns.length >= 2) {
      prompt = prompt.replace('{column1}', columns[0].name);
      prompt = prompt.replace('{column2}', columns[1].name);
      query = query.replace('{column1}', columns[0].name);
      query = query.replace('{column2}', columns[1].name);
    }
    
    if (columns.length >= 1) {
      prompt = prompt.replace('{column}', columns[0].name);
      query = query.replace('{column}', columns[0].name);
    }
    
    questions.push({
      id: `ai-${i}`,
      prompt: prompt,
      difficulty: difficulty,
      topic: 'ai-generated',
      expectedQuery: query,
      explanation: 'This question tests your understanding of SQL fundamentals',
      points: questionType.points
    });
  }
  
  return questions;
}; 