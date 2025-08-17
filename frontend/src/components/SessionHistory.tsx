import React, { useState, useEffect } from 'react';
import { apiClient } from '../utils/api';
import { Button } from './Button';
import { Clock, Trophy, Database } from 'lucide-react';
import { APISessionResponse } from '../types';

export const SessionHistory: React.FC = () => {
  const [sessions, setSessions] = useState<APISessionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.getSessions();
      if (response.data) {
        setSessions(response.data);
      } else {
        setError('Failed to load sessions');
      }
    } catch (err) {
      setError('Error loading sessions');
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSessionStatus = (session: APISessionResponse) => {
    return session.completed_at ? 'Completed' : 'In Progress';
  };

  const getStatusColor = (session: APISessionResponse) => {
    return session.completed_at ? 'text-green-600' : 'text-blue-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-secondary-600">Loading sessions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={loadSessions} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-secondary-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-secondary-900">Practice History</h2>
        <Button onClick={loadSessions} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-8">
          <Database className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-secondary-900 mb-2">No Practice Sessions Yet</h3>
          <p className="text-secondary-600">Start practicing SQL to see your history here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <div
              key={session.session_id}
              className="border border-secondary-200 rounded-lg p-4 hover:border-primary-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${getStatusColor(session)}`}>
                    {getSessionStatus(session)}
                  </span>
                  <span className="text-xs text-secondary-500">
                    {session.session_id}
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-secondary-700">
                      {session.total_score} pts
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-secondary-500" />
                    <span className="text-xs text-secondary-600">
                      {formatDate(session.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary-600">Queries:</span>
                  <span className="font-medium">{session.queries?.length || 0}</span>
                </div>
                
                {(session.queries?.length || 0) > 0 && (
                  <div className="bg-secondary-50 rounded p-3">
                    <h4 className="text-sm font-medium text-secondary-900 mb-2">Recent Queries:</h4>
                    <div className="space-y-1">
                      {session.queries?.slice(0, 3).map((query, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <code className="bg-white px-2 py-1 rounded border text-secondary-700">
                            {query.query?.length > 50 ? query.query.substring(0, 50) + '...' : query.query}
                          </code>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              query.query ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {query.query ? '✓' : '✗'}
                            </span>
                            <span className="text-secondary-600">
                              {query.executed_at ? formatDate(query.executed_at) : ''}
                            </span>
                          </div>
                        </div>
                      )) || []}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};