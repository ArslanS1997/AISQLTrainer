import React, { useState } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { apiClient } from '../utils/api';
import { Button } from './Button';

const SubscriptionManagement: React.FC = () => {
  const { subscription } = useSubscription(); // Remove refreshSubscription
  const [loading, setLoading] = useState(false);

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You\'ll continue to have access until the end of your current billing period.')) {
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.cancelSubscription();
      if (response.data?.success) {
        alert(response.data.message);
        // Refresh the page to update subscription status
        window.location.reload();
      } else {
        alert('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateSubscription = async () => {
    setLoading(true);
    try {
      const response = await apiClient.reactivateSubscription();
      if (response.data?.success) {
        alert(response.data.message);
        // Refresh the page to update subscription status
        window.location.reload();
      } else {
        alert('Failed to reactivate subscription');
      }
    } catch (error) {
      console.error('Reactivate subscription error:', error);
      alert('Failed to reactivate subscription. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!subscription || subscription.plan.name === 'free') {
    return null;
  }

  // Check if subscription is set to cancel (you may need to add this property to your UserSubscription type)
  const isCanceling = (subscription as any).cancel_at_period_end || false;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Management</h3>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Current Plan:</span>
          <span className="font-medium text-gray-900">{subscription.plan.display_name}</span>
        </div>
        
        {isCanceling && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              Your subscription will be canceled at the end of your current billing period.
            </p>
            <Button
              onClick={handleReactivateSubscription}
              disabled={loading}
              variant="outline"
              className="mt-2 text-yellow-800 border-yellow-800 hover:bg-yellow-100"
            >
              {loading ? 'Reactivating...' : 'Reactivate Subscription'}
            </Button>
          </div>
        )}
        
        {!isCanceling && (
          <Button
            onClick={handleCancelSubscription}
            disabled={loading}
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50"
          >
            {loading ? 'Canceling...' : 'Cancel Subscription'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SubscriptionManagement;



