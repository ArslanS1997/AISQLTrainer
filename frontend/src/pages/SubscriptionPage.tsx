import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../utils/api';
import { Button } from '../components/Button';
import { CheckCircle, CreditCard, Database, Trophy, BarChart3, Lock } from 'lucide-react';
import { UserSubscription, SubscriptionPlan } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';
import { PlanChangeModal } from '../components/PlanChangeModal';

export const SubscriptionPage: React.FC = () => {
  const { user } = useAuth();
  const { subscription, loading, error, refetchSubscription } = useSubscription();
  const currentPlan = subscription?.plan?.name || 'free';
  const [canceling, setCanceling] = useState(false);
  const [reactivating, setReactivating] = useState(false);
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false);
  const [selectedTargetPlan, setSelectedTargetPlan] = useState('');

  const getPlanDisplayName = (planObj?: SubscriptionPlan | string) => {
    let planName: string;
    if (typeof planObj === 'string') {
      planName = planObj;
    } else {
      planName = planObj?.name ? planObj.name : 'free';
    }
    switch (planName) {
      case 'pro': return 'Pro Plan';
      case 'max': return 'Max Plan';
      default: return 'Free Plan';
    }
  };

  const getPlanLimits = () => {
    if (subscription?.plan?.limits) {
      return {
        schemas: subscription.plan.limits.max_schemas_per_month,
        competitions: subscription.plan.limits.max_competitions_per_month
      };
    }
    return { schemas: 5, competitions: 3 };
  };

  const limits = getPlanLimits();
  const usage = subscription?.usage || { schemas_generated: 0, competitions_entered: 0 };
  const userIsPremium = subscription?.plan?.name === 'pro' || subscription?.plan?.name === 'max';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your subscription...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view your subscription.</p>
        </div>
      </div>
    );
  }

  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your subscription? You\'ll continue to have access until the end of your current billing period.')) {
      return;
    }

    setCanceling(true);
    try {
      const response = await apiClient.cancelSubscription();
      if (response.data?.success) {
        alert(response.data.message);
        // Refresh subscription data
        await refetchSubscription();
      } else {
        alert('Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Cancel subscription error:', error);
      alert('Failed to cancel subscription. Please try again.');
    } finally {
      setCanceling(false);
    }
  };

  const handleReactivateSubscription = async () => {
    if (!window.confirm('Are you sure you want to reactivate your subscription? Your subscription will continue as normal.')) {
      return;
    }

    setReactivating(true);
    try {
      const response = await apiClient.reactivateSubscription();
      if (response.data?.success) {
        alert(response.data.message);
        // Refresh subscription data
        await refetchSubscription();
      } else {
        alert('Failed to reactivate subscription');
      }
    } catch (error) {
      console.error('Reactivate subscription error:', error);
      alert('Failed to reactivate subscription. Please try again.');
    } finally {
      setReactivating(false);
    }
  };

  const handleChangePlan = () => {
    // Always redirect to pricing page where they can see all plans
    window.location.href = '/pricing';
  };

  // Alternative approach: Show plan selection first, then open modal
  const openPlanChangeModal = (targetPlan: string) => {
    setSelectedTargetPlan(targetPlan);
    setShowPlanChangeModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Your Subscription</h1>
          <p className="mt-2 text-gray-600">View your current plan and achievements</p>
        </div>

        {/* Tab Navigation (only Overview) */}
        <div className="mb-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm border-blue-500 text-blue-600`}
              disabled
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Overview
              </div>
            </button>
          </nav>
        </div>

        {/* Overview Content */}
        <div className="grid gap-6">
          {/* Current Plan Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold">Current Plan</h2>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  Active
                </span>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                {getPlanDisplayName(subscription?.plan || 'free')}
              </h3>
              <p className="text-gray-600 mt-1">
                {currentPlan === 'free' 
                  ? 'Get started with basic features' 
                  : 'Enjoy premium features and higher limits'
                }
              </p>
            </div>

            {currentPlan === 'free' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-blue-800 font-medium">Ready to upgrade?</p>
                <p className="text-blue-700 mt-1">Get certificates, more schemas, competitions, and premium features.</p>
                <Button 
                  className="mt-3"
                  onClick={() => window.location.href = '/pricing'}
                >
                  View Pricing Plans
                </Button>
              </div>
            )}
          </div>

          {/* Usage Stats */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-semibold">This Month's Usage</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Schema Generation Usage */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">Schema Generations</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {usage.schemas_generated} / {limits.schemas}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${Math.min((usage.schemas_generated / limits.schemas) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
                {usage.schemas_generated >= limits.schemas && (
                  <p className="text-sm text-red-600">⚠️ You've reached your monthly limit</p>
                )}
              </div>

              {/* Competition Usage */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium">Competitions Entered</span>
                  </div>
                  <span className="text-sm text-gray-600">dd 
                    {usage.competitions_entered} / {limits.competitions}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all"
                    style={{ 
                      width: `${Math.min((usage.competitions_entered / limits.competitions) * 100, 100)}%` 
                    }}
                  ></div>
                </div>
                {usage.competitions_entered >= limits.competitions && (
                  <p className="text-sm text-red-600"> You've reached your monthly limit</p>
                )}
              </div>
            </div>
          </div>

          {/* Plan Features */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Your Plan Features</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>SQL Practice Sessions</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Basic AI Feedback</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>{limits.schemas} Schema Generations/month</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>{limits.competitions} Competitions/month</span>
              </div>
              
              {userIsPremium ? (
                <>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Session Certificates</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Premium AI Models</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Advanced Analytics</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-500">Session Certificates (Premium Only)</span>
                </div>
              )}

              {currentPlan === 'max' && (
                <>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Priority Support</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Early Access Features</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4">Account Actions</h2>
            <div className="flex flex-wrap gap-3">
              {currentPlan === 'free' ? (
                <Button onClick={() => window.location.href = '/pricing'}>
                  Upgrade Plan
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline"
                    onClick={handleChangePlan}
                  >
                    Change Plan
                  </Button>
                  <Button 
                    variant="outline"
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    onClick={handleCancelSubscription}
                    disabled={canceling}
                  >
                    {canceling ? 'Canceling...' : 'Cancel Subscription'}
                  </Button>
                </>
              )}
              
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/practice'}
              >
                Start Practicing
              </Button>
            </div>
          </div>

          {/* Cancellation Status - Show when subscription is set to cancel */}
          {subscription?.cancel_at_period_end && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-yellow-800">
                    Subscription Cancellation Scheduled
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Your subscription will be canceled at the end of your current billing period.
                      {subscription.current_period_end && (
                        <span className="block mt-1 font-medium">
                          End date: {new Date(subscription.current_period_end).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                    <p className="mt-2">
                      You'll continue to have access to all premium features until then.
                    </p>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReactivateSubscription}
                      disabled={reactivating}
                      className="text-yellow-800 border-yellow-800 hover:bg-yellow-100"
                    >
                      {reactivating ? 'Reactivating...' : 'Reactivate Subscription'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.location.href = '/pricing'}
                    >
                      View Plans
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Plan Change Modal - only show if we have a target plan */}
      {showPlanChangeModal && selectedTargetPlan && (
        <PlanChangeModal
          isOpen={showPlanChangeModal}
          onClose={() => {
            setShowPlanChangeModal(false);
            setSelectedTargetPlan('');
          }}
          targetPlan={selectedTargetPlan}
          billingCycle="monthly"
        />
      )}
    </div>
  );
};
