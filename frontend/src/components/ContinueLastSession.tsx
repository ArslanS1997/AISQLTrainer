import React, { useState, useEffect } from 'react';
import { Play, ArrowRight } from 'lucide-react';
import { Button } from './Button';
import { useAuth } from '../contexts/AuthContext';
import { checkIncompleteSession, ContinueSessionData } from '../utils/api';

export const ContinueLastSession: React.FC = () => {
  const { user } = useAuth();
  const [hasIncompleteSession, setHasIncompleteSession] = useState(false);
  const [sessionData, setSessionData] = useState<ContinueSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    if (user) {
      checkIncompleteSessionData();
    }
  }, [user]);

  // Add this effect to check when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        // Check if it's been more than 30 seconds since last check
        if (!lastChecked || (Date.now() - lastChecked.getTime()) > 30000) {
          checkIncompleteSessionData();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, lastChecked]);

  const checkIncompleteSessionData = async () => {
    try {
      setIsLoading(true);
      
      console.log('Checking for incomplete session for user:', user?.id);
      
      // Use the API function from api.ts
      const sessionResult = await checkIncompleteSession(user?.id!);
      
      console.log('Session result:', sessionResult);
      
      if (sessionResult.success && sessionResult.has_session && sessionResult.data) {
        console.log('Found incomplete session:', sessionResult.data);
        setHasIncompleteSession(true);
        setSessionData(sessionResult.data);
      } else {
        console.log('No incomplete session found');
        setHasIncompleteSession(false);
        setSessionData(null);
      }
      
      setLastChecked(new Date());
    } catch (error) {
      console.error('Error checking incomplete session:', error);
      setHasIncompleteSession(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueSession = () => {
    if (sessionData) {
      // Navigate to the session
      window.location.href = `/practice/session/${sessionData.session_id}`;
    }
  };

  // Always render the component, but show different content
  return (
    <div className="mb-6">
      {isLoading ? (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
            <p className="text-blue-700">Checking for incomplete sessions...</p>
          </div>
        </div>
      ) : hasIncompleteSession && sessionData ? (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Continue your practice session?
              </h3>
              
              <div className="flex items-center space-x-3">
                <Play className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm text-gray-700">
                    Practice Session • {sessionData.progress.percentage}% complete
                  </p>
                  <p className="text-xs text-gray-500">
                    Started {new Date(sessionData.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  onClick={handleContinueSession}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Continue Session
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Show a subtle message when there's nothing to continue
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600">
            No incomplete sessions found. Ready to start a new practice session!
          </p>
        </div>
      )}
    </div>
  );
};
