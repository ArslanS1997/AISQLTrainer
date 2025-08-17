# SQL Tutor AI Frontend

A modern, responsive React frontend for the SQL Tutor AI application that provides an interactive SQL learning experience.

## Features

### 🎯 Enhanced SQL Practice
- **Topic Selection**: Choose from 6 different SQL practice topics:
  - General SQL
  - JOINs & Relationships
  - Aggregation & GROUP BY
  - Subqueries & CTEs
  - Window Functions
  - Indexing & Performance

- **Difficulty Levels**: Practice at Beginner, Intermediate, or Advanced levels

- **Progressive Learning**: Questions are presented one-by-one with immediate feedback
- **Dynamic Question Generation**: After completing 4 questions, automatically generates 5 more questions from the backend
- **Seamless Practice Flow**: Clean transitions between setup, practice, and completion modes

### 🗄️ Schema Management
- **AI-Powered Schema Generation**: Describe your database concept and get a complete SQL schema
- **Hideable Schema Display**: Toggle schema visibility to focus on practice questions
- **Schema Actions**: Copy schema to clipboard, download as SQL file
- **Sample Data Population**: Automatically populate tables with realistic sample data

### 🎨 Modern UI/UX
- **Clean, Intuitive Interface**: Streamlined design focused on learning
- **Progress Tracking**: Visual progress indicators and question counters
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Status Feedback**: Clear success/error messages and loading states

## Components

### Core Components
- `SQLPractice`: Main practice interface with setup, practice, and completion modes
- `SchemaCard`: Collapsible schema display with copy/download functionality
- `QuestionCard`: Individual question interface with answer validation
- `Button`: Reusable button component with multiple variants and sizes
- `Textarea`: Enhanced text input component

### Features
- **Practice Modes**: Setup → Practice → Completion workflow
- **Question Flow**: One-by-one question progression with automatic generation
- **Schema Management**: Hideable, downloadable schema cards
- **Real-time Validation**: Immediate feedback on SQL query execution
- **Session Management**: Persistent practice sessions with unique IDs

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   Create a `.env` file with:
   ```
   REACT_APP_BACKEND_URL=http://localhost:8000
   ```

3. **Start Development Server**:
   ```bash
   npm start
   ```

## API Integration

The frontend integrates with the SQL Tutor AI backend through:
- Schema generation and validation
- Question generation based on topic/difficulty
- SQL query execution and validation
- Session management and progress tracking

## Technology Stack

- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Custom API Client** for backend communication
- **Responsive Design** with mobile-first approach

## Development

### Code Structure
- `src/components/`: Reusable UI components
- `src/utils/`: Utility functions and API client
- `src/contexts/`: React context providers
- `src/types/`: TypeScript type definitions

### Styling
- Tailwind CSS for utility-first styling
- Custom component variants and responsive design
- Consistent color scheme and spacing

### State Management
- React hooks for local component state
- Context API for global state (authentication)
- Optimistic updates for better UX

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for new features
3. Ensure responsive design works on all screen sizes
4. Test API integration thoroughly
5. Update documentation for new features 