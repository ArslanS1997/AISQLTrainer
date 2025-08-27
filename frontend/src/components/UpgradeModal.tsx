import React, { useState } from 'react';
import { Button } from './Button';
import { useUpgrade } from '../contexts/UpgradeContext';
import { Check } from 'lucide-react';

// Import plans from PricingPage
import { plans } from '../pages/PricingPage';

// Define proper types for the plans
interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  price: { monthly: number; yearly: number };
  icon: any;
  iconColor: string;
  bgColor: string;
  popular?: boolean;
  features: PlanFeature[];
}

interface UpgradeModalProps {
  isOpen: boolean;
  feature: string;
  currentPlan: string;
  onClose: () => void;
  onUpgrade: (planName: string) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ 
  isOpen,
  feature, 
  currentPlan, 
  onClose,
  onUpgrade
}) => {
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async (planName: string) => {
    setIsUpgrading(true);
    
    try {
      await onUpgrade(planName);
      onClose();
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setIsUpgrading(false);
    }
  };

  if (!isOpen) return null;

  const getFeatureOverview = () => {
    // Filter out Free plan and show only Pro and Max
    const upgradePlans: Plan[] = plans.filter((plan: Plan) => plan.name !== 'Free');
    
    return (
      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Choose Your Plan</h3>
        {upgradePlans.map((plan: Plan, index: number) => (
          <div key={index} className={`p-4 rounded-lg border ${plan.bgColor} border-gray-200`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-800">{plan.name} Plan</h4>
              <span className="text-lg font-bold text-gray-900">${plan.price.monthly}/month</span>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              {plan.features.map((feature: PlanFeature, featureIndex: number) => (
                <div key={featureIndex} className="flex items-center space-x-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>{feature.text}</span>
                </div>
              ))}
            </div>
            <Button
              onClick={() => window.location.href = '/pricing'}
              className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              View Details
            </Button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {feature === 'competition' ? 'Monthly Competition Limit Reached' : `Upgrade to ${currentPlan === 'free' ? 'Pro' : 'Max'}`}
        </h2>
        
        {getFeatureOverview()}

        <button
          onClick={onClose}
          className="w-full text-gray-500 hover:text-gray-700 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
