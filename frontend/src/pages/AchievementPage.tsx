import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';
import { 
  TrendingUp, 
  Target, 
  Trophy,
  Award,
  BookOpen,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Leaderboard } from '../components/Leaderboard';
import MasterCertificateCard from '../components/MasterCertificateCard';

export const AchievementsPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalPoints: 0,
    averageScore: 0,
    currentStreak: 0,
    totalCompetitions: 0,
    bestRank: null as number | null,
  });
  const [progress, setProgress] = useState({
    beginnerCompleted: 0,
    intermediateCompleted: 0,
    advancedCompleted: 0,
    totalQueries: 0,
    accuracyRate: 0,
    learningPath: [] as any[]
  });
  const [recentActivity, setRecentActivity] = useState({
    recentSessions: [] as any[],
    recentCompetitions: [] as any[]
  });
  // Add this state for subscription check
  const [userSubscription, setUserSubscription] = useState<any>(null);

  // Fetch real data from backend
  useEffect(() => {
    const fetchachievementsData = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch achievements stats
        const statsResponse = await apiClient.getachievementsStats();
        if (statsResponse.error) {
          throw new Error(statsResponse.error);
        }
        
        // Fetch learning progress
        const progressResponse = await apiClient.getLearningProgress();
        if (progressResponse.error) {
          throw new Error(progressResponse.error);
        }
        
        // Fetch recent activity
        const activityResponse = await apiClient.getRecentActivity();
        if (activityResponse.error) {
          throw new Error(activityResponse.error);
        }
        
        // Update stats
        if (statsResponse.data) {
          setStats(prevStats => ({
            ...prevStats,
            totalSessions: statsResponse.data.total_practice_sessions,
            totalPoints: statsResponse.data.total_points,
            averageScore: statsResponse.data.average_score,
            currentStreak: statsResponse.data.current_streak,
            totalCompetitions: statsResponse.data.total_competitions,
            bestRank: statsResponse.data.best_rank,
          }));
        }
        
        // Update progress
        if (progressResponse.data) {
          setProgress({
            beginnerCompleted: progressResponse.data.beginner_completed,
            intermediateCompleted: progressResponse.data.intermediate_completed,
            advancedCompleted: progressResponse.data.advanced_completed,
            totalQueries: progressResponse.data.total_queries,
            accuracyRate: progressResponse.data.accuracy_rate,
            learningPath: progressResponse.data.learning_path
          });
        }
        
        // Update recent activity
        if (activityResponse.data) {
          setRecentActivity({
            recentSessions: activityResponse.data.recent_sessions || [],
            recentCompetitions: activityResponse.data.recent_competitions || []
          });
        }
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load achievements data');
        console.error('achievements data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchachievementsData();
  }, [user]);

  // Add subscription check to useEffect
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        // Get user's subscription status
        const subscriptionResponse = await apiClient.getUserSubscription();
        if (subscriptionResponse.data) {
          setUserSubscription(subscriptionResponse.data);
        }
      } catch (err) {
        console.error('Subscription fetch error:', err);
      }
    };
    fetchData();
  }, [user]);

  // Transform recent sessions data for display
  const displayRecentSessions = recentActivity.recentSessions.map((session, index) => ({
    id: session.session_id || index,
    topic: 'SQL Practice',
    difficulty: session.difficulty || 'unknown',
    score: session.total_score || 0,
    points: session.total_score || 0,
    date: session.created_at ? new Date(session.created_at).toLocaleDateString() : 'Unknown',
    isCorrect: (session.total_score || 0) > 50,
    query: 'Session completed'
  }));

  // Dynamic achievements based on user progress
  const achievements = [
    { 
      id: 1, 
      name: 'First Steps', 
      description: 'Complete your first SQL session', 
      earned: stats.totalSessions > 0, 
      icon: '🎯' 
    },
    { 
      id: 2, 
      name: 'Quick Learner', 
      description: 'Complete 10 sessions', 
      earned: stats.totalSessions >= 10, 
      icon: '⚡' 
    },
    { 
      id: 3, 
      name: 'SQL Master', 
      description: 'Score 90%+ average', 
      earned: stats.averageScore >= 90, 
      icon: '👑' 
    },
    { 
      id: 4, 
      name: 'Consistent', 
      description: 'Practice for 7 days in a row', 
      earned: stats.currentStreak >= 7, 
      icon: '📅' 
    },
    { 
      id: 5, 
      name: 'Beginner Graduate', 
      description: 'Complete 5 beginner sessions', 
      earned: progress.beginnerCompleted >= 5, 
      icon: '🎓' 
    },
    { 
      id: 6, 
      name: 'Intermediate Achiever', 
      description: 'Complete 3 intermediate sessions', 
      earned: progress.intermediateCompleted >= 3, 
      icon: '📈' 
    },
    { 
      id: 7, 
      name: 'Advanced Expert', 
      description: 'Complete 1 advanced session', 
      earned: progress.advancedCompleted >= 1, 
      icon: '🚀' 
    },
    { 
      id: 8, 
      name: 'Query Master', 
      description: 'Execute 50+ queries', 
      earned: progress.totalQueries >= 50, 
      icon: '📊' 
    },
    { 
      id: 9, 
      name: 'Precision Expert', 
      description: 'Achieve 80%+ accuracy', 
      earned: progress.accuracyRate >= 80, 
      icon: '🎯' 
    },
    { 
      id: 10, 
      name: 'Competitor', 
      description: 'Join your first competition', 
      earned: stats.totalCompetitions > 0, 
      icon: '🏆' 
    }
  ];

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading achievements...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <XCircle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-lg font-semibold text-secondary-900 mb-2">Error Loading achievements</h2>
          <p className="text-secondary-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-secondary-900 mb-2">Achievements</h1>
            <p className="text-secondary-600">Track your progress and unlock certificates</p>
          </div>
        </div>

        {/* Master Certificate Card */}
        <MasterCertificateCard className="mb-8" />

        {/* Stats Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg">
                <BookOpen className="h-6 w-6 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Total Sessions</p>
                <p className="text-2xl font-bold text-secondary-900">{stats.totalSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Trophy className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Total Points</p>
                <p className="text-2xl font-bold text-secondary-900">{stats.totalPoints}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Target className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Average Score</p>
                <p className="text-2xl font-bold text-secondary-900">{stats.averageScore}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-secondary-600">Current Streak</p>
                <p className="text-2xl font-bold text-secondary-900">{stats.currentStreak} days</p>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Learning Progress</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600">Beginner</span>
                <span className="font-medium text-secondary-900">{progress.beginnerCompleted} completed</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600">Intermediate</span>
                <span className="font-medium text-secondary-900">{progress.intermediateCompleted} completed</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600">Advanced</span>
                <span className="font-medium text-secondary-900">{progress.advancedCompleted} completed</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Query Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600">Total Queries</span>
                <span className="font-medium text-secondary-900">{progress.totalQueries}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600">Accuracy Rate</span>
                <span className="font-medium text-secondary-900">{progress.accuracyRate}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Competition Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600">Competitions</span>
                <span className="font-medium text-secondary-900">{stats.totalCompetitions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-secondary-600">Best Rank</span>
                <span className="font-medium text-secondary-900">
                  {stats.bestRank ? `#${stats.bestRank}` : 'Not ranked yet'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Sessions */}
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <h2 className="text-lg font-semibold text-secondary-900 mb-6">Recent Sessions</h2>
            
            <div className="space-y-4">
              {displayRecentSessions.length > 0 ? (
                displayRecentSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {session.isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium text-secondary-900">{session.topic}</p>
                        <p className="text-sm text-secondary-600">
                          {session.difficulty} • {session.date}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-secondary-900">{session.score} pts</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
                  <p className="text-secondary-500">No recent sessions yet</p>
                  <p className="text-sm text-secondary-400">Start practicing to see your progress here!</p>
                </div>
              )}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
            <h2 className="text-lg font-semibold text-secondary-900 mb-6">Achievements</h2>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {achievements.map((achievement) => (
                <div 
                  key={achievement.id} 
                  className={`flex items-center space-x-3 p-4 rounded-lg ${
                    achievement.earned 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-secondary-50 border border-secondary-200'
                  }`}
                >
                  <div className="text-2xl">{achievement.icon}</div>
                  <div className="flex-1">
                    <p className={`font-medium ${
                      achievement.earned ? 'text-green-900' : 'text-secondary-900'
                    }`}>
                      {achievement.name}
                    </p>
                    <p className={`text-sm ${
                      achievement.earned ? 'text-green-700' : 'text-secondary-600'
                    }`}>
                      {achievement.description}
                    </p>
                  </div>
                  {achievement.earned && (
                    <Award className="h-5 w-5 text-green-500" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Leaderboard */}
          <div className="lg:col-span-1">
            <Leaderboard entries={[]} />
          </div>
        </div>
      </div>
    </div>
  );
}; 