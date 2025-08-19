import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Button } from '../components/Button';
import { Textarea } from '../components/Textarea';
import { TableDataViewer } from '../components/TableDataViewer';
import { DatabaseSchemaDiagram } from '../components/DatabaseSchemaDiagram';
import { 
  Trophy, 
  Clock, 
  Play, 
  Send,
  Brain,
  User,
  Target,
  CheckCircle,
  XCircle,
  Database,
  Award,
  ArrowRight,
  Timer,
  Zap,
  Crown,
  Table,
  X
} from 'lucide-react';
import { useUpgrade } from '../contexts/UpgradeContext';
import { UpgradeModal } from '../components/UpgradeModal';
import { apiClient } from '../utils/api';
import { SchemaCard } from '../components/SchemaCard';
import { TableData, TableColumn } from '../types';

interface CompetitionRound {
  round: number;
  question: string;
  user_query: string;
  ai_query: string;
  user_correct: boolean;
  ai_correct: boolean;
  user_time: number;
  ai_time: number;
  explanation: string;
  correct_answer: string;
  user_query_results?: any[]; // ADD THIS - Actual query results from user
  ai_query_results?: any[];   // ADD THIS - Actual query results from AI
}

interface CompetitionQuestion {
  round: number;
  question: string;
  difficulty: string;
}

interface CompetitionState {
  competitionId: string | null;
  difficulty: string;
  schema_ddl: string;
  questions: CompetitionQuestion[];
  total_rounds: number;
  current_round: number;
  user_score: number;
  ai_score: number;
  time_remaining: number;
  status: 'setup' | 'active' | 'completed' | 'expired'; // ADD 'expired' here
  result: string | null;
  current_question: string;
  user_query: string;
  rounds_data: CompetitionRound[];
  can_get_certificate?: boolean;
  expires_at?: Date | null;
  aiResponses: { [key: number]: string }; // Add this for AI responses
  aiCheckResults: { [key: number]: any }; // Add this for AI check results
}

const DIFFICULTY_OPTIONS = [
  { value: 'basic', label: 'basic', description: 'Basic SQL queries', color: 'bg-green-500' },
  { value: 'intermediate', label: 'Intermediate', description: 'Joins and aggregations', color: 'bg-yellow-500' },
  { value: 'advanced', label: 'Advanced', description: 'Complex queries', color: 'bg-red-500' }
];

