import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSubscription } from '../types';
import { apiClient } from '../utils/api';

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  loading: boolean;
  error: string | null;
  refetchSubscription: () => Promise<void>;
  isPremiumUser: () => boolean;  // Add this helper
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  subscription: null,
  loading: false,
  error: null,
  refetchSubscription: async () => {},
  isPremiumUser: () => false,
});

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getUserSubscription();
      if (response.data) {
        // Ensure plan name is normalized
        const normalizedData = {
          ...response.data,
          plan: {
            ...response.data.plan,
            name: response.data.plan.name
          }
        };
        setSubscription(normalizedData);
      }
    } catch (err) {
      setError('Failed to fetch subscription');
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const isPremiumUser = () => {
    if (!subscription?.plan) return false;
    const planName = subscription.plan.name;
    return planName === 'pro' || planName === 'max';
  };

  useEffect(() => {
    fetchSubscription();
  }, []);

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      loading,
      error,
      refetchSubscription: fetchSubscription,
      isPremiumUser
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);



