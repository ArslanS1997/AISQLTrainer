import { useState, useEffect } from 'react';
import { apiClient } from '../utils/api';

interface FeatureCheck {
  allowed: boolean;
  reason: string;
  limit: number;
  used: number;
}

export const useFeatureGate = (feature: string) => {
  const [featureCheck, setFeatureCheck] = useState<FeatureCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFeature();
  }, [feature]);

  const checkFeature = async () => {
    try {
      setLoading(true);
      const response = await apiClient.checkFeatureAccess(feature);
      if (response.data) {
        setFeatureCheck(response.data);
      }
    } catch (error) {
      console.error('Feature check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshCheck = () => {
    checkFeature();
  };

  return { featureCheck, loading, refreshCheck };
};