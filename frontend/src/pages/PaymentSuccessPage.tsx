import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { apiClient } from '../utils/api';
import { CheckCircle, Loader, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/Button';

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, refetchSubscription } = useSubscription();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [subscriptionInfo, setSubscriptionInfo] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    if (sessionId && user) {
      checkSubscriptionStatus();
    } else if (!sessionId) {
      setStatus('error');
    }
  }, [sessionId, user]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (sessionId) {
      console.log('Payment successful for session:', sessionId);
      // You can use this session_id to verify the payment with your backend if needed
    }
    
    // Refresh subscription context
    if (refetchSubscription) {
      refetchSubscription();
    }
  }, [refetchSubscription]);

  const checkSubscriptionStatus = async (isRetry = false) => {
    try {
      if (!isRetry) {
        // Wait for webhook to process
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      // Try to refresh subscription from Stripe
      await apiClient.refreshSubscription();
      
      // Refetch from context
      await refetchSubscription();
      
      // Check if subscription is updated
      const response = await apiClient.getUserSubscription();
      
      if (response.data?.plan?.name !== 'free') {
        setSubscriptionInfo(response.data);
        setStatus('success');
        console.log('✅ Payment successful, subscription activated!');
      } else if (retryCount < 3) {
        // Retry up to 3 times with increasing delays
        const delay = (retryCount + 1) * 2000; // 2s, 4s, 6s
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          checkSubscriptionStatus(true);
        }, delay);
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          checkSubscriptionStatus(true);
        }, 2000);
      } else {
        setStatus('error');
      }
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await apiClient.refreshSubscription();
      await refetchSubscription();
      const response = await apiClient.getUserSubscription();
      
      if (response.data?.plan?.name !== 'free') {
        setSubscriptionInfo(response.data);
        setStatus('success');
      } else {
        alert('Subscription is still processing. Please wait a few more minutes or contact support.');
      }
    } catch (error) {
      console.error('Manual refresh failed:', error);
      alert('Failed to refresh subscription. Please try again or contact support.');
    } finally {
      setIsRefreshing(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment</h2>
          <p className="text-gray-600 mb-4">
            We're confirming your payment and activating your subscription...
          </p>
          <p className="text-sm text-gray-500">
            This usually takes 30-60 seconds. Attempt {retryCount + 1}/4
          </p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your <span className="font-semibold text-green-600">{subscriptionInfo?.plan?.name?.toUpperCase()}</span> subscription is now active.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/main')}
              className="w-full"
            >
              Start Learning with AI
            </Button>
            <Button 
              onClick={() => navigate('/subscription')}
              variant="outline"
              className="w-full"
            >
              Manage Subscription
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
        <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Issue</h2>
        <p className="text-gray-600 mb-6">
          We're having trouble confirming your payment. This might be temporary.
        </p>
        <div className="space-y-3">
          <Button 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="w-full"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                Checking...
              </>
            ) : (
              'Check Payment Status'
            )}
          </Button>
          <Button 
            onClick={() => navigate('/pricing')}
            variant="outline"
            className="w-full"
          >
            Back to Pricing
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          If the issue persists, please contact support with session ID: {sessionId}
        </p>
      </div>
    </div>
  );
};
