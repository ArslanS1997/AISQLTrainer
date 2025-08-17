import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';
import { Button } from './Button';
import { Textarea } from './Textarea';
import { SchemaCard } from './SchemaCard';
import { QuestionCard } from './QuestionCard';
import { 
  Play, 
  Database, 
  Code, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Loader,
  Brain,
  Target,
  BarChart3
} from 'lucide-react';
import { Difficulty } from '../types';

interface SQLPracticeProps {
  onSessionUpdate?: (sessionId: string) => void;
}

export const SQLPractice: React.FC<SQLPracticeProps> = ({ onSessionUpdate }) => {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string>('');
  const [schemaPrompt, setSchemaPrompt] = useState<string>('');
  const [generatedSchema, setGeneratedSchema] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPopulating, setIsPopulating] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [isSchemaCreated, setIsSchemaCreated] = useState(false);
  const [isTablesPopulated, setIsTablesPopulated] = useState(false);
  
  // New state for questions
  const [questions, setQuestions] = useState<string[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [practiceMode, setPracticeMode] = useState<'setup' | 'practice' | 'completed'>('setup');
  
  // Topic and difficulty state
  const [topic, setTopic] = useState<string>('all');
  const [difficulty, setDifficulty] = useState<Difficulty>('basic');

  useEffect(() => {
    // Generate a unique session ID when component mounts
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  const handleGenerateSchema = async () => {
    if (!schemaPrompt.trim()) {
      setError('Please enter a schema description');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.generateSchema({
        user_id: user?.id || 'anonymous',
        session_id: sessionId,
        prompt: schemaPrompt
      });

      if (response.data) {
        setGeneratedSchema(response.data.schema_script);
        setIsSchemaCreated(response.data.schema_created);
        setSuccess('Schema generated successfully!');
        if (onSessionUpdate) {
          onSessionUpdate(sessionId);
        }
      } else if (response.error) {
        setError(response.error);
      }
    } catch (error) {
      setError('Failed to generate schema. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePopulateTables = async () => {
    if (!generatedSchema) {
      setError('Please generate a schema first');
      return;
    }

    setIsPopulating(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiClient.populateTables({
        user_id: user?.id || 'anonymous',
        session_id: sessionId,
        sql_schema: generatedSchema
      });

      if (response.data) {
        setIsTablesPopulated(true);
        setSuccess('Tables populated successfully with sample data!');
      } else if (response.error) {
        setError(response.error);
      }
    } catch (error) {
      setError('Failed to populate tables. Please try again.');
    } finally {
      setIsPopulating(false);
    }
  };

  const handleStartPractice = async () => {
    if (!generatedSchema) {
      setError('Please generate a schema first');
      return;
    }

    setIsGeneratingQuestions(true);
    setError('');

    try {
      const response = await apiClient.generateQuestions({
        user_id: user?.id || 'anonymous',
        session_id: sessionId,
        schema_ddl: generatedSchema,
        topic: topic,
        difficulty: difficulty
      });

      if (response.data && response.data.questions.length > 0) {
        setQuestions(response.data.questions);
        setCurrentQuestionIndex(0);
        setPracticeMode('practice');
        setSuccess(`Generated ${response.data.questions.length} practice questions!`);
      } else if (response.error) {
        setError(response.error);
      }
    } catch (error) {
      setError('Failed to generate questions. Please try again.');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleAnswerQuestion = async (answer: string): Promise<{ success: boolean; feedback: string }> => {
    // For now, we'll simulate answer validation
    // In a real implementation, this would call the backend to validate the SQL query
    try {
      const response = await apiClient.executeSQL({
        query: answer,
        user_id: user?.id || 'anonymous',
        session_id: sessionId
      });

      if (response.data?.success) {
        return {
          success: true,
          feedback: 'Great job! Your SQL query executed successfully and returned the expected results.'
        };
      } else {
        return {
          success: false,
          feedback: response.data?.error_message || 'Your query had some issues. Check the syntax and try again.'
        };
      }
    } catch (error) {
      return {
        success: false,
        feedback: 'There was an error executing your query. Please check the syntax and try again.'
      };
    }
  };

  const handleNextQuestion = async () => {
    const nextIndex = currentQuestionIndex + 1;
    
    // If we've completed 4 questions, automatically generate more
    if (nextIndex === 4 && questions.length === 4) {
      setIsGeneratingQuestions(true);
      setSuccess('Generating more questions for you...');
      
      try {
        const response = await apiClient.generateQuestions({
          user_id: user?.id || 'anonymous',
          session_id: sessionId,
          schema_ddl: generatedSchema,
          topic: topic,
          difficulty: difficulty
        });

        if (response.data && response.data.questions.length > 0) {
          setQuestions(prev => [...prev, ...response.data!.questions]);
          setCurrentQuestionIndex(nextIndex);
          setSuccess(`Generated ${response.data.questions.length} more questions! Keep practicing!`);
        } else if (response.error) {
          setError('Failed to generate more questions. You can continue with the current set.');
        }
      } catch (error) {
        setError('Failed to generate more questions. You can continue with the current set.');
      } finally {
        setIsGeneratingQuestions(false);
      }
    } else if (nextIndex >= questions.length) {
      // All questions completed
      setPracticeMode('completed');
    } else {
      setCurrentQuestionIndex(nextIndex);
    }
  };

  const resetSession = () => {
    setSessionId(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    setSchemaPrompt('');
    setGeneratedSchema('');
    setError('');
    setSuccess('');
    setIsSchemaCreated(false);
    setIsTablesPopulated(false);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setPracticeMode('setup');
    setTopic('general');
    setDifficulty('basic');
  };

  const getTopicLabel = (topicValue: string) => {
    const topics: Record<string, string> = {
      'general': 'General SQL',
      'joins': 'JOINs & Relationships',
      'aggregation': 'Aggregation & GROUP BY',
      'subqueries': 'Subqueries & CTEs',
      'window': 'Window Functions',
      'indexing': 'Indexing & Performance'
    };
    return topics[topicValue] || topicValue;
  };

  const getDifficultyLabel = (difficultyValue: string) => {
    const difficulties: Record<string, string> = {
      'basic': 'basic',
      'intermediate': 'Intermediate',
      'advanced': 'Advanced'
    };
    return difficulties[difficultyValue] || difficultyValue;
  };

  // Define the difficulties array with the correct type
  const difficulties: Difficulty[] = ['basic', 'intermediate', 'advanced'];

  if (practiceMode === 'practice') {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Practice Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="bg-primary-100 p-3 rounded-full">
                <Brain className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">SQL Practice Session</h1>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {getTopicLabel(topic)}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {getDifficultyLabel(difficulty)}
                  </span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setPracticeMode('setup')}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Back to Setup</span>
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 font-mono">
                Session: {sessionId}
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">{currentQuestionIndex + 1}</div>
                  <div className="text-xs text-gray-500">Current</div>
                </div>
                <div className="text-gray-300">/</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{questions.length}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
            
            {/* Progress Text */}
            <div className="text-center">
              <span className="text-sm text-gray-600">
                {currentQuestionIndex + 1 === questions.length 
                  ? 'Final question!' 
                  : `${questions.length - (currentQuestionIndex + 1)} questions remaining`
                }
              </span>
            </div>
          </div>
        </div>

        {/* Current Question */}
        {questions[currentQuestionIndex] && (
          <QuestionCard
            question={questions[currentQuestionIndex]}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
            difficulty={difficulty}
            onAnswer={handleAnswerQuestion}
            onNext={handleNextQuestion}
            isLastQuestion={currentQuestionIndex === questions.length - 1}
            sessionId={sessionId}
          />
        )}

        {/* Loading for more questions */}
        {isGeneratingQuestions && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="flex flex-col items-center space-y-4">
              <Loader className="h-12 w-12 animate-spin text-primary-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Generating More Questions</h3>
                <p className="text-gray-600">Creating fresh challenges tailored to your progress...</p>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <div className="bg-red-100 p-2 rounded-full">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-red-800 mb-1">Error</h4>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <div className="bg-green-100 p-2 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-green-800 mb-1">Success</h4>
                <p className="text-green-700">{success}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (practiceMode === 'completed') {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="flex flex-col items-center space-y-6">
            <div className="bg-green-100 p-4 rounded-full">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">Practice Session Complete!</h1>
              <p className="text-xl text-gray-600 mb-2">
                You've completed all {questions.length} questions. Excellent work!
              </p>
              <p className="text-gray-500">
                Topic: {getTopicLabel(topic)} • Difficulty: {getDifficultyLabel(difficulty)}
              </p>
            </div>
            
            <div className="flex items-center justify-center space-x-4 pt-4">
              <Button
                onClick={() => setPracticeMode('setup')}
                variant="outline"
                size="lg"
                className="flex items-center space-x-2 px-8 py-3"
              >
                <RefreshCw className="h-5 w-5" />
                <span>Start New Session</span>
              </Button>
              <Button
                onClick={() => {
                  setPracticeMode('practice');
                  setCurrentQuestionIndex(0);
                }}
                size="lg"
                className="flex items-center space-x-2 px-8 py-3"
              >
                <Brain className="h-5 w-5" />
                <span>Practice More</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="bg-primary-100 p-3 rounded-full">
            <Database className="h-8 w-8 text-primary-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SQL Practice</h1>
              <p className="text-gray-600 text-lg">Generate schemas, populate data, and practice SQL queries</p>
            </div>
          </div>
          <Button
            onClick={resetSession}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span>New Session</span>
          </Button>
        </div>
        
        {sessionId && (
          <div className="text-sm text-gray-500 font-mono bg-gray-50 px-3 py-2 rounded-md inline-block">
            Session ID: {sessionId}
          </div>
        )}
      </div>

      {/* Schema Generation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <div className="bg-blue-100 p-3 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Code className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Generate Database Schema</h2>
          <p className="text-gray-600">Describe your database and we'll create a practice environment</p>
        </div>
        
        <div className="space-y-6 max-w-4xl mx-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Describe your database schema
            </label>
            <Textarea
              value={schemaPrompt}
              onChange={(e) => setSchemaPrompt(e.target.value)}
              placeholder="e.g., Create a database for an e-commerce store with customers, products, and orders..."
              rows={4}
              className="w-full text-lg"
            />
          </div>
          
          {/* Topic and Difficulty Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Practice Topic: <span className="text-primary-600 font-semibold">{getTopicLabel(topic)}</span>
              </label>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={['general', 'joins', 'aggregation', 'subqueries', 'window', 'indexing'].indexOf(topic)}
                  onChange={(e) => {
                    const topics = ['general', 'joins', 'aggregation', 'subqueries', 'window', 'indexing'];
                    setTopic(topics[parseInt(e.target.value)]);
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>General</span>
                  <span>JOINs</span>
                  <span>Aggregation</span>
                  <span>Subqueries</span>
                  <span>Window</span>
                  <span>Indexing</span>
                </div>
              </div>
        </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Difficulty Level: <span className="text-primary-600 font-semibold">{getDifficultyLabel(difficulty)}</span>
              </label>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="2"
                  value={difficulties.indexOf(difficulty)}
                  onChange={(e) => {
                    setDifficulty(difficulties[parseInt(e.target.value)] as Difficulty);
                  }}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>Basic</span>
                  <span>Intermediate</span>
                  <span>Advanced</span>
                  </div>
              </div>
            </div>
            </div>
            
          <div className="text-center pt-4">
                <Button
              onClick={handleGenerateSchema}
              disabled={isLoading || !schemaPrompt.trim()}
              size="lg"
              className="flex items-center space-x-3 px-8 py-4 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Generating Schema...</span>
                    </>
                  ) : (
                    <>
                  <Database className="h-5 w-5" />
                  <span>Generate Schema</span>
                    </>
                  )}
                </Button>
              </div>
          </div>
      </div>

      {/* Generated Schema */}
      {generatedSchema && (
        <SchemaCard
          schema={generatedSchema}
          isSchemaCreated={isSchemaCreated}
          isTablesPopulated={isTablesPopulated}
          onPopulateTables={handlePopulateTables}
          isPopulating={isPopulating}
        />
      )}

      {/* Start Practice Button */}
      {isSchemaCreated && (
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg shadow-sm border border-primary-200 p-8 text-center">
          <div className="max-w-2xl mx-auto">
            <div className="bg-primary-100 p-4 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
              <Brain className="h-10 w-10 text-primary-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to Practice?</h3>
            <p className="text-gray-600 text-lg mb-6 leading-relaxed">
              Start practicing SQL queries with questions tailored to your selected topic and difficulty level. 
              We'll generate 4 questions to start, and more will be added as you progress!
            </p>
            <div className="flex items-center justify-center space-x-4 mb-6">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {getTopicLabel(topic)}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {getDifficultyLabel(difficulty)}
              </span>
            </div>
              <Button
              onClick={handleStartPractice}
              disabled={isGeneratingQuestions}
              size="lg"
              className="flex items-center space-x-3 px-10 py-4 text-lg bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
            >
              {isGeneratingQuestions ? (
                <>
                  <Loader className="h-6 w-6 animate-spin" />
                  <span>Generating Questions...</span>
                  </>
                ) : (
                  <>
                  <Target className="h-6 w-6" />
                  <span>Start Practice Session</span>
                  </>
                )}
              </Button>
            </div>
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <div className="bg-red-100 p-2 rounded-full">
              <XCircle className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-red-800 mb-1">Error</h4>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <div className="bg-green-100 p-2 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-green-800 mb-1">Success</h4>
              <p className="text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 