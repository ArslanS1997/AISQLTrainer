import { useEffect } from 'react';
import { UserSubscription } from '../types';

export const useSubscriptionUpdate = (callback: (subscription: UserSubscription) => void) => {
  useEffect(() => {
    const handleSubscriptionUpdate = (event: CustomEvent) => {
      callback(event.detail);
    };

    window.addEventListener('subscriptionUpdated', handleSubscriptionUpdate as EventListener);

    return () => {
      window.removeEventListener('subscriptionUpdated', handleSubscriptionUpdate as EventListener);
    };
  }, [callback]);
};
