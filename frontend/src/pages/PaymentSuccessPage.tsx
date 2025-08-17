import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { apiClient } from '../utils/api';
import { Button } from '../components/Button';
import { CheckCircle, ArrowRight, Trophy, Zap, X } from 'lucide-react';

const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshSubscription } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const handlePaymentSuccess = async () => {
      if (!sessionId) {
        setError('No session ID found');
        setLoading(false);
        return;
      }

      try {
        // Refresh subscription status
        if (refreshSubscription) {
          await refreshSubscription();
        }

        // Get subscription details
        const response = await apiClient.getSubscriptionStatus();
        if (response.data) {
          setSubscriptionDetails(response.data);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error handling payment success:', err);
        setError('Failed to process payment success');
        setLoading(false);
      }
    };

    handlePaymentSuccess();
  }, [sessionId, refreshSubscription]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Processing your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <X className="h-16 w-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate('/main')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="text-green-500 mb-4">
            <CheckCircle className="h-20 w-20 mx-auto" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Payment Successful! 🎉
          </h1>
          <p className="text-xl text-gray-600">
            Welcome to {subscriptionDetails?.plan === 'pro' ? 'Pro' : 'Max'} Plan
          </p>
        </div>

        {/* What You Get */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            What You Now Have Access To
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex items-start space-x-3">
              <Trophy className="h-6 w-6 text-yellow-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-900">Download Certificates</h3>
                <p className="text-sm text-gray-600">Get PDF versions of all your earned certificates</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Zap className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-900">Advanced AI Models</h3>
                <p className="text-sm text-gray-600">Access to GPT-4 and Claude for better learning</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Trophy className="h-6 w-6 text-purple-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-900">Competition Mode</h3>
                <p className="text-sm text-gray-600">Compete against AI in timed SQL challenges</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Zap className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-gray-900">LinkedIn Integration</h3>
                <p className="text-sm text-gray-600">Share your certificates on your professional profile</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center space-y-4">
          <Button 
            onClick={() => navigate('/main')}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg"
          >
            Start Learning <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          
          <div>
            <Button 
              onClick={() => navigate('/certificates')}
              variant="outline"
              className="px-8 py-3"
            >
              View Your Certificates
            </Button>
          </div>
        </div>

        {/* Session Info for Debugging */}
        {sessionId && (
          <div className="mt-12 text-center text-sm text-gray-500">
            <p>Session ID: {sessionId}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
