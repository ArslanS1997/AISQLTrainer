import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';

export const AuthTest: React.FC = () => {
  const { user, loading, error, signIn, signOut, clearError } = useAuth();
  const { subscription } = useSubscription();

  if (loading) {
    return (
      <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-2 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Authentication Test</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          <p>{error}</p>
          <button 
            onClick={clearError}
            className="mt-2 text-sm underline"
          >
            Clear Error
          </button>
        </div>
      )}

      {user ? (
        <div className="space-y-3">
          <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            <h3 className="font-medium">Authenticated as:</h3>
            <p><strong>ID:</strong> {user.id}</p>
            <p><strong>Name:</strong> {user.name}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Points:</strong> {user.points}</p>
            <p><strong>Plan:</strong> {subscription?.plan.name || 'free'}</p>
          </div>
          
          <div className="space-y-2">
            <p><strong>JWT Token:</strong> {localStorage.getItem('jwt_token') ? '✅ Present' : '❌ Missing'}</p>
            <p><strong>Google Token:</strong> {localStorage.getItem('google_access_token') ? '✅ Present' : '❌ Missing'}</p>
          </div>

          <button
            onClick={signOut}
            className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-600">Not authenticated</p>
          <button
            onClick={signIn}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
          >
            Sign In with Google
          </button>
        </div>
      )}
    </div>
  );
};

