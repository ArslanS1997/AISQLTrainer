import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/Button';
import { CheckCircle, ArrowRight, Trophy, Zap, X, AlertCircle } from 'lucide-react';

interface CheckoutSessionData {
  session_id: string;
  payment_status: string;
  status: string;
  amount_total: number;
  currency: string;
  customer_email: string;
  subscription: {
    id: string;
    status: string;
    plan: string;
    current_period_end: number;
    cancel_at_period_end: boolean;
  };
  metadata: any;
}

const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<CheckoutSessionData | null>(null);

  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError('No session ID found in URL');
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Verifying payment for session:', sessionId);
        
        // Import apiClient dynamically to avoid circular dependencies
        const { apiClient } = await import('../utils/api');
        const response = await apiClient.verifyCheckoutSession(sessionId);
        
        console.log('📊 Verification response:', response);
        
        if (response.data && response.data.success) {
          setSessionData(response.data);
          console.log('✅ Payment verified successfully');
        } else {
          const errorMsg = response.error || response.data?.error || 'Payment verification failed';
          setError(errorMsg);
          console.error('❌ Payment verification failed:', errorMsg);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('❌ Error verifying payment:', err);
        setError('Failed to verify payment. Please contact support.');
        setLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your payment...</p>
          <p className="text-sm text-gray-500 mt-2">Session ID: {sessionId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-16 w-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Failed</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <Button onClick={() => navigate('/subscription')}>
              Try Again
            </Button>
            <Button 
              onClick={() => navigate('/main')} 
              variant="outline"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <X className="h-16 w-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Payment Data</h1>
          <p className="text-gray-600 mb-6">Unable to retrieve payment information</p>
          <Button onClick={() => navigate('/subscription')}>
            Go to Subscription
          </Button>
        </div>
      </div>
    );
  }

  // Determine plan name from subscription data
  const getPlanName = () => {
    if (sessionData.subscription?.plan) {
      return sessionData.subscription.plan.charAt(0).toUpperCase() + sessionData.subscription.plan.slice(1);
    }
    return 'Premium';
  };

  const getAmountDisplay = () => {
    if (sessionData.amount_total) {
      const amount = sessionData.amount_total / 100; // Convert from cents
      return `${amount} ${sessionData.currency.toUpperCase()}`;
    }
    return 'N/A';
  };

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
            Welcome to {getPlanName()} Plan
          </p>
          <p className="text-lg text-gray-500 mt-2">
            Amount: {getAmountDisplay()}
          </p>
        </div>

        {/* Payment Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
            Payment Confirmation
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Session ID:</span>
                <p className="text-sm text-gray-900 font-mono">{sessionData.session_id}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Status:</span>
                <p className="text-sm text-gray-900 capitalize">{sessionData.status}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Payment Status:</span>
                <p className="text-sm text-gray-900 capitalize">{sessionData.payment_status}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <span className="text-sm font-medium text-gray-500">Amount:</span>
                <p className="text-sm text-gray-900">{getAmountDisplay()}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Plan:</span>
                <p className="text-sm text-gray-900">{getPlanName()}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-500">Customer Email:</span>
                <p className="text-sm text-gray-900">{sessionData.customer_email || 'N/A'}</p>
              </div>
            </div>
          </div>
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
            onClick={() => navigate('/practice')}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3 text-lg"
          >
            Start Learning <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
          
          <div>
            <Button 
              onClick={() => navigate('/certificate')}
              variant="outline"
              className="px-8 py-3"
            >
              View Your Certificates
            </Button>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Session ID: {sessionId}</p>
          <p>Payment Status: {sessionData.payment_status}</p>
          <p>Session Status: {sessionData.status}</p>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
