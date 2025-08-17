import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { apiClient } from '../utils/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Check, Star, Zap, Crown } from 'lucide-react';

const PricingPage: React.FC = () => {
  const { user } = useAuth();
  const { subscription } = useSubscription();
  
  // Add promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeValid, setPromoCodeValid] = useState(false);
  const [promoCodeApplied, setPromoCodeApplied] = useState(false);
  const [promoCodeError, setPromoCodeError] = useState('');

  // Add promo code validation function
  const validatePromoCode = async () => {
    if (!promoCode.trim()) return;
    
    try {
      const response = await apiClient.validatePromoCode(promoCode);
      if (response.data?.valid) {
        setPromoCodeValid(true);
        setPromoCodeApplied(true);
        setPromoCodeError('');
      } else {
        setPromoCodeValid(false);
        setPromoCodeApplied(false);
        setPromoCodeError('Invalid promo code');
      }
    } catch (error) {
      setPromoCodeValid(false);
      setPromoCodeApplied(false);
      setPromoCodeError('Failed to validate promo code');
    }
  };

  // Add this function to remove promo code
  const handlePromoCodeRemove = () => {
    setPromoCodeApplied(false);
    setPromoCode('');
    setPromoCodeError('');
    setPromoCodeValid(false);
  };

  const handleCheckout = async (plan: string, billingCycle: string) => {
    try {
      const response = await apiClient.createCheckoutSession(
        plan, 
        billingCycle, 
        promoCodeApplied ? promoCode : undefined
      );
      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
    }
  };

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      features: [
        'Practice SQL queries',
        'Get instant feedback',
        'Earn certificates (view only)',
        'Basic AI models',
        'Community support'
      ],
      popular: false,
      buttonText: 'Current Plan',
      buttonVariant: 'outline' as const,
      disabled: true
    },
    {
      name: 'Pro',
      price: '$20',
      period: 'month',
      features: [
        'Everything in Free',
        'Download PDF certificates',
        'LinkedIn profile integration',
        'Advanced AI models',
        'Competition mode',
        'Priority support'
      ],
      popular: true,
      buttonText: 'Upgrade to Pro',
      buttonVariant: 'primary' as const, // Change from 'default' to 'primary'
      disabled: false
    },
    {
      name: 'Max',
      price: '$30',
      period: 'month',
      features: [
        'Everything in Pro',
        'Master certificate eligibility',
        'Unlimited competitions',
        'Custom schema generation',
        'API access',
        'Dedicated support'
      ],
      popular: false,
      buttonText: 'Upgrade to Max',
      buttonVariant: 'primary' as const, // Change from 'default' to 'primary'
      disabled: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start free and upgrade as you grow. All plans include our core SQL learning features.
          </p>
        </div>

        {/* Promo Code Section */}
        <div className="max-w-md mx-auto mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Have a Promo Code?</h3>
            {!promoCodeApplied ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  placeholder="Enter promo code"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={validatePromoCode}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Apply
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-green-600">
                <span>✓ Promo code applied: {promoCode}</span>
                <button
                  onClick={handlePromoCodeRemove}
                  className="text-red-600 hover:text-red-800 underline"
                >
                  Remove
                </button>
              </div>
            )}
            {promoCodeError && (
              <p className="text-red-500 text-sm mt-1">{promoCodeError}</p>
            )}
            {promoCodeValid && !promoCodeApplied && (
              <p className="text-green-500 text-sm mt-1">✓ Promo code valid! Click Apply to use it.</p>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={plan.name}
              className={`relative ${
                plan.popular
                  ? 'ring-2 ring-blue-500 transform scale-105'
                  : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600">/{plan.period}</span>
                </div>

                <ul className="text-left space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  onClick={() => handleCheckout(plan.name.toLowerCase(), 'monthly')}
                  variant={plan.buttonVariant}
                  disabled={plan.disabled}
                  className="w-full"
                >
                  {plan.buttonText}
                </Button>

                {/* Add this promo code section */}
                <div className="mt-4">
                  {!promoCodeApplied ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Enter promo code"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={validatePromoCode}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                      >
                        Apply
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600">
                      <span>✓ Promo code applied: {promoCode}</span>
                      <button
                        onClick={handlePromoCodeRemove}
                        className="text-red-600 hover:text-red-800 underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {promoCodeError && (
                    <p className="text-red-500 text-sm mt-1">{promoCodeError}</p>
                  )}
                  {promoCodeValid && !promoCodeApplied && (
                    <p className="text-green-500 text-sm mt-1">✓ Promo code valid! Click Apply to use it.</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Can I change my plan anytime?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Upgrades take effect immediately, 
                while downgrades take effect at the end of your current billing period.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                What happens if I cancel?
              </h3>
              <p className="text-gray-600">
                You'll continue to have access to all features until the end of your current billing period. 
                After that, you'll return to the free plan.
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                Yes! Start with our free plan to experience the platform. You can upgrade anytime to unlock 
                premium features.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;