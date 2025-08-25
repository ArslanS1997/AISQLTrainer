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
  X,
  Lock
} from 'lucide-react';
import { useUpgrade } from '../contexts/UpgradeContext';
import { UpgradeModal } from '../components/UpgradeModal';
import { apiClient } from '../utils/api';
import { SchemaCard } from '../components/SchemaCard';
import { TableData, TableColumn } from '../types';
import { Certificate } from '../components/certificate';
import { SQLEditor } from '../components/SQLEditor';

// Update the CompetitionRound interface to match the API response
interface CompetitionRound {
  round: number;
  question: string;
  user_sql: string;     // Changed from user_query to match API
  ai_sql: string;       // Changed from ai_query to match API
  user_correct: boolean;
  ai_correct: boolean;
  user_points: number;
  ai_points: number;
  correct_answer: string;
  explanation: string;
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
  const [isGeneratingAIResponse, setIsGeneratingAIResponse] = useState(false); // Add this line
  const [selectedDifficulty, setSelectedDifficulty] = useState('basic');
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState('');
  const [parsedTables, setParsedTables] = useState<TableData[]>([]);
  const [showRoundResult, setShowRoundResult] = useState(false);
  const [currentRoundResult, setCurrentRoundResult] = useState<{
    round: number;
    human_correct: boolean;
    ai_correct: boolean;
    human_sql: string;
    ai_sql: string;
    explanation: string;
    winner: string;
  } | null>(null);

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

  // Add new state for cached data
  const [competitionHistory, setCompetitionHistory] = useState<any[]>([]);
  const [achievementsStats, setAchievementsStats] = useState<any>(null);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [isLoadingCachedData, setIsLoadingCachedData] = useState(true);
  const [isRefreshingData, setIsRefreshingData] = useState(false);

  // Check if user has no competitions remaining
  const hasNoCompetitionsRemaining = subscription?.usage && subscription?.plan?.limits && 
    subscription.usage.competitions_entered >= subscription.plan.limits.max_competitions_per_month;

  // Load cached data immediately and refresh in background
  useEffect(() => {
    const loadCachedData = async () => {
      if (!user) return;

      setIsLoadingCachedData(true);
      
      try {
        // Load all cached data in parallel for immediate display
        const [historyResponse, statsResponse, certsResponse] = await Promise.allSettled([
          apiClient.getCompetitionHistory(),
          apiClient.getachievementsStats(),
          apiClient.getUserCertificates()
        ]);

        // Set data from successful responses (cached data loads instantly)
        if (historyResponse.status === 'fulfilled' && historyResponse.value.data) {
          setCompetitionHistory(historyResponse.value.data.competitions || []);
        }
        
        if (statsResponse.status === 'fulfilled' && statsResponse.value.data) {
          setAchievementsStats(statsResponse.value.data);
        }
        
        if (certsResponse.status === 'fulfilled' && certsResponse.value.data) {
          setCertificates(certsResponse.value.data);
        }

        setIsLoadingCachedData(false);

        // Now refresh data in background to ensure freshness
        setIsRefreshingData(true);
        await refreshDataInBackground();
        setIsRefreshingData(false);

      } catch (error) {
        console.error('Error loading cached data:', error);
        setIsLoadingCachedData(false);
      }
    };

    loadCachedData();
  }, [user]);

  // Background refresh function
  const refreshDataInBackground = async () => {
    try {
      // Refresh all data in parallel
      await Promise.allSettled([
        apiClient.getCompetitionHistory(),
        apiClient.getachievementsStats(),
        apiClient.getUserCertificates()
      ]);
      
      console.log('✅ Background data refresh completed');
    } catch (error) {
      console.warn('⚠️ Background refresh failed (non-critical):', error);
    }
  };

  // Add this function inside the component to access competition state
  const calculateScores = () => {
    if (!competition.rounds_data || competition.rounds_data.length === 0) {
      return { userScore: 0, aiScore: 0 };
    }
    
    const userScore = competition.rounds_data.reduce((total: number, round: any) => {
      return total + (round.user_correct ? 1 : 0);
    }, 0);
    
    const aiScore = competition.rounds_data.reduce((total: number, round: any) => {
      return total + (round.ai_correct ? 1 : 0);
    }, 0);
    
    return { userScore, aiScore };
  };

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

  // Add state for pre-fetched final results
  const [prefetchedFinalResults, setPrefetchedFinalResults] = useState<any>(null);

