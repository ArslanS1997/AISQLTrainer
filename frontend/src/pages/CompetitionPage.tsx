import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { Textarea } from '../components/Textarea';
import { 
  Trophy, 
  Clock, 
  Play, 
  Send,
  Brain,
  User,
  Target,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useUpgrade } from '../contexts/UpgradeContext';
import { UpgradeModal } from '../components/UpgradeModal';
import { apiClient } from '../utils/api';

interface CompetitionState {
  competitionId: string | null;
  difficulty: string;
  timeLimit: number;
  timeRemaining: number;
  isActive: boolean;
  isFinished: boolean;
  userQuery: string;
  result: 'win' | 'lose' | null;
  score: number;
  feedback: string;
  startedAt: Date | null;
  expiresAt: Date | null;
}

const DIFFICULTY_OPTIONS = [
  { value: 'basic', label: 'Basic', description: '10 points', time: 300 },
  { value: 'intermediate', label: 'Intermediate', description: '20 points', time: 240 },
  { value: 'advanced', label: 'Advanced', description: '30 points', time: 180 }
];

export const CompetitionPage: React.FC = () => {
  const { user } = useAuth();
  const { isModalOpen, hideUpgradeModal } = useUpgrade();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState('basic');
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    total_competitions: 0,
    wins: 0,
    losses: 0,
    win_rate: 0,
    total_score: 0,
    average_score: 0
  });

  const [competition, setCompetition] = useState<CompetitionState>({
    competitionId: null,
    difficulty: 'basic',
    timeLimit: 300,
    timeRemaining: 300,
    isActive: false,
    isFinished: false,
    userQuery: '',
    result: null,
    score: 0,
    feedback: '',
    startedAt: null,
    expiresAt: null
  });

  // Load competition history and stats
  useEffect(() => {
    if (user) {
      loadHistory();
      loadStats();
    }
  }, [user]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (competition.isActive && competition.timeRemaining > 0) {
      interval = setInterval(() => {
        setCompetition(prev => {
          const newTimeRemaining = prev.timeRemaining - 1;
          
          if (newTimeRemaining <= 0) {
            // Time's up - auto submit
            handleSubmit(true);
            return { ...prev, timeRemaining: 0, isActive: false };
          }
          
          return { ...prev, timeRemaining: newTimeRemaining };
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [competition.isActive, competition.timeRemaining]);

  const loadHistory = async () => {
    try {
      const response = await apiClient.getCompetitionHistory();
      if (response.data) {
        setHistory(response.data.competitions || []);
      }
    } catch (error) {
      console.error('Failed to load competition history:', error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.getCompetitionStats();
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load competition stats:', error);
    }
  };

  const startCompetition = async () => {
    setIsLoading(true);
    
    try {
      const difficultyData = DIFFICULTY_OPTIONS.find(d => d.value === selectedDifficulty);
      const timeLimit = difficultyData?.time || 300;
      
      const response = await apiClient.startCompetition({
        difficulty: selectedDifficulty,
        time_limit: timeLimit
      });
      
      if (response.data) {
        setCompetition({
          competitionId: response.data.competition_id,
          difficulty: response.data.difficulty,
          timeLimit: response.data.time_limit,
          timeRemaining: response.data.time_limit,
          isActive: true,
          isFinished: false,
          userQuery: '',
          result: null,
          score: 0,
          feedback: '',
          startedAt: new Date(response.data.started_at),
          expiresAt: new Date(response.data.expires_at)
        });
      } else if (response.error) {
        alert(response.error);
      }
    } catch (error) {
      console.error('Failed to start competition:', error);
      alert('Failed to start competition');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (timeUp = false) => {
    if (!competition.competitionId) return;
    
    setIsLoading(true);
    
    try {
      const response = await apiClient.submitCompetition({
        competition_id: competition.competitionId,
        query: competition.userQuery
      });
      
      if (response.data) {
        setCompetition(prev => ({
          ...prev,
          isActive: false,
          isFinished: true,
          result: response.data.success ? 'win' : 'lose',
          score: response.data.score,
          feedback: timeUp ? 'Time\'s up! ' + response.data.feedback : response.data.feedback
        }));
        
        // Refresh stats and history
        loadHistory();
        loadStats();
      } else if (response.error) {
        alert(response.error);
      }
    } catch (error) {
      console.error('Failed to submit competition:', error);
      alert('Failed to submit competition');
    } finally {
      setIsLoading(false);
    }
  };

  const resetCompetition = () => {
    setCompetition({
      competitionId: null,
      difficulty: 'basic',
      timeLimit: 300,
      timeRemaining: 300,
      isActive: false,
      isFinished: false,
      userQuery: '',
      result: null,
      score: 0,
      feedback: '',
      startedAt: null,
      expiresAt: null
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to participate in competitions</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">SQL Competition Arena</h1>
          <p className="text-gray-600">Compete against our AI system in SQL challenges</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Competitions</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_competitions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Wins</p>
                <p className="text-2xl font-bold text-gray-900">{stats.wins}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900">{(stats.win_rate * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Score</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_score}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Competition Area */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Competition Arena</h2>
              {competition.isActive && (
                <div className="flex items-center space-x-2 text-lg font-mono">
                  <Clock className="h-5 w-5 text-red-500" />
                  <span className={`${competition.timeRemaining <= 30 ? 'text-red-500' : 'text-gray-600'}`}>
                    {formatTime(competition.timeRemaining)}
                  </span>
                </div>
              )}
            </div>

            {!competition.isActive && !competition.isFinished && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Difficulty
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {DIFFICULTY_OPTIONS.map((option) => (
                      <label key={option.value} className="relative">
                        <input
                          type="radio"
                          name="difficulty"
                          value={option.value}
                          checked={selectedDifficulty === option.value}
                          onChange={(e) => setSelectedDifficulty(e.target.value)}
                          className="sr-only"
                        />
                        <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                          selectedDifficulty === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-medium text-gray-900">{option.label}</h3>
                              <p className="text-sm text-gray-600">{option.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm text-gray-600">{option.time}s</p>
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={startCompetition}
                  disabled={isLoading}
                  className="w-full py-3"
                  size="lg"
                >
                  <Play className="h-5 w-5 mr-2" />
                  {isLoading ? 'Starting...' : 'Start Competition'}
                </Button>
              </div>
            )}

            {competition.isActive && (
              <div className="space-y-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Competition Challenge</h3>
                  <p className="text-blue-800">
                    Write any valid SQL query to compete against our AI system. 
                    The more complex and correct your query, the better your chances of winning!
                  </p>
                  <p className="text-sm text-blue-600 mt-2">
                    Difficulty: <strong>{competition.difficulty}</strong> • 
                    Possible Score: <strong>{
                      competition.difficulty === 'basic' ? '10' :
                      competition.difficulty === 'intermediate' ? '20' : '30'
                    } points</strong>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your SQL Query
                  </label>
                  <Textarea
                    value={competition.userQuery}
                    onChange={(e) => setCompetition(prev => ({ ...prev, userQuery: e.target.value }))}
                    placeholder="Enter your SQL query here..."
                    rows={8}
                    className="font-mono"
                  />
                </div>

                <div className="flex space-x-4">
                  <Button
                    onClick={() => handleSubmit()}
                    disabled={!competition.userQuery.trim() || isLoading}
                    className="flex-1"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isLoading ? 'Submitting...' : 'Submit Query'}
                  </Button>
                </div>
              </div>
            )}

            {competition.isFinished && (
              <div className="space-y-6">
                <div className={`rounded-lg p-6 ${
                  competition.result === 'win' 
                    ? 'bg-green-50 border-2 border-green-200' 
                    : 'bg-red-50 border-2 border-red-200'
                }`}>
                  <div className="flex items-center mb-4">
                    {competition.result === 'win' ? (
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-500" />
                    )}
                    <h3 className={`ml-3 text-xl font-bold ${
                      competition.result === 'win' ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {competition.result === 'win' ? 'You Won!' : 'AI Wins!'}
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    <p className={`font-medium ${
                      competition.result === 'win' ? 'text-green-800' : 'text-red-800'
                    }`}>
                      Score: {competition.score} points
                    </p>
                    <p className={`text-sm ${
                      competition.result === 'win' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {competition.feedback}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={resetCompetition}
                  variant="outline"
                  className="w-full"
                >
                  Start New Competition
                </Button>
              </div>
            )}
          </div>

          {/* Competition History */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Competitions</h2>
            
            {history.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No competitions yet. Start your first competition!
              </p>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 10).map((comp: any) => (
                  <div key={comp.competition_id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {comp.rank === 1 ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            {comp.difficulty.charAt(0).toUpperCase() + comp.difficulty.slice(1)}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(comp.completed_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{comp.score} pts</p>
                        <p className="text-sm text-gray-600">{comp.time_taken}s</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && <UpgradeModal isOpen={isModalOpen} onClose={hideUpgradeModal} onUpgrade={() => {}} feature="competitions" currentPlan="free" />}
    </div>
  );
};

export default CompetitionPage;