// Add this schema parser function
const parseSchemaToTables = (schemaScript: string): TableData[] => {
  const tables: TableData[] = [];
  
  // Simple regex to extract CREATE TABLE statements
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\((.*?)\)/gis;
  let match;
  
  while ((match = tableRegex.exec(schemaScript)) !== null) {
    const tableName = match[1];
    const columnsStr = match[2];
    
    // Extract columns
    const columns: TableColumn[] = [];
    const columnLines = columnsStr.split(',');
    
    for (const line of columnLines) {
      const cleanLine = line.trim();
      if (cleanLine && !cleanLine.toLowerCase().includes('constraint') && !cleanLine.toLowerCase().includes('foreign key')) {
        const parts = cleanLine.split(/\s+/);
        if (parts.length >= 2) {
          const columnName = parts[0].replace(/["`]/g, '');
          const columnType = parts[1].toUpperCase();
          
          columns.push({
            name: columnName,
            type: columnType,
            nullable: true, // Default to nullable
            primaryKey: false, // You can enhance this later
            foreignKey: undefined // No foreign key info in basic parsing
          });
        }
      }
    }
    
    tables.push({
      tableName: tableName,
      columns: columns,
      sampleData: [], // Empty for now - no sample data in competition
      rowCount: 0     // 0 for now - no row count in competition
    });
  }
  
  return tables;
};

export const CompetitionPage: React.FC = () => {
  const { user } = useAuth();
  const { subscription, isPremiumUser } = useSubscription();
  const { showUpgradeModal, isModalOpen, hideUpgradeModal } = useUpgrade();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('basic');
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState('');
  const [parsedTables, setParsedTables] = useState<TableData[]>([]);

  const [competition, setCompetition] = useState<CompetitionState>({
    competitionId: null,
    difficulty: 'basic',
    schema_ddl: '',
    questions: [],
    total_rounds: 5,
    current_round: 1,
    user_score: 0,
    ai_score: 0,
    time_remaining: 180,
    status: 'setup',
    result: null,
    current_question: '',
    user_query: '',
    rounds_data: [],
    can_get_certificate: false,
    expires_at: null,
    aiResponses: { 1: '', 2: '', 3: '', 4: '', 5: '' }, // Add this
    aiCheckResults: { 1: '', 2: '', 3: '', 4: '', 5: '' } // Add this
  });

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (competition.status === 'active' && competition.time_remaining > 0) {
      interval = setInterval(() => {
        setCompetition(prev => {
          const newTimeRemaining = prev.time_remaining - 1;
          
          if (newTimeRemaining <= 0) {
            // Time's up - auto submit current query
            handleSubmitAnswer();
            return { ...prev, time_remaining: 0, status: 'expired' };
          }
          
          return { ...prev, time_remaining: newTimeRemaining };
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [competition.status, competition.time_remaining]);

  // Add this useEffect to debug the competition state
  useEffect(() => {
    console.log('Competition state updated:', competition);
  }, [competition]);

  // Add this new function to get stored AI response
  const getStoredAIResponse = async (round: number) => {
    if (!competition.competitionId) return null;
    
    try {
      const response = await apiClient.getStoredAIResponse(competition.competitionId, round);
      return response.data;
    } catch (error) {
      console.error(`Failed to get stored AI response for round ${round}:`, error);
      return null;
    }
  };

  // Add this function after the existing functions (around line 190, after getStoredAIResponse)
  const startCompetition = async () => {
    setIsLoading(true);
    
    try {
      const response = await apiClient.startCompetition({
        difficulty: selectedDifficulty
      });
      
      if (response.data) {
        console.log('Full response data:', response.data);
        console.log('Questions received:', response.data.questions);
        
        // Parse the schema and set parsedTables
        if (response.data.schema_ddl) {
          const tables = parseSchemaToTables(response.data.schema_ddl);
          setParsedTables(tables);
        }
        
        setCompetition({
          competitionId: response.data.competition_id,
          difficulty: response.data.difficulty,
          schema_ddl: response.data.schema_ddl,
          questions: response.data.questions,
          total_rounds: response.data.total_rounds,
          current_round: response.data.current_round,
          expires_at: new Date(response.data.expires_at), // Convert string to Date
          status: 'active' as const, // Set to 'active' instead of using response.data.status
          current_question: response.data.questions[0]?.question || '',
          user_query: '',
          time_remaining: response.data.time_limit, // Use time_limit to set time_remaining
          user_score: 0,
          ai_score: 0,
          result: null, // Add the missing result property
          rounds_data: [],
          can_get_certificate: false,
          aiResponses: { 1: '', 2: '', 3: '', 4: '', 5: '' },
          aiCheckResults: { 1: '', 2: '', 3: '', 4: '', 5: '' }
        });
        
        // IMPORTANT: Send AI response request to backend for first round
        console.log('Sending AI response request for round 1...');
        const aiResponse = await apiClient.getAIResponse({
          competition_id: response.data.competition_id,
          question: response.data.questions[0]?.question || '',
          schema_ddl: response.data.schema_ddl,
          difficulty: response.data.difficulty,
          time_limit: 30
        });
        
        if (aiResponse.data) {
          console.log('AI response received for round 1:', aiResponse.data);
          // Store the AI response
          setCompetition(prev => ({
            ...prev,
            aiResponses: {
              ...prev.aiResponses,
              1: aiResponse.data!.answer
            }
          }));
        } else {
          console.error('Failed to get AI response for round 1:', aiResponse.error);
        }
      }
    } catch (error) {
      console.error('Error starting competition:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update this function to actually send the request to the backend
  const getAIResponseForRound = async (round: number) => {
    if (!competition.competitionId) return;
    
    try {
      console.log(`Getting AI response for round ${round}`);
      
      // Send request to backend to generate AI response for this round
      const aiResponse = await apiClient.getAIResponse({
        competition_id: competition.competitionId,
        question: competition.questions[round - 1]?.question || '',
        schema_ddl: competition.schema_ddl,
        difficulty: competition.difficulty,
        time_limit: 30
      });
      
      if (aiResponse.data) {
        console.log(`AI response received for round ${round}:`, aiResponse.data);
        
        // Store AI response for this round
        setCompetition(prev => ({
          ...prev,
          aiResponses: {
            ...prev.aiResponses,
            [round]: aiResponse.data!.answer
          }
        }));
      } else {
        console.error(`Failed to get AI response for round ${round}:`, aiResponse.error);
      }
    } catch (error) {
      console.error(`Error getting AI response for round ${round}:`, error);
    }
  };

  // Update handleSubmitAnswer to use the new flow
  const handleSubmitAnswer = async (timeExpired: boolean = false) => {
    if (!competition.competitionId || !competition.user_query.trim()) {
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Get stored AI response for this round
      const storedAIResponse = await getStoredAIResponse(competition.current_round);
      
      if (!storedAIResponse) {
        console.error('No stored AI response found for this round');
        return;
      }

      // Step 4: Check human response
      const humanCheck = await apiClient.checkHumanResponse({
        competition_id: competition.competitionId!,
        question: competition.current_question,
        sql: competition.user_query,
        difficulty: competition.difficulty,
        round: competition.current_round,
        time_limit: 180,
        response_time: 180 - competition.time_remaining
      });

      if (!humanCheck.data) {
        console.error('Human check failed:', humanCheck.error);
        setIsLoading(false);
        return;
      }

      // Step 5: Check AI response using stored AI response
      const aiCheck = await apiClient.checkAIResponse({
        competition_id: competition.competitionId!,
        question: competition.current_question,
        sql: storedAIResponse.ai_sql,
        difficulty: competition.difficulty,
        round: competition.current_round,
        time_limit: 30,
        response_time: storedAIResponse.ai_response_time
      });

      if (!aiCheck.data) {
        console.error('AI check failed:', aiCheck.error);
        setIsLoading(false);
        return;
      }

      // Step 6: Get round result - FIX THIS CALL
      const roundResult = await apiClient.getRoundResult({
        competition_id: competition.competitionId!,
        round: competition.current_round,
        question: competition.current_question,
        human_explanation: humanCheck.data.explanation,
        ai_explanation: aiCheck.data.explanation,
        human_sql: competition.user_query,
        ai_sql: storedAIResponse.ai_sql,
        human_iscorrect: humanCheck.data.is_correct,
        ai_iscorrect: aiCheck.data.is_correct
      });

      if (!roundResult.data) {
        console.error('Round result failed:', roundResult.error);
        setIsLoading(false);
        return;
      }

      // Store the data in variables to avoid TypeScript errors
      const humanData = humanCheck.data;
      const aiData = aiCheck.data;
      const roundData = roundResult.data;

      // Update competition state with results
      setCompetition(prev => ({
        ...prev,
        rounds_data: [
          ...prev.rounds_data,
          {
            round: competition.current_round,
            question: competition.current_question,
            user_query: competition.user_query,
            ai_query: storedAIResponse.ai_sql,
            user_correct: humanData.is_correct,
            ai_correct: aiData.is_correct,
            user_time: 180 - competition.time_remaining,
            ai_time: storedAIResponse.ai_response_time,
            explanation: roundData.explanation,
            correct_answer: ''
          }
        ],
        user_score: prev.user_score + (humanData.is_correct ? 1 : 0),
        ai_score: prev.ai_score + (aiData.is_correct ? 1 : 0)
      }));

      // Move to next round or end competition
      if (competition.current_round < 5) {
        setCompetition(prev => ({
          ...prev,
          current_round: prev.current_round + 1,
          current_question: competition.questions[competition.current_round]?.question || '',
          user_query: '',
          time_remaining: 180
        }));
        
        // Get AI response for next round
        // getAIResponseForRound(competition.current_round + 1); // This function is not defined
      } else {
        // Competition completed
        setCompetition(prev => ({
          ...prev,
          status: 'completed'
        }));
      }

    } catch (error) {
      console.error('Error submitting answer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCompetitionResult = async () => {
    if (!competition.competitionId) return;

    try {
      const response = await apiClient.getCompetitionResult({
        competition_id: competition.competitionId
      });
      
      if (response.data) {
        setCompetition(prev => ({
          ...prev,
          status: 'completed',
          result: response.data!.final_result,
          user_score: response.data!.user_score,
          ai_score: response.data!.ai_score,
          rounds_data: response.data!.rounds_data,
          can_get_certificate: response.data!.can_get_certificate
        }));
        setShowResults(true);
      }
    } catch (error) {
      console.error('Failed to get competition result:', error);
    }
  };

  const resetCompetition = () => {
    setCompetition({
      competitionId: null,
      difficulty: 'basic',
      schema_ddl: '',
      questions: [],  // ADD THIS
      total_rounds: 5,
      current_round: 1,
      user_score: 0,
      ai_score: 0,
      time_remaining: 180,
      status: 'setup',
      result: null,
      current_question: '',
      user_query: '',
      rounds_data: [],
      can_get_certificate: false,
      expires_at: null,
      aiResponses: { 1: '', 2: '', 3: '', 4: '', 5: '' }, // Add this
      aiCheckResults: { 1: '', 2: '', 3: '', 4: '', 5: '' } // Add this
    });
    setShowResults(false);
    setShowExplanation(false);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getResultIcon = () => {
    if (competition.result === 'win') return <Trophy className="h-8 w-8 text-yellow-500" />;
    if (competition.result === 'lose') return <XCircle className="h-8 w-8 text-red-500" />;
    return <Target className="h-8 w-8 text-blue-500" />;
  };

  const getResultMessage = () => {
    if (competition.result === 'win') return 'Congratulations! You won!';
    if (competition.result === 'lose') return 'Good effort! The AI won this time.';
    return 'It\'s a tie! Great match!';
  };

  if (showResults) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        {/* Results Header */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-8 text-center mb-8">
          {getResultIcon()}
          <h1 className="text-3xl font-bold text-secondary-900 mt-4 mb-2">
            {getResultMessage()}
          </h1>
          <div className="flex justify-center items-center space-x-8 mt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">{competition.user_score}</div>
              <div className="text-sm text-secondary-600">Your Score</div>
            </div>
            <div className="text-2xl text-secondary-400">VS</div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{competition.ai_score}</div>
              <div className="text-sm text-secondary-600">AI Score</div>
            </div>
          </div>
        </div>

        {/* Rounds Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Round Summary</h2>
          <div className="space-y-4">
            {competition.rounds_data.map((round, index) => (
              <div key={index} className="border border-secondary-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium">Round {round.round}</h3>
                  <div className="flex space-x-2">
                    {round.user_correct ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    {round.ai_correct ? (
                      <Brain className="h-5 w-5 text-blue-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
                <p className="text-sm text-secondary-600 mb-2">{round.question}</p>
                <div className="text-xs text-secondary-500">
                  <p><strong>Your Query:</strong> {round.user_query}</p>
                  <p><strong>AI Query:</strong> {round.ai_query}</p>
                  {round.explanation && (
                    <p className="mt-2"><strong>Explanation:</strong> {round.explanation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certificate or Upgrade */}
        {competition.can_get_certificate ? (
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-center space-x-4">
              <Award className="h-8 w-8 text-yellow-600" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800">Congratulations!</h3>
                <p className="text-yellow-700">You've earned a competition certificate!</p>
              </div>
              <Button className="ml-auto">
                <Award className="h-4 w-4 mr-2" />
                Get Certificate
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-center space-x-4">
              <Crown className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-blue-800">Upgrade to Get Certificates</h3>
                <p className="text-blue-700">Premium users get certificates for their achievements!</p>
              </div>
              <Button 
                onClick={() => showUpgradeModal('certificates', subscription?.plan?.name || 'free')}
                className="ml-auto"
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Button onClick={resetCompetition} variant="outline">
            New Competition
          </Button>
          <Button onClick={() => window.location.href = '/achievements'}>
            View Achievements
          </Button>
        </div>

        <UpgradeModal 
          isOpen={isModalOpen} 
          onClose={hideUpgradeModal}
          onUpgrade={() => {}}
          feature="competitions"
          currentPlan={subscription?.plan?.name || 'free'}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-8 mb-8">
        <div className="text-center">
          <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-secondary-900 mb-2">SQL Competition Arena</h1>
          <p className="text-secondary-600">Challenge the AI in 5 rounds of SQL battles</p>
        </div>
      </div>

      {competition.status === 'setup' ? (
        /* Competition Setup */
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <h2 className="text-xl font-semibold mb-6">Choose Your Challenge</h2>
            
            <div className="space-y-4 mb-6">
              {DIFFICULTY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedDifficulty(option.value)}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    selectedDifficulty === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-secondary-200 hover:border-secondary-300'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-4 h-4 rounded-full ${option.color}`}></div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-secondary-600">{option.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                <span className="text-sm font-medium">Total Rounds</span>
                <span className="text-sm text-secondary-600">5 Questions</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                <span className="text-sm font-medium">Your Time Limit</span>
                <span className="text-sm text-secondary-600">3 Minutes Total</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                <span className="text-sm font-medium">AI Time per Question</span>
                <span className="text-sm text-secondary-600">30 Seconds</span>
              </div>
            </div>

            <Button 
              onClick={startCompetition} 
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                'Starting Competition...'
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Start Competition
                </>
              )}
            </Button>
          </div>

          {/* Rules */}
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <h2 className="text-xl font-semibold mb-6">Competition Rules</h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <div className="font-medium">5 Rounds Total</div>
                  <div className="text-sm text-secondary-600">Answer 5 SQL questions to complete the competition</div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Timer className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <div className="font-medium">Time Limits</div>
                  <div className="text-sm text-secondary-600">You get 3 minutes total, AI gets 30 seconds per question</div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Target className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <div className="font-medium">Scoring</div>
                  <div className="text-sm text-secondary-600">1 point for each correct answer. Highest score wins!</div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Brain className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <div className="font-medium">AI Explanations</div>
                  <div className="text-sm text-secondary-600">Get explanations when you answer incorrectly</div>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <Award className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <div className="font-medium">Certificates</div>
                  <div className="text-sm text-secondary-600">Premium users earn certificates for their victories</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Active Competition */
        <div className="space-y-8">
          {/* Competition Status */}
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h2 className="text-xl font-semibold">Round {competition.current_round} of {competition.total_rounds}</h2>
                <div className="flex space-x-1">
                  {Array.from({ length: competition.total_rounds }, (_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        i < competition.current_round - 1
                          ? 'bg-green-500'
                          : i === competition.current_round - 1
                          ? 'bg-blue-500'
                          : 'bg-secondary-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{competition.user_score}</div>
                  <div className="text-xs text-secondary-600">You</div>
                </div>
                <div className="text-secondary-400">VS</div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{competition.ai_score}</div>
                  <div className="text-xs text-secondary-600">AI</div>
                </div>
                <div className="flex items-center space-x-2 text-lg font-mono">
                  <Clock className="h-5 w-5 text-orange-500" />
                  <span className={competition.time_remaining < 30 ? 'text-red-600' : 'text-secondary-900'}>
                    {formatTime(competition.time_remaining)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Schema Display */}
          {competition.schema_ddl && parsedTables.length > 0 && (
            <div className="mb-8">
              <DatabaseSchemaDiagram
                schema={{
                  tables: parsedTables,
                  relationships: [] // You can enhance this later
                }}
                className=""
              />
            </div>
          )}

          {/* Current Question Display */}
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 mb-8">
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center">
                <Target className="h-5 w-5 mr-2" />
                Current Question ({competition.current_round} of {competition.total_rounds})
              </h3>
              <p className="text-secondary-700 bg-secondary-50 p-4 rounded-lg text-lg">
                {competition.current_question || 'No question available'}
              </p>
            </div>
            
            {/* Question and Answer */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Your SQL Query
              </label>
              <Textarea
                value={competition.user_query}
                onChange={(e) => setCompetition(prev => ({ ...prev, user_query: e.target.value }))}
                placeholder="Enter your SQL query here..."
                rows={8}
                className="font-mono"
              />
            </div>

            <div className="flex justify-between items-center">
              <div className="text-sm text-secondary-600">
                Time remaining: {formatTime(competition.time_remaining)}
              </div>
              <Button 
                onClick={() => handleSubmitAnswer()}
                disabled={isLoading || !competition.user_query.trim()}
              >
                {isLoading ? (
                  'Submitting...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Answer
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Query Results Display */}
          {competition.rounds_data.length > 0 && competition.rounds_data[competition.rounds_data.length - 1] && (
            <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Table className="h-5 w-5 mr-2" />
                Query Results
              </h3>
              
              {/* Show the latest round results */}
              {(() => {
                const latestRound = competition.rounds_data[competition.rounds_data.length - 1];
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* User Query Result */}
                      <div className={`p-4 rounded-lg border-2 ${latestRound.user_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <h4 className="font-semibold mb-2 flex items-center">
                          {latestRound.user_correct ? (
                            <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 mr-1 text-red-600" />
                          )}
                          Your Query
                        </h4>
                        <pre className="text-sm bg-white p-2 rounded border">
                          {latestRound.user_query}
                        </pre>
                        {/* Here you would show the actual query results when available */}
                        <TableDataViewer 
                          tables={latestRound.user_query_results || []} 
                          className="mt-2" 
                        />
                      </div>

                      {/* AI Query Result */}
                      <div className={`p-4 rounded-lg border-2 ${latestRound.ai_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <h4 className="font-semibold mb-2 flex items-center">
                          {latestRound.ai_correct ? (
                            <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                          ) : (
                            <X className="h-4 w-4 mr-1 text-red-600" />
                          )}
                          AI Query
                        </h4>
                        <pre className="text-sm bg-white p-2 rounded border">
                          {latestRound.ai_query}
                        </pre>
                        {/* Here you would show the actual AI query results when available */}
                        <TableDataViewer 
                          tables={latestRound.ai_query_results || []} 
                          className="mt-2" 
                        />
                      </div>
                    </div>

                    {/* Explanation */}
                    {latestRound.explanation && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold mb-2 text-blue-800">Explanation</h4>
                        <p className="text-blue-700">{latestRound.explanation}</p>
                      </div>
                    )}

                    {/* Correct Answer */}
                    {latestRound.correct_answer && !latestRound.user_correct && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-semibold mb-2 text-green-800">Correct Answer</h4>
                        <pre className="text-sm bg-white p-2 rounded border text-green-700">
                          {latestRound.correct_answer}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* Explanation Modal */}
      {showExplanation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full m-4 p-6">
            <div className="flex items-center space-x-3 mb-4">
              <XCircle className="h-6 w-6 text-red-500" />
              <h3 className="text-lg font-semibold">Incorrect Answer</h3>
            </div>
            <p className="text-secondary-700 mb-6">{currentExplanation}</p>
            <div className="flex justify-end">
              <Button onClick={() => setShowExplanation(false)}>
                Continue
              </Button>
            </div>
          </div>
        </div>
      )}

      <UpgradeModal 
            isOpen={isModalOpen} 
            onClose={hideUpgradeModal}
            onUpgrade={() => {}}
            feature="competitions"
            currentPlan={subscription?.plan?.name || 'free'}
          />
    </div>
  );
};

export default CompetitionPage;