  // Fix the handleSubmitAnswer function to properly complete and fix the button state
  const handleSubmitAnswer = async (timeExpired: boolean = false) => {
    if (!competition.competitionId || !competition.user_query.trim()) {
      return;
    }

    setIsLoading(true); // Show "Submitting..." on submit button

    try {
      // Step 1: Check human response
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

      // Step 2: Get stored AI response for this round to get the SQL
      const storedAIResponse = await apiClient.getStoredAIResponse(
        competition.competitionId!,
        competition.current_round
      );

      if (!storedAIResponse.data) {
        console.error('No stored AI response found for this round');
        setIsLoading(false);
        return;
      }

      // Step 3: Check AI response for this round
      const aiCheck = await apiClient.checkAIResponse({
        competition_id: competition.competitionId!,
        question: competition.current_question,
        sql: '', // Backend will get stored AI SQL from DB
        difficulty: competition.difficulty,
        round: competition.current_round,
        time_limit: 30,
        response_time: 0 // Backend will get stored AI response time
      });

      if (!aiCheck.data) {
        console.error('AI check failed:', aiCheck.error);
        setIsLoading(false);
        return;
      }

      // Step 4: Send to round-result to get the complete round result
      const roundResult = await apiClient.getRoundResult({
        competition_id: competition.competitionId!,
        round: competition.current_round,
        question: competition.current_question,
        human_explanation: humanCheck.data.explanation,
        ai_explanation: aiCheck.data.explanation,
        human_sql: competition.user_query,
        ai_sql: storedAIResponse.data.ai_sql,
        human_iscorrect: humanCheck.data.is_correct,
        ai_iscorrect: aiCheck.data.is_correct,
        difficulty: competition.difficulty
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
      const aiSQL = storedAIResponse.data.ai_sql;
      const aiResponseTime = storedAIResponse.data.ai_response_time || 0;

      // Show round result and enable next round
      setCurrentRoundResult({
        round: competition.current_round,
        winner: roundData.winner,
        human_sql: competition.user_query,
        ai_sql: aiSQL,
        human_correct: humanData.is_correct,
        ai_correct: aiData.is_correct,
        explanation: roundData.explanation
      });
      
      setShowRoundResult(true);

      // Update competition state with results
      setCompetition(prev => ({
        ...prev,
        rounds_data: [
          ...prev.rounds_data,
          {
            round: competition.current_round,
            question: competition.current_question,
            user_sql: competition.user_query,
            ai_sql: aiSQL,
            user_correct: humanData.is_correct,
            ai_correct: aiData.is_correct,
            user_points: 1, // Assuming 1 point for correct answer
            ai_points: 0, // Assuming 0 points for incorrect answer
            correct_answer: '',
            explanation: roundData.explanation
          }
        ],
        user_score: prev.user_score + (humanData.is_correct ? 1 : 0),
        ai_score: prev.ai_score + (aiData.is_correct ? 1 : 0)
      }));
      
      // COMPLETE THE FLOW: Handle final round completion or get AI response for next question
      if (competition.current_round === 5) {
        // FINAL ROUND COMPLETED - Mark as completed automatically
        console.log('🎯 Final round completed, marking competition as completed...');
        
        // Set competition status to completed automatically
        setCompetition(prev => ({ ...prev, status: 'completed' }));
        
        // 🚀 PRE-FETCH FINAL RESULTS IMMEDIATELY FOR INSTANT LOADING
        console.log('⚡ Pre-fetching final results for instant access...');
        try {
          const finalResultsResponse = await apiClient.getCompetitionResult({
            competition_id: competition.competitionId!
          });
          
          if (finalResultsResponse.data) {
            console.log('✅ Final results pre-fetched and cached:', finalResultsResponse.data);
            setPrefetchedFinalResults(finalResultsResponse.data);
            
            // Show success message to user
            console.log('🎉 Final results are ready! Click "View Final Results" for instant access.');
          } else {
            console.warn('⚠️ Failed to pre-fetch final results:', finalResultsResponse.error);
          }
        } catch (prefetchError) {
          console.warn('⚠️ Pre-fetching final results failed (non-critical):', prefetchError);
        }
        
      } else {
        // NOT THE FINAL ROUND - Automatically send AI response request for next question
        // After round result is complete, switch to AI response generation
        setIsLoading(false); // Hide "Submitting..." from submit button
        setIsGeneratingAIResponse(true); // Show AI generation indicator elsewhere
        
        // Automatically send AI response request for next question
        const nextRound = competition.current_round + 1;
        console.log(`🔄 Automatically sending AI response request for next question (round ${nextRound})...`);
        
        try {
          const aiResponse = await apiClient.getAIResponse({
            competition_id: competition.competitionId!,
            round: nextRound,
            question: competition.questions[nextRound - 1]?.question || '',
            schema_ddl: competition.schema_ddl,
            difficulty: competition.difficulty,
            time_limit: 30
          });
          
          if (aiResponse.data) {
            console.log(`✅ AI response request sent for round ${nextRound}`);
            // Store the AI response
            setCompetition(prev => ({
              ...prev,
              aiResponses: {
                ...prev.aiResponses,
                [nextRound]: aiResponse.data!.answer
              }
            }));
          } else {
            console.error(`❌ Failed to get AI response for round ${nextRound}:`, aiResponse.error);
          }
        } finally {
          setIsGeneratingAIResponse(false); // Hide AI generation indicator
        }
      }

      // Clear the current question input
      setCompetition(prev => ({ ...prev, user_query: '' }));
      
      // Move to next round if not the final round
      if (competition.current_round < 5) {
        setCompetition(prev => ({ ...prev, current_round: prev.current_round + 1 }));
      }

      setIsLoading(false);
      
    } catch (error) {
      console.error('❌ Error in handleSubmitAnswer:', error);
      setIsLoading(false);
    }
  };

  // Update moveToNextRound to handle the next question flow
  const moveToNextRound = async () => {
    if (competition.current_round < 5) {
      const nextRound = competition.current_round + 1;
      console.log(`Moving to round ${nextRound}`);
      
      // Move to next round
      setCompetition(prev => ({
        ...prev,
        current_round: nextRound,
        current_question: competition.questions[nextRound - 1]?.question || '',
        user_query: '',
        time_remaining: 180
      }));
      
      // Hide round result and reset for next round
      setShowRoundResult(false);
      setCurrentRoundResult(null);
      
      console.log(`Moved to round ${nextRound}, timer reset to 180 seconds`);
      console.log(`Next question: ${competition.questions[nextRound - 1]?.question}`);
      
      // The AI response should already be generated from handleSubmitAnswer
      // If not, we can generate it here as fallback
      if (!competition.aiResponses[nextRound]) {
        console.warn(`AI response for round ${nextRound} not found, generating now...`);
        await getAIResponseForRound(nextRound);
      }
    } else {
      console.warn('Attempted to move to next round after final round');
    }
  };

  // Also update startCompetition to get AI response for round 1
  const startCompetition = async () => {
    // Check if user has remaining competitions
    if (hasNoCompetitionsRemaining) {
      // Show upgrade modal for competitions
      showUpgradeModal('competitions', subscription?.plan?.name || 'free');
      return;
    }
    
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
          expires_at: new Date(response.data.expires_at),
          status: 'active' as const,
          current_question: response.data.questions[0]?.question || '',
          user_query: '',
          time_remaining: response.data.time_limit,
          user_score: 0,
          ai_score: 0,
          result: null,
          rounds_data: [],
          can_get_certificate: false,
          aiResponses: { 1: '', 2: '', 3: '', 4: '', 5: '' },
          aiCheckResults: { 1: '', 2: '', 3: '', 4: '', 5: '' }
        });
        
        // IMPORTANT: Send AI response request to backend for first round
        console.log('Sending AI response request for round 1...');
        const aiResponse = await apiClient.getAIResponse({
          competition_id: response.data.competition_id,
          round: 1,
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
    } catch (error: any) {
      console.error('Error starting competition:', error);
      
      // Check if the error is due to insufficient competitions
      if (error?.response?.data?.message?.includes('competition') || 
          error?.response?.data?.message?.includes('limit') ||
          error?.response?.status === 403) {
        // Show upgrade modal for competitions
        showUpgradeModal('competitions', subscription?.plan?.name || 'free');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Update getAIResponseForRound to immediately check AI correctness
  const getAIResponseForRound = async (round: number) => {
    if (!competition.competitionId) return;
    
    try {
      console.log(`Getting AI response for round ${round}`);
      
      // Step 1: Send request to backend to generate and store AI response for this round
      const aiResponse = await apiClient.getAIResponse({
        competition_id: competition.competitionId,
        round: round, // ADD THIS - Include the round field
        question: competition.questions[round - 1]?.question || '',
        schema_ddl: competition.schema_ddl,
        difficulty: competition.difficulty,
        time_limit: 30
      });
      
      if (aiResponse.data) {
        console.log(`AI response generated and stored for round ${round}`);
        
        // Step 2: Wait a moment for the backend to process, then fetch the stored AI response
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 3: Fetch the stored AI response for this round
        const storedAIResponse = await apiClient.getStoredAIResponse(
          competition.competitionId,
          round
        );
        
        if (storedAIResponse.data) {
          console.log(`Stored AI response fetched for round ${round}:`, storedAIResponse.data);
          
          // Step 4: Now check if the AI response is correct using the stored data
          const aiCheck = await apiClient.checkAIResponse({
            competition_id: competition.competitionId,
            question: competition.questions[round - 1]?.question || '',
            sql: '', // Backend will get stored AI SQL from DB
            difficulty: competition.difficulty,
            round: round,
            time_limit: 30,
            response_time: storedAIResponse.data.ai_response_time || 0
          });

          if (aiCheck.data) {
            console.log(`AI check completed for round ${round}:`, aiCheck.data);
            // Store AI check result
            setCompetition(prev => ({
              ...prev,
              aiCheckResults: {
                ...prev.aiCheckResults,
                [round]: aiCheck.data
              }
            }));
          } else {
            console.error(`AI check failed for round ${round}:`, aiCheck.error);
          }
        } else {
          console.error(`Failed to fetch stored AI response for round ${round}:`, storedAIResponse.error);
        }
      } else {
        console.error(`Failed to generate AI response for round ${round}:`, aiResponse.error);
      }
    } catch (error) {
      console.error(`Error getting AI response for round ${round}:`, error);
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
          user_score: response.data!.user_points,  // Map user_points to user_score
          ai_score: response.data!.ai_points,      // Map ai_points to ai_score
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

  // Add certificate generation function - FIXED to use the new endpoint
  const handleGetCertificate = async () => {
    if (!competition.competitionId) return;
    
    try {
      console.log('Getting certificate for competition:', competition.competitionId);
      
      // Use the new competition certificate endpoint
      const certificateResponse = await apiClient.getCompetitionCertificate(competition.competitionId);
      
      if (certificateResponse.data) {
        console.log('Competition certificate retrieved successfully:', certificateResponse.data);
        
        // Create certificate data from the response
        const certData = {
          id: certificateResponse.data.competition_id,
          type: 'competition',
          title: certificateResponse.data.topic,
          difficulty: certificateResponse.data.difficulty,
          completion_date: certificateResponse.data.completion_date,
          topic: certificateResponse.data.topic,
          certificate_url: '',
          user_score: certificateResponse.data.user_score,
          ai_score: certificateResponse.data.ai_score,
          performance: certificateResponse.data.performance,
          win_status: certificateResponse.data.win_status
        };
        
        // Store certificate data in state to display the certificate
        setCertificateData(certData);
        setShowCertificate(true);
        
      } else {
        console.error('Failed to get competition certificate:', certificateResponse.error);
        alert('Failed to get certificate. Please try again.');
      }
      
    } catch (error) {
      console.error('Error getting certificate:', error);
      alert('Error getting certificate. Please try again.');
    }
  };

  // Add state for certificate display
  const [certificateData, setCertificateData] = useState<any>(null);
  const [showCertificate, setShowCertificate] = useState(false);

  // Add a function to end the competition after final round review
  const endCompetition = async () => {
    if (!competition.competitionId) return;
    
    try {
      console.log('Ending competition and calculating final results...');
      
      // Call the final-result endpoint to calculate and store final scores
      const finalResultResponse = await apiClient.getCompetitionResult({
        competition_id: competition.competitionId
      });
      
      if (finalResultResponse.data) {
        console.log('Final results calculated successfully:', finalResultResponse.data);
        
        // Update competition state with final results from backend
        // Use the correct property names from the API response
        setCompetition(prev => ({
          ...prev,
          status: 'completed',
          result: finalResultResponse.data!.final_result,
          user_score: finalResultResponse.data!.user_points,  // Map user_points to user_score
          ai_score: finalResultResponse.data!.ai_points,      // Map ai_points to ai_score
          rounds_data: finalResultResponse.data!.rounds_data,
          can_get_certificate: finalResultResponse.data!.can_get_certificate
        }));
        
        // Show final results
        setShowResults(true);
        
      } else {
        console.error('Failed to get final results:', finalResultResponse.error);
        alert('Failed to calculate final results. Please try again.');
      }
      
    } catch (error) {
      console.error('Error ending competition:', error);
      alert('Error ending competition. Please try again.');
    }
  };

  // Add state for final results
  const [finalResults, setFinalResults] = useState<any>(null);

  // Update the handleViewFinalResults function to use pre-fetched data
  const handleViewFinalResults = async () => {
    console.log('🔍 handleViewFinalResults called!');
    
    // 🚀 PRIORITY 1: If we have pre-fetched results, use them immediately
    if (prefetchedFinalResults) {
      console.log('⚡ Using pre-fetched final results for INSTANT loading!');
      setFinalResults(prefetchedFinalResults);
      setShowResults(true);
      
      // Clear the pre-fetched data since we're now using it
      setPrefetchedFinalResults(null);
      return;
    }
    
    // 🔄 PRIORITY 2: Fallback to fetching from backend if no pre-fetched data
    if (!competition.competitionId) {
      console.log('❌ No competition ID found:', competition.competitionId);
      return;
    }
    
    try {
      console.log('🔄 Fetching final results from backend...');
      
      const response = await apiClient.getCompetitionResult({
        competition_id: competition.competitionId
      });
      
      if (response.data) {
        console.log('✅ Final results retrieved successfully:', response.data);
        setFinalResults(response.data);
        setShowResults(true);
      } else {
        console.error('❌ Failed to get final results:', response.error);
        alert('Failed to get final results. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error getting final results:', error);
      alert('Error getting final results. Please try again.');
    }
  };

  // Fix the query display sections to prevent border overflow
  if (showResults && finalResults) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-8 mb-8">
          <div className="text-center">
            <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-secondary-900 mb-2">Competition Results</h1>
            <p className="text-secondary-600">Final scores and round-by-round breakdown</p>
          </div>
        </div>

        {/* Final Score Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4 text-center">Final Score</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Your Score</h3>
              <div className="text-3xl font-bold text-blue-600">{finalResults.user_points}</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800 mb-2">AI Score</h3>
              <div className="text-3xl font-bold text-green-600">{finalResults.ai_points}</div>
            </div>
          </div>
          
          {/* Result */}
          <div className="text-center mt-6">
            <div className={`text-xl font-semibold ${
              finalResults.final_result === 'win' ? 'text-green-600' : 
              finalResults.final_result === 'lose' ? 'text-red-600' : 'text-blue-600'
            }`}>
              {finalResults.final_result === 'win' ? '🎉 You Won!' : 
               finalResults.final_result === 'lose' ? '🎉 AI Won' : '🤝 It\'s a Tie!'}
            </div>
            <p className="text-secondary-600 mt-2">{finalResults.certificate_message}</p>
          </div>
        </div>

        {/* Round-by-Round Results with Fixed Border Overflow */}
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Round-by-Round Results</h2>
          <div className="space-y-4">
            {finalResults.rounds_data.map((round: any, index: number) => (
              <div key={index} className="border border-secondary-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">Round {round.round}</h3>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      round.user_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      You: {round.user_points} pt
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      round.ai_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      AI: {round.ai_points} pt
                    </span>
                  </div>
                </div>
                
                <p className="text-secondary-700 mb-3">{round.question}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                  <div className={`p-3 rounded border ${round.user_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <h4 className="font-semibold mb-2 flex items-center">
                      {round.user_correct ? (
                        <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 mr-1 text-red-600" />
                      )}
                      Your Query
                    </h4>
                    <pre className="text-sm bg-white p-2 rounded border overflow-x-auto whitespace-pre-wrap break-words max-w-full">
                      {round.user_sql}
                    </pre>
                  </div>
                  
                  <div className={`p-3 rounded border ${round.ai_correct ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <h4 className="font-semibold mb-2 flex items-center">
                      {round.ai_correct ? (
                        <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                      ) : (
                        <X className="h-4 w-4 mr-1 text-red-600" />
                      )}
                      AI Query
                    </h4>
                    <pre className="text-sm bg-white p-2 rounded border overflow-x-auto whitespace-pre-wrap break-words max-w-full">
                      {round.ai_sql}
                    </pre>
                  </div>
                </div>
                
                {/* Explanation */}
                {round.explanation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-blue-800">Explanation</h4>
                    <p className="text-blue-700 text-sm">{round.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4">
          <Button onClick={() => window.location.href = '/competition'}>
            Play Again
          </Button>
          <Button onClick={() => window.location.href = '/certificate'}>
            Get Certificate
          </Button>
        </div>
      </div>
    );
  }

  // Also fix the round result display section
  if (showRoundResult && currentRoundResult) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-8 mb-6">
          <h2 className="text-2xl font-semibold text-center mb-6">
            Round {currentRoundResult.round} Result
          </h2>
          
          {/* Winner Display */}
          <div className="mb-4">
            {currentRoundResult.winner === 'human' && (
              <div className="text-green-600 text-lg font-semibold">
                 You won this round! 🎉
              </div>
            )}
            {currentRoundResult.winner === 'ai' && (
              <div className="text-red-600 text-lg font-semibold">
                 AI won this round
              </div>
            )}
            {currentRoundResult.winner === 'both' && (
              <div className="text-blue-600 text-lg font-semibold">
                🤝 It's a tie! Both got it right
              </div>
            )}
            {currentRoundResult.winner === 'none' && (
              <div className="text-yellow-600 text-lg font-semibold">
                ⚠️ Both got it wrong
              </div>
            )}
          </div>

          {/* Results Summary with Fixed Border Overflow */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-2">Your Query</h4>
              <div className={`p-3 rounded border ${currentRoundResult.human_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <code className="text-sm font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-words block max-w-full">
                  {currentRoundResult.human_sql}
                </code>
              </div>
              <div className={`mt-2 text-sm font-medium ${currentRoundResult.human_correct ? 'text-green-600' : 'text-red-600'}`}>
                {currentRoundResult.human_correct ? '✅ Correct' : '❌ Incorrect'}
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-700 mb-2">AI Query</h4>
              <div className={`p-3 rounded border ${currentRoundResult.ai_correct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <code className="text-sm font-mono text-gray-800 overflow-x-auto whitespace-pre-wrap break-words block max-w-full">
                  {currentRoundResult.ai_sql}
                </code>
              </div>
              <div className={`mt-2 text-sm font-medium ${currentRoundResult.ai_correct ? 'text-green-600' : 'text-red-600'}`}>
                {currentRoundResult.ai_correct ? '✅ Correct' : '❌ Incorrect'}
              </div>
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <h4 className="font-semibold text-blue-800 mb-3">Explanation</h4>
            <div className="text-blue-700 text-sm leading-relaxed space-y-3">
              {(() => {
                const explanation = currentRoundResult.explanation;
                
                // Split by key phrases to create proper sections
                const sections = [];
                
                // Handle all possible explanation patterns
                if (explanation.includes('Why AI was correct:')) {
                  const aiPart = explanation.split('Why AI was correct:')[1]?.split('Why you were wrong:')[0];
                  if (aiPart) {
                    sections.push({
                      type: 'ai_correct',
                      title: 'Why AI was correct:',
                      content: aiPart.trim()
                    });
                  }
                }
                
                if (explanation.includes('Why you were correct:')) {
                  const humanPart = explanation.split('Why you were correct:')[1]?.split('Why AI was wrong:')[0]?.split('Why AI was also correct:')[0];
                  if (humanPart) {
                    sections.push({
                      type: 'human_correct',
                      title: 'Why you were correct:',
                      content: humanPart.trim()
                    });
                  }
                }
                
                if (explanation.includes('Why you were wrong:')) {
                  const humanWrongPart = explanation.split('Why you were wrong:')[1]?.split('Here\'s how you can correct')[0]?.split('To get the actual')[0];
                  if (humanWrongPart) {
                    sections.push({
                      type: 'human_wrong',
                      title: 'Why you were wrong:',
                      content: humanWrongPart.trim()
                    });
                  }
                }
                
                if (explanation.includes('Why AI was wrong:')) {
                  const aiWrongPart = explanation.split('Why AI was wrong:')[1]?.split('Why you were correct:')[0];
                  if (aiWrongPart) {
                    sections.push({
                      type: 'ai_wrong',
                      title: 'Why AI was wrong:',
                      content: aiWrongPart.trim()
                    });
                  }
                }
                
                if (explanation.includes('Why AI was also correct:')) {
                  const aiAlsoPart = explanation.split('Why AI was also correct:')[1]?.split('Here\'s how')[0];
                  if (aiAlsoPart) {
                    sections.push({
                      type: 'ai_also_correct',
                      title: 'Why AI was also correct:',
                      content: aiAlsoPart.trim()
                    });
                  }
                }
                
                if (explanation.includes('Here\'s how you can correct')) {
                  const correctionPart = explanation.split('Here\'s how you can correct')[1];
                  if (correctionPart) {
                    sections.push({
                      type: 'correction',
                      title: 'Here\'s how you can correct your query:',
                      content: correctionPart.trim()
                    });
                  }
                }
                
                // If no sections were found, treat as general explanation
                if (sections.length === 0) {
                  sections.push({
                    type: 'general',
                    title: 'Explanation',
                    content: explanation
                  });
                }
                
                return sections.map((section, index) => (
                  <div key={index} className="mb-4">
                    <h5 className="font-semibold text-blue-900 mb-2 flex items-center">
                      {section.type === 'ai_correct' && <span className="text-green-600 mr-2">✅</span>}
                      {section.type === 'human_correct' && <span className="text-green-600 mr-2">✅</span>}
                      {section.type === 'human_wrong' && <span className="text-red-600 mr-2">❌</span>}
                      {section.type === 'ai_wrong' && <span className="text-red-600 mr-2">❌</span>}
                      {section.type === 'ai_also_correct' && <span className="text-green-600 mr-2">✅</span>}
                      {section.type === 'correction' && <span className="text-blue-600 mr-2">🔄</span>}
                      {section.type === 'general' && <span className="text-blue-600 mr-2">ℹ️</span>}
                      {section.title}
                    </h5>
                    <div className="ml-6">
                      {(() => {
                        // Handle markdown code blocks first
                        if (section.content.includes('```sql')) {
                          const parts = section.content.split('```sql');
                          return parts.map((part, partIndex) => {
                            if (partIndex === 0) {
                              // Text before the code block
                              return part.split('. ').map((sentence, sentIndex) => {
                                const trimmedSentence = sentence.trim();
                                if (!trimmedSentence) return null;
    return (
                                  <p key={sentIndex} className="mb-2 leading-relaxed">
                                    {trimmedSentence}
                                  </p>
                                );
                              });
                            } else {
                              // Handle the SQL code block
                              const codeAndText = part.split('```');
                              if (codeAndText.length >= 2) {
                                const sqlCode = codeAndText[0].trim();
                                const remainingText = codeAndText.slice(1).join('```');

  return (
                                  <div key={partIndex}>
                                    <pre className="bg-white p-3 rounded border text-sm font-mono text-blue-800 overflow-x-auto mb-3">
                                      {sqlCode}
                                    </pre>
                                    {remainingText && (
                <div>
                                        {remainingText.split('. ').map((sentence, sentIndex) => {
                                          const trimmedSentence = sentence.trim();
                                          if (!trimmedSentence) return null;
                                          return (
                                            <p key={sentIndex} className="mb-2 leading-relaxed">
                                              {trimmedSentence}
                                            </p>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              }
                            }
                          });
                        } else {
                          // No code blocks, just regular text
                          return section.content.split('. ').map((sentence, sentIndex) => {
                            const trimmedSentence = sentence.trim();
                            if (!trimmedSentence) return null;
                            
                            if (trimmedSentence.includes('SELECT') || trimmedSentence.includes('FROM') || trimmedSentence.includes('WHERE')) {
                              return (
                                <div key={sentIndex} className="mb-3">
                                  <p className="mb-2">{trimmedSentence.split('SELECT')[0]}</p>
                                  <pre className="bg-white p-3 rounded border text-sm font-mono text-blue-800 overflow-x-auto">
                                    SELECT{trimmedSentence.split('SELECT')[1]}
                                  </pre>
                                </div>
                              );
                            }
                            
                            return (
                              <p key={sentIndex} className="mb-2 leading-relaxed">
                                {trimmedSentence}
                              </p>
                            );
                          });
                        }
                      })()}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-center space-x-4 mt-8">
            {competition.current_round < 5 ? (
              // Not final round - show "Next Round" button
              <Button onClick={moveToNextRound} className="bg-blue-600 hover:bg-blue-700">
                Next Round
              </Button>
            ) : (
              // Final round - show "View Final Results" button
              <Button 
                onClick={handleViewFinalResults} 
                className="bg-green-600 hover:bg-green-700"
              >
                View Final Results
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Update the competition completion section to show pre-fetch status
  if (competition.status === 'completed' && !showResults) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-8 text-center mb-8">
          <Trophy className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-secondary-900 mb-4">Competition Completed! 🎉</h1>
          
          {/* Show pre-fetch status */}
          {prefetchedFinalResults ? (
            <div className="mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-center space-x-2 text-green-700">
                  <Zap className="h-5 w-5" />
                  <span className="font-medium">Results are ready for instant viewing!</span>
                </div>
              </div>
              <p className="text-secondary-600 mb-6">Your final results have been pre-loaded and are ready to view immediately.</p>
            </div>
          ) : (
            <p className="text-secondary-600 mb-6">Click below to view your final results and get your certificate.</p>
          )}
          
          <Button 
            onClick={handleViewFinalResults} 
            className={`${prefetchedFinalResults ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {prefetchedFinalResults ? (
              <>
                <Zap className="h-4 w-4 mr-2" />
                View Final Results (Instant!)
              </>
            ) : (
              'View Final Results'
            )}
          </Button>
        </div>
      </div>
    );
  }

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
                  <p><strong>Your Query:</strong> {round.user_sql}</p>  {/* Changed from user_query */}
                  <p><strong>AI Query:</strong> {round.ai_sql}</p>      {/* Changed from ai_query */}
                  {round.explanation && (
                    <p className="mt-2"><strong>Explanation:</strong> {round.explanation}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certificate Display */}
        {showCertificate && certificateData && (
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Your Competition Certificate</h2>
            <div className="max-w-7xl w-full"> {/* Already updated to max-w-7xl */}
              <Certificate
                type="competition"
                competition={{
                  name: `SQL Competition - ${competition.difficulty.charAt(0).toUpperCase() + competition.difficulty.slice(1)}`,
                  date: new Date().toLocaleDateString(),
                  certificate_url: "", // Required by interface but not used
                  result: (() => {
                    const { userScore, aiScore } = calculateScores();
                    return userScore > aiScore ? 'win' : userScore < aiScore ? 'lose' : 'tie';
                  })(),
                  user_score: (() => {
                    const { userScore } = calculateScores();
                    return userScore;
                  })(),
                  ai_score: (() => {
                    const { aiScore } = calculateScores();
                    return aiScore;
                  })(),
                  difficulty: competition.difficulty
                }}
                userName={`${user?.name || 'User'} `}
                session={undefined}
                master={undefined}
              />
            </div>
          </div>
        )}

        {/* Certificate or Upgrade - Fixed premium check */}
        {isPremiumUser ? (
          <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-6 mb-8">
            <div className="flex items-center space-x-4">
              <Award className="h-8 w-8 text-yellow-600" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-800">Congratulations!</h3>
                <p className="text-yellow-700">You've earned a competition certificate!</p>
              </div>
              <Button 
                onClick={handleGetCertificate}
                className="ml-auto"
                disabled={showCertificate}
              >
                <Award className="h-4 w-4 mr-2" />
                {showCertificate ? 'Certificate Generated' : 'Get Certificate'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-center space-x-4">
              <Crown className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-blue-800">Upgrade to Get Certificates</h3>
                <p className="text-yellow-700">Premium users get certificates for their achievements!</p>
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
                <span className="text-sm text-secondary-600">3 Minutes per question</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                <span className="text-sm font-medium">AI Time per Question</span>
                <span className="text-sm text-secondary-600">30 Seconds</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                <span className="text-sm font-medium">Competitions Remaining</span>
                <span className="text-sm text-secondary-600">
                  {subscription?.usage && subscription?.plan?.limits 
                    ? `${Math.max(0, subscription.plan.limits.max_competitions_per_month - subscription.usage.competitions_entered)} / ${subscription.plan.limits.max_competitions_per_month}`
                    : 'Loading...'
                  }
                </span>
              </div>
              {hasNoCompetitionsRemaining && (
                <>
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Lock className="h-4 w-4 text-orange-500" />
                      <span className="text-sm text-orange-700">
                        You've reached your monthly competition limit. Upgrade your plan to continue competing!
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-center">
                      <h4 className="font-medium text-blue-800 mb-2">Upgrade to Continue Competing</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Upgrade to get more monthly competitions and premium features!
                      </p>
                      <Button 
                        onClick={() => showUpgradeModal('competitions', subscription?.plan?.name || 'free')}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        size="sm"
                      >
                        <Crown className="h-4 w-4 mr-2" />
                        View Plans
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            <Button 
              onClick={hasNoCompetitionsRemaining ? () => showUpgradeModal('competitions', subscription?.plan?.name || 'free') : startCompetition}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                'Starting Competition...'
              ) : hasNoCompetitionsRemaining ? (
                <>
                  <Lock className="h-5 w-5 mr-2" />
                  Upgrade
                </>
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
                  <div className="text-sm text-secondary-600">You get 3 minutes per question, AI gets 30 seconds per question</div>
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

          {/* Schema Display - Simple like practice mode */}
          {competition.schema_ddl && parsedTables.length > 0 && (
            <div className="mb-6">
              <DatabaseSchemaDiagram
                schema={{
                  tables: parsedTables,
                  relationships: []
                }}
                className=""
              />
            </div>
          )}

          {/* Current Question Display */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Question {competition.current_round}/5</h3>
            <p className="text-gray-700 mb-4">{competition.current_question}</p>
            
            {/* Update the SQL input area to be larger and better styled */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your SQL Query
              </label>
              <SQLEditor
                value={competition.user_query}
                onChange={(value) => setCompetition(prev => ({ ...prev, user_query: value }))}
                placeholder="Write your SQL query here..."
                rows={12}
                className="w-full"
                disabled={false}
              />
            </div>
            
            {/* Submit Button */}
            <div className="flex justify-between items-center">
              <div className="text-sm text-secondary-600">
                <span className="font-medium">Tip:</span> Write clear, readable SQL queries
              </div>
              <Button 
                onClick={() => handleSubmitAnswer()}
                disabled={isLoading || !competition.user_query.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Submit Answer
                  </>
                )}
              </Button>
            </div>
          </div>

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
