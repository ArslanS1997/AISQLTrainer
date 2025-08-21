import React, { useState, useEffect } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useUpgrade } from '../contexts/UpgradeContext';
import { useAuth } from '../contexts/AuthContext';
import { DatabaseSchema, SQLQuestion, QuestionSession } from '../types';
import { Textarea } from '../components/Textarea';
import { Button } from '../components/Button';
import { SQLEditor } from '../components/SQLEditor';
import { QueryResultViewer } from '../components/QueryResultViewer';
import { Database, RotateCcw, Eye, EyeOff, Award } from 'lucide-react';
import { apiClient } from '../utils/api';
import { Difficulty } from '../types';  // Import the shared type
import { Certificate } from '../components/certificate'; // Use lowercase to match filename


// Add this UUID generator function at the top of the component or outside it:
const generateUUID = () => {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Add this simple schema parser function at the top of the component:
const parseSchemaToTables = (schemaScript: string) => {
  const tables: Array<{name: string, columns: Array<{name: string, type: string}>}> = [];
  
  // Simple regex to extract CREATE TABLE statements
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\((.*?)\)/gis;
  let match;
  
  while ((match = tableRegex.exec(schemaScript)) !== null) {
    const tableName = match[1];
    const columnsStr = match[2];
    
    // Extract columns
    const columns: Array<{name: string, type: string}> = [];
    const columnLines = columnsStr.split(',');
    
    for (const line of columnLines) {
      const cleanLine = line.trim();
      if (cleanLine && !cleanLine.toLowerCase().includes('constraint') && !cleanLine.toLowerCase().includes('foreign key')) {
        const parts = cleanLine.split(/\s+/);
        if (parts.length >= 2) {
          const columnName = parts[0].replace(/["`]/g, '');
          const columnType = parts[1].toUpperCase();
          columns.push({ name: columnName, type: columnType });
        }
      }
    }
    
    tables.push({ name: tableName, columns });
  }
  
  return tables;
};

interface LoadingState {
  schema: boolean;
  populate: boolean;
  questions: boolean;
}

export const MainPage: React.FC = () => {
  // Add user from auth context
  const { user } = useAuth();
  
  // Add missing state variables
  const [prompt, setPrompt] = useState('');
  // Use the imported type
  const [difficulty, setDifficulty] = useState<Difficulty>('basic');
  
  // Your existing state variables
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [questions, setQuestions] = useState<SQLQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [generatedSchema, setGeneratedSchema] = useState<string>('');
  const [showTables, setShowTables] = useState(false);
  const [generationSuccess, setGenerationSuccess] = useState(false);
  const [topic, setTopic] = useState<string>('general');
  const [showSchemaSection, setShowSchemaSection] = useState(true);
  const [schemaMeta, setSchemaMeta] = useState<{
    user_id: string;
    session_id: string;
    created_at: string;
    schema_created: boolean;
  } | null>(null);
  const [parsedTables, setParsedTables] = useState<Array<{
    name: string;
    columns: Array<{ name: string; type: string }>;
  }>>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answerResults, setAnswerResults] = useState<{
    [idx: number]: {
      isCorrect: boolean;
      explanation: string;
      points: number;
      tableHeader?: string;
    };
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState({
    schema: false,
    populate: false,
    questions: false
  });
  const [completedSteps, setCompletedSteps] = useState({
    schema: false,
    populate: false,
    questions: false
  });
  const [sessionCompleted, setSessionCompleted] = useState(false); // New state for session completion
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null); // Added state for certificate modal

  // Only destructure what we use
  const { subscription, refetchSubscription } = useSubscription();
  const { showUpgradeModal } = useUpgrade();

  useEffect(() => {
    const fetchSubscriptionData = async () => {
      if (!user) return;
      try {
        const response = await apiClient.getUserSubscription();
        if (response.data) {
          // The useSubscription hook will handle setting the subscription state
        }
      } catch (err) {
        console.error('Failed to fetch subscription data:', err);
      }
    };
    fetchSubscriptionData();
  }, [user]);

  // Helper: Parse schema DDL to table cards
  const parseSchemaToCards = (ddl: string) => {
    try {
      const tables: Array<{ name: string; columns: Array<{ name: string; type: string }> }> = [];
      const blocks = ddl.split(/CREATE\s+TABLE/i).slice(1);
      for (const block of blocks) {
        const nameMatch = block.match(/\s*([a-zA-Z0-9_]+)\s*\(/);
        if (!nameMatch) continue;
        const tableName = nameMatch[1];
        const inside = block.substring(block.indexOf('(') + 1, block.lastIndexOf(')'));
        const lines = inside.split(/,\s*\n|,\n|,\s*/);
        const columns: Array<{ name: string; type: string }> = [];
        for (let line of lines) {
          line = line.trim();
          if (!line) continue;
          if (/^(PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK|CONSTRAINT)/i.test(line)) continue;
          const colMatch = line.match(/^([a-zA-Z0-9_"]+)\s+([a-zA-Z0-9_()]+)(\s+.*)?$/);
          if (colMatch) {
            const colName = colMatch[1].replace(/"/g, '');
            const colType = colMatch[2];
            columns.push({ name: colName, type: colType });
          }
        }
        tables.push({ name: tableName, columns });
      }
      setParsedTables(tables);
    } catch (e) {
      console.warn('Failed to parse schema DDL to cards:', e);
      setParsedTables([]);
    }
  };

  // Update the generateSchema function to check limits
  const generateSchema = async () => {
    if (!user || !prompt.trim()) return;
    
    // Check if user has reached limit
    if (subscription) {
      const { plan, usage } = subscription;
      const used = usage.schemas_generated;
      const limit = plan.limits.max_schemas_per_month;

      if (used >= limit) {
        showUpgradeModal('schema', subscription.plan.name);
        return;
      }
    }
    
    setIsLoading(true);
    setLoadingSteps({ schema: true, populate: false, questions: false });
    setCompletedSteps({ schema: false, populate: false, questions: false });
    
    try {
      const sessionId = generateUUID();
      
      // Step 1: Generate Schema (creates DuckDB schema)
      setLoadingSteps(prev => ({ ...prev, schema: true }));
      const schemaResponse = await apiClient.generateSchema({
        user_id: user?.id || 'anonymous',
        session_id: sessionId,
        prompt: prompt,
        difficulty: difficulty
      });

      if (schemaResponse.error || !schemaResponse.data) {
        console.error(schemaResponse.error);
        return;
      }

      // Schema completed
      setCompletedSteps(prev => ({ ...prev, schema: true }));
      setLoadingSteps(prev => ({ ...prev, populate: true }));

      // Step 2: Create Session (creates database record)
      console.log('Creating database session...');
      const sessionCreationResponse = await apiClient.createSession({
        user_id: user.id,
        session_id: sessionId,
        schema_script: schemaResponse.data.schema_script,
        difficulty: difficulty
      });

      if (sessionCreationResponse.error) {
        console.error('Failed to create session:', sessionCreationResponse.error);
        return;
      }
      
      console.log('Session created successfully!');

      // Step 3: Populate Tables (fills tables with data)
      const populateResponse = await apiClient.populateTables({
        user_id: user?.id || 'anonymous',
        session_id: sessionId,
        sql_schema: schemaResponse.data.schema_script
      });

      if (populateResponse.error) {
        console.error(populateResponse.error);
        return;
      }

      // Populate completed
      setCompletedSteps(prev => ({ ...prev, populate: true }));
      setLoadingSteps(prev => ({ ...prev, questions: true }));

      // Step 4: Generate Questions (creates and stores questions)
      const questionsResponse = await apiClient.generateQuestions({
        user_id: user?.id || 'anonymous',
        session_id: sessionId,
        schema_ddl: schemaResponse.data.schema_script,
        topic: topic,
        difficulty: difficulty
      });

      if (questionsResponse.error || !questionsResponse.data) {
        console.error(questionsResponse.error);
        return;
      }

      // Questions completed
      setCompletedSteps(prev => ({ ...prev, questions: true }));
      setLoadingSteps({ schema: false, populate: false, questions: false });

      // Set all the state
      setGeneratedSchema(schemaResponse.data.schema_script);
      
      // Fix the SQLQuestion mapping
      const sqlQuestions: SQLQuestion[] = questionsResponse.data.questions.map((q: string, index: number) => ({
        id: `${sessionId}_${index}`,
        prompt: q,
        difficulty: difficulty as 'basic' | 'intermediate' | 'advanced',
        topic: topic,
        points: 1,
        explanation: '',
        expectedQuery: '',
        hint: ''
      }));
      
      setQuestions(sqlQuestions);
      setCurrentSession({
        id: sessionId,
        createdAt: new Date(),
      });
      
      setSchemaMeta({
        user_id: user.id,
        session_id: sessionId,
        created_at: new Date().toISOString(),
        schema_created: true
      });
      
      const parsedTables = parseSchemaToTables(schemaResponse.data.schema_script);
      setParsedTables(parsedTables);
      setGenerationSuccess(true);

      // Refresh subscription data
      await refetchSubscription();

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
      setLoadingSteps({ schema: false, populate: false, questions: false });
    }
  };
  
  const completeSession = async (sessionId: string) => {
    console.log('🔄 completeSession called with sessionId:', sessionId);
    try {
      const result = await apiClient.completeSession(sessionId);
      console.log('✅ completeSession API response:', result);
      
      if (result.error) {
        console.error('❌ completeSession API error:', result.error);
        throw new Error(result.error);
      }
      
      return result;
    } catch (error) {
      console.error('❌ completeSession failed:', error);
      throw error;
    }
  };

  // Submit current answer
  const submitAnswer = async () => {
    if (!user || !currentAnswer.trim()) return;
    setIsSubmitting(true);
    
    console.log('🔍 DEBUG: Submitting answer...');
    console.log('🔍 DEBUG: currentSession?.id:', currentSession?.id);
    console.log('🔍 DEBUG: currentQuestionIndex:', currentQuestionIndex);
    console.log('🔍 DEBUG: questions.length:', questions.length);
    
    try {
      const res = await apiClient.checkAnswer({
        user_id: user.id || 'anonymous',
        session_id: currentSession?.id,
        question: questions[currentQuestionIndex].prompt,
        sql: currentAnswer,
        difficulty: difficulty
      });
      
      if (!res.data) return;
      
      const { is_correct, explanation, points, table_head } = res.data;
      setAnswerResults(prev => ({
        ...prev,
        [currentQuestionIndex]: {
          isCorrect: is_correct,
          explanation,
          points,
          tableHeader: table_head,
        },
      }));

      // Check if this was the last question and complete the session
      if (currentQuestionIndex === questions.length - 1) {
        console.log('🎯 Last question answered, completing session...');
        console.log('🔍 DEBUG: Session ID to complete:', currentSession?.id);
        
        if (currentSession?.id) {
          try {
            console.log('🔄 Calling completeSession...');
            await completeSession(currentSession.id);
            console.log('✅ Session completed successfully');
            setSessionCompleted(true);
          } catch (error) {
            console.error('❌ Failed to complete session:', error);
          }
        } else {
          console.error('❌ No session ID available to complete');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start a new question session
  const startQuestionSession = (schema?: DatabaseSchema, customQuestions?: SQLQuestion[]) => {
    const questionsToUse = customQuestions || questions;
    if (questionsToUse.length === 0) return;

    const session: QuestionSession = {
      id: `session_${Date.now()}`,
      questions: questionsToUse,
      userAnswers: [],
      totalPoints: 0,
      startTime: new Date(),
      endTime: undefined,
      currentQuestionIndex: 0,
    };

    // setQuestionSession(session); // This line was removed
    // setCurrentQuestionIndex(0); // This line was removed
  };

  // Helper function to reset session
  const resetSession = () => {
    setCurrentSession(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setGeneratedSchema('');
    setShowTables(false);
    setGenerationSuccess(false);
    setShowSchemaSection(true);
    setSchemaMeta(null);
    setParsedTables([]);
    setCurrentAnswer('');
    setAnswerResults({});
    setPrompt('');
    setLoadingSteps({
      schema: false,
      populate: false,
      questions: false
    });
    setCompletedSteps({
      schema: false,
      populate: false,
      questions: false
    });
    setSessionCompleted(false); // Reset sessionCompleted
  };

  // Get the user's answer for the current question
  // const getCurrentUserAnswer = () => { // This function was removed
  //   if (!questionSession) return null;
  //   return questionSession.userAnswers.find(answer =>
  //     answer.questionId === questions[currentQuestionIndex]?.id
  //   );
  // };

  // Get session progress
const getSessionProgress = () => {
  if (!currentSession) return { answered: 0, total: 0, percentage: 0 };
  
  // Count answered questions from answerResults instead of userAnswers
  const answered = Object.keys(answerResults).length;
  const total = questions.length;
  
  return {
    answered,
    total,
    percentage: total > 0 ? Math.round((answered / total) * 100) : 0
  };
};

  // Add the progress loader component
  const ProgressLoader = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 text-center">
          Generating Your SQL Practice Session
        </h3>
        
        <div className="space-y-4">
          {/* Step 1: Schema Generation */}
          <div className="flex items-center space-x-3">
            {completedSteps.schema ? (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : loadingSteps.schema ? (
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
            )}
            <span className={`text-sm ${completedSteps.schema ? 'text-green-600' : loadingSteps.schema ? 'text-blue-600' : 'text-gray-500'}`}>
              Creating database schema
            </span>
          </div>

          {/* Step 2: Populate Tables */}
          <div className="flex items-center space-x-3">
            {completedSteps.populate ? (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : loadingSteps.populate ? (
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
            )}
            <span className={`text-sm ${completedSteps.populate ? 'text-green-600' : loadingSteps.populate ? 'text-blue-600' : 'text-gray-500'}`}>
              Populating tables with sample data
            </span>
          </div>

          {/* Step 3: Generate Questions */}
          <div className="flex items-center space-x-3">
            {completedSteps.questions ? (
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : loadingSteps.questions ? (
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
            )}
            <span className={`text-sm ${completedSteps.questions ? 'text-green-600' : loadingSteps.questions ? 'text-blue-600' : 'text-gray-500'}`}>
              Generating practice questions
            </span>
          </div>
        </div>
        
        <div className="mt-6 text-xs text-gray-500 text-center">
          This may take a few moments...
        </div>
      </div>
    </div>
  );

  // If not authenticated, show nothing (or a loading spinner)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="text-lg text-secondary-700">Redirecting to login...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8"> {/* Change back from w-full */}
      {/* Show progress loader when loading */}
      {isLoading && <ProgressLoader />}
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900 mb-2">SQL Practice</h1>
        <p className="text-secondary-600">
          Practice SQL with AI-generated scenarios and real-time feedback
        </p>
      </div>

      {/* All the practice content - remove the conditional wrapper */}
      {!currentSession && (
        <div className="max-w-2xl mx-auto mb-6"> {/* Change back from w-full */}
          <div className="flex justify-between items-center bg-blue-50 px-4 py-3 rounded-lg border border-blue-200">
            <div className="text-sm text-gray-600">
              <span className="font-medium text-blue-700">Schema Generations</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-blue-700">
                {subscription?.usage?.schemas_generated || 0} / {subscription?.plan?.limits.max_schemas_per_month || 5} this month
              </div>
              {subscription?.plan?.name === 'free' && (
                <Button
                  onClick={() => window.location.href = '/pricing'}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-300 hover:bg-blue-100"
                >
                  Upgrade
                </Button>
              )}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full mt-2">
            <div className="w-full bg-blue-100 rounded-full h-2">
              <div
                className="h-2 bg-blue-500 rounded-full transition-all"
                style={{
                  width: `${Math.min(((subscription?.usage?.schemas_generated || 0) / (subscription?.plan?.limits.max_schemas_per_month || 5)) * 100, 100)}%`
                }}
              />
            </div>
          </div>
        </div>
      )}
      {!currentSession ? (
        <div className="max-w-2xl mx-auto"> {/* Change back from w-full */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8"> {/* Change back from p-8 */}
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Generate Your SQL Practice Session</h2> {/* Change back from text-2xl, mb-8, text-center */}
            
            <div className="space-y-4 w-full"> {/* Change back from grid layout */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1"> {/* Change back from text-lg, mb-3 */}
                  Describe Your Database Schema
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., Create a database for an e-commerce store with customers, products, and orders..."
                  rows={12}
                  className="w-full text-lg"
                />
              </div>

              {/* Difficulty Selection - change back to horizontal layout */}
              <div className="mb-6">
                <label className="block text-lg font-medium text-secondary-700 mb-4">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-3 gap-4"> {/* Change back from grid-cols-1 */}
                  {(['basic', 'intermediate', 'advanced'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level as Difficulty)}
                      className={`px-6 py-4 text-lg font-medium rounded-lg transition-colors ${
                        difficulty === level as Difficulty
                          ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                          : 'bg-secondary-100 text-secondary-700 hover:bg-secondary-200 border-2 border-transparent'
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topic Selection */}
              <div className="mb-8">
                <label className="block text-lg font-medium text-secondary-700 mb-4">
                  Question Topic Focus
                </label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-4 py-3 text-lg border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
                >
                  <option value="general">General SQL</option>
                  <option value="joins">JOINs & Relationships</option>
                  <option value="aggregation">Aggregation & GROUP BY</option>
                  <option value="subqueries">Subqueries & CTEs</option>
                  <option value="window-functions">Window Functions</option>
                  <option value="indexes">Indexes & Performance</option>
                  <option value="data-modification">INSERT/UPDATE/DELETE</option>
                  <option value="filtering">WHERE & HAVING</option>
                  <option value="sorting">ORDER BY & LIMIT</option>
                  <option value="string-functions">String Functions</option>
                  <option value="date-functions">Date & Time Functions</option>
                  <option value="analytics">Analytics & Reporting</option>
                </select>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateSchema}
                disabled={isLoading || !prompt.trim()}
                size="lg"
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Generating Schema & Questions...
                  </>
                ) : (
                  <>
                    <Database className="h-6 w-6 mr-3" />
                    Generate Schema & Start Practice
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Success Message */}
          {generationSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-green-800">
                    Successfully Generated SQL Practice Session!
                  </h3>
                  <div className="mt-2 text-sm text-green-700">
                    <p> Database schema created and tables populated</p>
                    <p> {questions.length} practice questions generated</p>
                    <p> Difficulty level: {difficulty}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Schema Display */}
          {generationSuccess && generatedSchema && (
            <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-secondary-900">Generated Database Schema</h2>
                <div className="flex gap-2">
                  {questions.length > 0 && (
                    <Button
                      onClick={() => setShowSchemaSection(!showSchemaSection)}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {showSchemaSection ? (
                        <>
                          <EyeOff className="h-4 w-4" />
                          Hide Schema
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4" />
                          Show Schema
                        </>
                      )}
                    </Button>
                  )}
                  {showSchemaSection && (
                    <Button
                      onClick={() => setShowTables(!showTables)}
                      variant="outline"
                      size="sm"
                    >
                      {showTables ? 'Hide SQL' : 'Show SQL'}
                    </Button>
                  )}
                </div>
              </div>

              {showSchemaSection && (
                <>
                  {/* Backend Meta */}
                  {schemaMeta && (
                    <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="bg-secondary-50 rounded p-3 border">
                        <div className="text-secondary-500">Created At</div>
                        <div className="text-secondary-900">{new Date(schemaMeta.created_at).toLocaleString()}</div>
                      </div>
                      <div className="bg-secondary-50 rounded p-3 border">
                        <div className="text-secondary-500">Schema Created</div>
                        <div className="text-secondary-900">{schemaMeta.schema_created ? 'Yes' : 'No'}</div>
                      </div>
                    </div>
                  )}

                  {/* Table Cards */}
                  {parsedTables.length > 0 && (
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {parsedTables.map((t) => (
                        <div key={t.name} className="rounded-lg border shadow-sm bg-white">
                          <div className="px-4 py-3 border-b bg-secondary-50">
                            <h4 className="text-sm font-semibold text-secondary-900 truncate">{t.name}</h4>
                          </div>
                          <div className="p-4">
                            {t.columns.length === 0 ? (
                              <p className="text-sm text-secondary-500">No columns parsed</p>
                            ) : (
                              <ul className="space-y-2">
                                {t.columns.map((c, idx) => (
                                  <li key={idx} className="flex items-center justify-between text-sm">
                                    <span className="font-mono text-secondary-900">{c.name}</span>
                                    <span className="text-secondary-600">{c.type}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {showTables && (
                    <div className="mb-6 rounded-lg border bg-white">
                      <div className="px-4 py-3 border-b bg-secondary-50">
                        <h3 className="text-sm font-medium text-gray-700">SQL Schema</h3>
                      </div>
                      <div className="p-4">
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">{generatedSchema}</pre>
                      </div>
                    </div>
                  )}

                  {/* Schema Summary */}
                  <div className="mb-4 rounded-lg border bg-white">
                    <div className="px-4 py-3 border-b bg-secondary-50">
                      <h3 className="text-sm font-medium text-gray-700">Schema Summary</h3>
                    </div>
                    <div className="p-4 text-sm text-gray-600">
                      <p>Schema successfully generated and tables populated</p>
                      <p>Database ready for SQL practice queries</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Current Question */}
          {questions.length > 0 && currentQuestionIndex < questions.length && (
            <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-secondary-900 mb-2">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-800 leading-relaxed">{questions[currentQuestionIndex].prompt}</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Your SQL Answer:
                </label>
                <SQLEditor
                  value={currentAnswer}
                  onChange={setCurrentAnswer}
                  placeholder="Write your SQL query here..."
                  rows={12}
                  className="w-full"
                  disabled={!!answerResults[currentQuestionIndex]}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex space-x-3">
                  {!answerResults[currentQuestionIndex] && (
                    <Button onClick={submitAnswer} disabled={isSubmitting || !currentAnswer.trim()}>
                      {isSubmitting ? 'Checking...' : 'Submit Answer'}
                    </Button>
                  )}
                </div>

                {answerResults[currentQuestionIndex] && currentQuestionIndex < questions.length - 1 && (
                  <Button onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>
                    Next Question
                  </Button>
                )}
                {answerResults[currentQuestionIndex] && currentQuestionIndex === questions.length - 1 && (
                  <div className="flex flex-col items-center space-y-4">
                    {/* Check if user has a paid plan - default to free if no subscription found */}
                    {subscription?.plan?.name && subscription.plan.name !== 'free' ? (
                      <Button 
                        onClick={() => {
                          // Just render the certificate modal
                          const totalPoints = Object.values(answerResults).reduce((sum, result) => sum + (result.points || 0), 0);
                          const correctAnswers = Object.values(answerResults).filter(result => result.isCorrect).length;
                          const totalQuestions = Object.keys(answerResults).length;
                          const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
                          
                          // Generate certificate data for display
                          const certificateData = {
                            id: currentSession?.id,
                            session_id: currentSession?.id,
                            title: `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} SQL Practice Session`,
                            difficulty: difficulty,
                            score: score,
                            total_points: totalQuestions,
                            correct_answers: correctAnswers,
                            completion_date: new Date().toISOString(),
                            topic: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
                            type: 'session',
                            certificate_url: `/api/achievements/certificate/${currentSession?.id}`
                          };
                          
                          // Set the selected certificate to show the modal
                          setSelectedCertificate(certificateData);
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Award className="h-4 w-4 mr-2" />
                        View Your Certificate
                      </Button>
                    ) : (
                      <div className="text-center space-y-3">
                        <p className="text-gray-600">🎉 Great job completing all questions!</p>
                        <p className="text-sm text-gray-500">Upgrade to Pro or Max to get your certificate</p>
                        <Button
                          onClick={() => window.location.href = '/pricing'}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Award className="h-4 w-4 mr-2" />
                          Upgrade to Get Certificate
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {answerResults[currentQuestionIndex] && (
                <div className="mt-6">
                  <QueryResultViewer
                    tableHeader={answerResults[currentQuestionIndex].tableHeader}
                    isCorrect={answerResults[currentQuestionIndex].isCorrect}
                    explanation={answerResults[currentQuestionIndex].explanation}
                  />
                  
                  {/* Points display */}
                  {answerResults[currentQuestionIndex].points !== undefined && (
                    <div className={`mt-4 p-3 rounded-lg border text-center ${
                      answerResults[currentQuestionIndex].isCorrect 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <div className="flex items-center justify-center space-x-2">
                        <span className={`font-medium ${
                          answerResults[currentQuestionIndex].isCorrect ? 'text-green-800' : 'text-gray-700'
                        }`}>
                          {answerResults[currentQuestionIndex].isCorrect 
                            ? `+${answerResults[currentQuestionIndex].points} points earned!` 
                            : `0 points (try again)`
                          }
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Session Controls */}
          <div className="flex justify-between items-center">
          <Button
                onClick={async () => {
                  if (user?.id && currentSession?.id) {
                    try { await apiClient.deleteDuckDB(user.id, currentSession.id); } catch {}
                  }
                  resetSession();
                }}
                variant="outline"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                New Session
          </Button>

            {/* questionSession && ( // This line was removed */}
              <div className="text-sm text-gray-600">
                Progress: {getSessionProgress().answered}/{getSessionProgress().total} ({getSessionProgress().percentage}%)
              </div>
            {/* ) // This line was removed */}
          </div>
        </div>
      )}

      {/* Certificate Modal */}
      {selectedCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-[98vw] max-w-none max-h-[98vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Your Certificate</h2>
                <button
                  onClick={() => setSelectedCertificate(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Certificate content */}
              <div className="w-full">
                <Certificate 
                  type="session"
                  userName={user?.name || 'Student'}
                  session={{
                    session_id: selectedCertificate.session_id || '',
                    title: selectedCertificate.title,
                    difficulty: selectedCertificate.difficulty,
                    score: selectedCertificate.score || 0,
                    total_points: selectedCertificate.total_points || 0,
                    completion_date: selectedCertificate.completion_date,
                    topic: selectedCertificate.topic,
                    certificate_url: selectedCertificate.certificate_url
                  }}
                />
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <Button
                  onClick={() => setSelectedCertificate(null)}
                  variant="outline"
                >
                  Close
                </Button>
                <Button
                  onClick={() => window.print()}
                >
                  Print Certificate
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};