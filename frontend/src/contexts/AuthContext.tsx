import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserSubscription } from '../types';
import { apiClient } from '../utils/api';

interface AuthContextType {
  user: User | null;
  subscription: UserSubscription | null;
  loading: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  refetchSubscription: () => Promise<void>;
  isPremiumUser: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper to check if user is premium
  const isPremiumUser = () => {
    if (!subscription?.plan) return false;
    const planName = subscription.plan.name;
    return planName === 'pro' || planName === 'max';
  };

  const refetchSubscription = async () => {
    if (!user) return;
    
    try {
      console.log('🔄 Refetching subscription data...');
      const response = await apiClient.getUserSubscription();
      if (response.data) {
        setSubscription(response.data);
        console.log('✅ Subscription refetched:', response.data.plan.name);
        
        // Trigger a custom event to notify other components
        window.dispatchEvent(new CustomEvent('subscriptionUpdated', { 
          detail: response.data 
        }));
      }
    } catch (err) {
      console.error('❌ Error refetching subscription:', err);
    }
  };

  useEffect(() => {
    // Check for existing JWT token and validate with backend
    const checkAuthStatus = async () => {
      const jwtToken = localStorage.getItem('jwt_token');
      if (jwtToken) {
        try {
          console.log('🔄 Checking existing auth status...');
          const response = await apiClient.getCurrentUser();
          if (response.data && response.data.user) {
            const userData = response.data.user;
            const newUser: User = {
              id: userData.id,
              email: userData.email,
              name: userData.name,
              picture: userData.picture,
              points: userData.points || 0,
              createdAt: new Date(userData.created_at || Date.now()),
              lastLoginAt: new Date(userData.last_login_at || Date.now()),
            };
            setUser(newUser);
            console.log('✅ User authenticated:', newUser.email);
            
            // Set subscription data if available from auth response
            if (userData.subscription) {
              setSubscription(userData.subscription);
              console.log('✅ Subscription loaded from auth:', userData.subscription.plan.name);
            } else {
              // If not available, fetch separately
              console.log('🔄 No subscription in auth response, fetching separately...');
              try {
                const subResponse = await apiClient.getUserSubscription();
                if (subResponse.data) {
                  setSubscription(subResponse.data);
                  console.log('✅ Subscription fetched separately:', subResponse.data.plan.name);
                }
              } catch (subErr) {
                console.error('❌ Error fetching subscription:', subErr);
              }
            }
          }
        } catch (err) {
          console.error('❌ Auth check failed:', err);
          localStorage.removeItem('jwt_token');
        }
      }
      setLoading(false);
    };

    checkAuthStatus();
  }, []);

  const signIn = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Starting sign in process...');
      
      // Use simpler Google OAuth flow for now - just get access token
      if (typeof window !== 'undefined' && (window as any).google) {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID || '',
          scope: 'openid email profile',
          callback: async (response: any) => {
            try {
              if (response.access_token) {
                console.log('✅ Google OAuth successful, authenticating with backend...');
                
                // Store Google access token
                localStorage.setItem('google_access_token', response.access_token);

                // Authenticate with our backend using access token
                const authResponse = await apiClient.authenticateWithGoogle(response.access_token, response.access_token);
                
                if (authResponse.data && authResponse.data.access_token) {
                  // Store JWT token
                  localStorage.setItem('jwt_token', authResponse.data.access_token);
                  
                  // Set user data
                  const userData = authResponse.data.user;
                  const newUser: User = {
                    id: userData.id,
                    email: userData.email,
                    name: userData.name,
                    picture: userData.picture,
                    points: userData.points || 0,
                    createdAt: new Date(userData.created_at || Date.now()),
                    lastLoginAt: new Date(userData.last_login_at || Date.now()),
                  };
                  
                  setUser(newUser);
                  localStorage.setItem('user', JSON.stringify(newUser));
                  console.log('✅ User set:', newUser.email);

                  // Set subscription data - CRITICAL for immediate access
                  if (userData.subscription) {
                    setSubscription(userData.subscription);
                    console.log('✅ Subscription set from login:', userData.subscription.plan.name);
                    
                    // Trigger immediate update event
                    window.dispatchEvent(new CustomEvent('subscriptionUpdated', { 
                      detail: userData.subscription 
                    }));
                  } else {
                    console.log('⚠️ No subscription data in login response');
                  }
                } else {
                  throw new Error('Failed to authenticate with backend: ' + (authResponse.error || 'Unknown error'));
                }
              }
            } catch (error) {
              console.error('❌ Authentication error:', error);
              setError(error instanceof Error ? error.message : 'Authentication failed');
            } finally {
              setLoading(false);
            }
          },
        });
        
        client.requestAccessToken();
      } else {
        console.error('❌ Google OAuth not available');
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Sign in error:', error);
      setError(error instanceof Error ? error.message : 'Sign in failed');
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log('🔄 Signing out...');

      // Call backend logout endpoint
      try {
        await apiClient.logout();
      } catch (error) {
        console.error('❌ Backend logout error:', error);
      }

      // Revoke Google token if available
      if (typeof window !== 'undefined' && (window as any).google) {
        const googleToken = localStorage.getItem('google_access_token');
        if (googleToken) {
          try {
            (window as any).google.accounts.oauth2.revoke(googleToken, () => {
              console.log('✅ Google token revoked');
            });
          } catch (error) {
            console.error('❌ Google token revocation error:', error);
          }
        }
      }

      // Clear state and storage
      setUser(null);
      setSubscription(null);
      setError(null);
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('user');
      
      // Trigger event to notify components
      window.dispatchEvent(new CustomEvent('userSignedOut'));
      
      console.log('✅ Sign out complete');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        subscription, 
        loading, 
        error, 
        signIn, 
        signOut, 
        clearError, 
        refetchSubscription,
        isPremiumUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 