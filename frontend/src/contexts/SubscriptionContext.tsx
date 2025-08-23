import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSubscription } from '../types';
import { apiClient } from '../utils/api';
import { cacheManager } from '../utils/cache'; // Fix the import path

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  loading: boolean;
  error: string | null;
  isPremiumUser: boolean;
  refetchSubscription: () => Promise<void>;
  upgradePlan: (planName: string) => Promise<any>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Compute isPremiumUser based on subscription plan
  const isPremiumUser = subscription?.plan?.name === 'pro' || subscription?.plan?.name === 'max';

  const refetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear cache to force fresh data
      cacheManager.invalidate('user_subscription');
      
      const response = await apiClient.getUserSubscription();
      if (response.data) {
        setSubscription(response.data);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch subscription';
      setError(errorMessage);
      console.error('Failed to refetch subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const upgradePlan = async (planName: string) => {
    try {
      // For now, just refetch subscription
      // You can implement the actual upgrade logic later
      await refetchSubscription();
      
      return { success: true };
    } catch (error) {
      console.error('Upgrade failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    refetchSubscription();
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        error,
        isPremiumUser,
        refetchSubscription,
        upgradePlan,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};



