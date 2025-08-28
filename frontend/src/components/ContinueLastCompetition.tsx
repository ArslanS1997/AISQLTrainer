import React, { useState, useEffect } from 'react';
import { Trophy, ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '../contexts/AuthContext';
import { checkIncompleteCompetition, ContinueCompetitionData } from '../utils/api';

export const ContinueLastCompetition: React.FC = () => {
  const { user } = useAuth();
  const [hasIncompleteCompetition, setHasIncompleteCompetition] = useState(false);
  const [competitionData, setCompetitionData] = useState<ContinueCompetitionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      checkIncompleteCompetitionData();
    }
  }, [user]);

  // Add this effect to check when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Check if it's been more than 30 seconds since last check
        if (!lastChecked || (Date.now() - lastChecked.getTime()) > 30000) {
          checkIncompleteCompetitionData();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, lastChecked]);

  const checkIncompleteCompetitionData = async () => {
    try {
      setIsLoading(true);
      
      console.log('Checking for incomplete competition for user:', user?.id);
      
      // Use the API function from api.ts
      const competitionResult = await checkIncompleteCompetition(user?.id!);
      
      console.log('Competition result:', competitionResult);
      
      if (competitionResult.success && competitionResult.has_competition && competitionResult.data) {
        console.log('Found incomplete competition:', competitionResult.data);
        setHasIncompleteCompetition(true);
        setCompetitionData(competitionResult.data);
      } else {
        console.log('No incomplete competition found');
        setHasIncompleteCompetition(false);
        setCompetitionData(null);
      }
      
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking incomplete competition:', error);
      setHasIncompleteCompetition(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueCompetition = () => {
    if (competitionData) {
      // Navigate to the competition
      window.location.href = `/competition/${competitionData.competition_id}`;
    }
  };

  // Always render the component, but show different content
  return (
    <div className="mb-6">
      {isLoading ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-3"></div>
            <p className="text-yellow-700">Checking for incomplete competitions...</p>
          </div>
        </div>
      ) : hasIncompleteCompetition && competitionData ? (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Continue your competition?
              </h3>
              
              <div className="flex items-center space-x-3">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    Competition • {competitionData.status}
                  </p>
                  <p className="text-xs text-gray-500">
                    Started {new Date(competitionData.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  onClick={handleContinueCompetition}
                  size="sm"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Continue Competition
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
