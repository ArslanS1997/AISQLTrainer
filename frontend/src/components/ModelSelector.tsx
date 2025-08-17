import React, { useState, useEffect } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { apiClient } from '../utils/api';
import { AIModel } from '../types';
import { useClickOutside } from '../utils/useClickOutside';
import { Lock } from 'lucide-react';
import { useUpgrade } from '../contexts/UpgradeContext';


export const ModelSelector = () => {
  const { subscription, isPremiumUser } = useSubscription();
  const { showUpgradeModal } = useUpgrade();
  const [currentModel, setCurrentModel] = useState<string>('');
  const [models, setModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const ref = useClickOutside(() => setIsOpen(false));

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getAvailableModels();
      if (response.data) {
        setModels(response.data.available_models);
        setCurrentModel(response.data.current_model);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    loadModels();
  }, []);

  const handleModelSwitch = async (index: number) => {
    const model = models[index];
    const isPremium = model.premium;
    const isFreeUser = !subscription || subscription.plan.name === 'free';

    if (isPremium && isFreeUser) {
      showUpgradeModal('premium_models', subscription?.plan?.name || 'free');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.switchModel(index);
      if (response.data?.success) {
        setCurrentModel(response.data.model);
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to switch model:', error);
      setError('Failed to switch model. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !currentModel) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5">
        <div className="animate-spin h-4 w-4 border-2 border-primary-600 border-t-transparent rounded-full"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  const canAccessPremiumModels = isPremiumUser();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
        disabled={loading}
      >
        <span className="text-sm font-medium text-gray-700">
          {currentModel || 'Select Model'}
        </span>
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && models.length > 0 && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
          {models.map((model, index) => {
            const isPremium = model.premium;
            const isFreeUser = !subscription || subscription.plan.name === 'free';
            const isLocked = isPremium && isFreeUser;

            return (
              <button
                key={model.name}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between group ${
                  currentModel === model.name ? 'text-primary-600 font-medium bg-primary-50' : 'text-gray-700'
                } ${isLocked ? 'cursor-pointer' : ''}`}
                onClick={() => handleModelSwitch(index)}
                disabled={loading || (currentModel === model.name && !isLocked)}
              >
                <div className="flex items-center space-x-2">
                  <span>{model.name}</span>
                  {isLocked && (
                    <Lock className="h-3 w-3 text-gray-400 group-hover:text-primary-600" />
                  )}
                </div>
                {currentModel === model.name && !isLocked && (
                  <span className="text-primary-600">✓</span>
                )}
              </button>
            );
          })}
          {error && (
            <div className="px-4 py-2 text-sm text-red-600 border-t border-gray-100">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};