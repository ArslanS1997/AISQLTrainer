import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';
import { Button } from '../components/Button';
import { Check, X, Star, Crown, Zap, Users } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: { monthly: 0, yearly: 0 },
    icon: Users,
    iconColor: 'text-gray-500',
    bgColor: 'bg-gray-50',
    features: [
      { text: '5 schema generations per month', included: true },
      { text: '3 competitions per month', included: true },
      { text: 'Basic AI models', included: true },
      { text: 'Basic support', included: true },
    ],
  },
  {
    name: 'Pro',
    price: { 
      monthly: 20, 
      yearly: Math.round(20 * 12 * 0.8) // $20/month with 20% off yearly = $192/year
    },
    icon: Zap,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    popular: true,
    features: [
      { text: '20 schema generations per month', included: true },
      { text: '20 competitions per month', included: true },
      { text: 'Latest AI models', included: true },
      { text: 'Certificate downloads', included: true },
      { text: 'Master certificate', included: true },
    ],
  },
  {
    name: 'Max',
    price: { 
      monthly: 30, 
      yearly: Math.round(30 * 12 * 0.8) // $30/month with 20% off yearly = $288/year
    },
    icon: Crown,
    iconColor: 'text-purple-500',
    bgColor: 'bg-purple-50',
    features: [
      { text: '50 schema generations per month', included: true },
      { text: '50 competitions per month', included: true },
      { text: 'Premium AI models', included: true },
      { text: 'All certificates & badges', included: true },
      { text: 'Master certificate', included: true }
    ],
  }
];

const PricingPage: React.FC = () => {
  const { user, loading: authLoading, signIn } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  // Only show loading state if auth is still loading
  const isLoading = authLoading;

  const handleSubscribe = async (planName: string) => {
    if (!user) {
      // Show login prompt instead of redirecting
      setShowLoginPrompt(true);
      return;
    }

    if (planName === 'Free') {
      return; // Already on free plan
    }

    setLoading(planName);

    try {
      const response = await apiClient.createCheckoutSession(planName.toLowerCase(), billingCycle);
      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to start subscription process. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleLogin = async () => {
    try {
      // Close the modal first to prevent multiple clicks
      setShowLoginPrompt(false);
      // Actually call the signIn function to trigger Google OAuth
      await signIn();
    } catch (error) {
      console.error('Login failed:', error);
      // Reopen the modal if login fails
      setShowLoginPrompt(true);
    }
  };

  // Show loading spinner while auth is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      {/* Login Prompt Modal */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Sign in to Continue
            </h3>
            <p className="text-gray-600 mb-6">
              Please sign in to subscribe to our premium plans and unlock advanced features.
            </p>
            <div className="space-y-3">
              <Button
                onClick={handleLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Sign In with Google
              </Button>
              <Button
                onClick={() => setShowLoginPrompt(false)}
                variant="outline"
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your SQL Learning Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Unlock advanced features and accelerate your SQL mastery
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                billingCycle === 'yearly' ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>
              Yearly
            </span>
            {billingCycle === 'yearly' && (
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
                Save 20%
              </span>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = plan.price[billingCycle];
            
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border ${
                  plan.popular ? 'border-blue-500 shadow-xl' : 'border-gray-200 shadow-lg'
                } ${plan.bgColor} p-8`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <Icon className={`h-12 w-12 mx-auto mb-4 ${plan.iconColor}`} />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-gray-900">${price}</span>
                    {plan.name !== 'Free' && (
                      <span className="text-gray-500">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center">
                      {feature.included ? (
                        <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      ) : (
                        <X className="h-5 w-5 text-gray-300 mr-3 flex-shrink-0" />
                      )}
                      <span className={feature.included ? 'text-gray-900' : 'text-gray-400'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleSubscribe(plan.name)}
                  disabled={loading === plan.name}
                  className={`w-full ${
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-white border border-gray-300 text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {loading === plan.name ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                      Processing...
                    </>
                  ) : plan.name === 'Free' ? (
                    'Current Plan'
                  ) : (
                    `Get ${plan.name}`
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PricingPage;