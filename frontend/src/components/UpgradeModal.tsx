import React, { useState } from 'react';
import { Button } from './Button';
import { useUpgrade } from '../contexts/UpgradeContext';

interface UpgradeModalProps {
  isOpen: boolean;           // Add this
  feature: string;
  currentPlan: string;
  onClose: () => void;
  onUpgrade: (planName: string) => void;  // Add this
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ 
  isOpen,           // Add this
  feature, 
  currentPlan, 
  onClose,
  onUpgrade         // Add this
}) => {
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async (planName: string) => {
    setIsUpgrading(true);
    
    try {
      // Call the onUpgrade prop instead of showUpgradeModal
      await onUpgrade(planName);
      
      // Close modal after successful upgrade
      onClose();
      
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setIsUpgrading(false);
    }
  };

  // Only render if modal is open
  if (!isOpen) return null;

  const getFeatureDescription = () => {
    switch (feature) {
      case 'schema':
        return 'Generate unlimited custom database schemas';
      case 'competition':
        return 'Participate in unlimited SQL competitions';
      case 'certificate':
        return 'Download and share your certificates';
      default:
        return 'Access premium features';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Upgrade to {currentPlan === 'free' ? 'Pro' : 'Max'}
        </h2>
        
        <p className="text-gray-600 mb-6">
          {getFeatureDescription()}
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => handleUpgrade('pro')}
            disabled={isUpgrading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium"
          >
            {isUpgrading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              'Get Pro'
            )}
          </Button>

          <Button
            onClick={() => handleUpgrade('max')}
            disabled={isUpgrading}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium"
          >
            {isUpgrading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            ) : (
              'Get Max'
            )}
          </Button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 text-gray-500 hover:text-gray-700 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
