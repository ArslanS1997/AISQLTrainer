import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';
import { CheckCircle, Loader, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId && user) {
      checkSubscriptionStatus();
    } else if (!sessionId) {
      setStatus('error');
    }
  }, [sessionId, user]);

  const checkSubscriptionStatus = async () => {
    try {
      // Wait a moment for webhook to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get updated subscription info
      const response = await apiClient.getUserSubscription();
      
      if (response.data?.plan?.name !== 'free') {
        setSubscriptionInfo(response.data);
        setStatus('success');
      } else {
        // Still on free plan - payment might not have processed yet
        // Try again after a longer delay
        setTimeout(async () => {
          const retryResponse = await apiClient.getUserSubscription();
          if (retryResponse.data?.plan?.name !== 'free') {
            setSubscriptionInfo(retryResponse.data);
            setStatus('success');
          } else {
            setStatus('error');
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      setStatus('error');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing Payment...</h2>
          <p className="text-gray-600">Please wait while we activate your subscription.</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Processing...</h2>
          <p className="text-gray-600 mb-6">
            Your payment is being processed. If your subscription doesn't activate shortly, please contact support.
          </p>
          <div className="space-x-4">
            <Button variant="outline" onClick={() => navigate('/pricing')}>
              Back to Pricing
            </Button>
            <Button onClick={() => navigate('/subscription')}>
              Check Subscription
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Welcome to {subscriptionInfo?.plan?.display_name || 'your new plan'}! Your subscription is now active.
        </p>
        
        {subscriptionInfo && (
          <div className="bg-white rounded-lg p-6 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-4">Subscription Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Plan:</span>
                <span className="font-medium">{subscriptionInfo.plan.display_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Schemas per month:</span>
                <span className="font-medium">{subscriptionInfo.plan.max_schemas_per_month}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Competitions per month:</span>
                <span className="font-medium">{subscriptionInfo.plan.max_competitions_per_month}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Certificates:</span>
                <span className="font-medium">
                  {subscriptionInfo.plan.can_download_certificates ? 'Included' : 'Not included'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Button className="w-full" onClick={() => navigate('/practice')}>
            Start Practicing SQL
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate('/subscription')}>
            View Subscription Details
          </Button>
        </div>
      </div>
    </div>
  );
};
