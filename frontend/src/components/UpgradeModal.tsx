import React, { useState } from 'react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  feature: string;
  currentPlan: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  feature,
  currentPlan
}) => {
  if (!isOpen) return null;

  const getUpgradeMessage = (feature: string, plan: string) => {
    switch (feature) {
      case 'schema':
        return `Upgrade from ${plan} plan to generate more schemas`;
      case 'premium_models':
        return `Upgrade from ${plan} plan to access premium AI models`;
      default:
        return `Upgrade from ${plan} plan to access more features`;
    }
  };

  // Add loading state
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async (planName: string) => {
    setIsUpgrading(true); // Show loading state
    
    try {
      // Prevent any redirects
      event.preventDefault();
      event.stopPropagation();
      
      // Call your upgrade function without redirect
      await handleSubscribe(planName);
      
      // Stay on current page, just close modal
      onClose();
      
    } catch (error) {
      console.error('Upgrade failed:', error);
      // Show error message but don't redirect
    } finally {
      setIsUpgrading(false); // Hide loading state
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
        <div className="relative bg-white rounded-lg p-8 max-w-md w-full">
          <h3 className="text-lg font-semibold mb-2">Upgrade Required</h3>
          <p className="text-gray-600 mb-6">
            {getUpgradeMessage(feature, currentPlan)}
          </p>
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={() => handleUpgrade('pro')}
              disabled={isUpgrading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              {isUpgrading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                'Get Pro'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
