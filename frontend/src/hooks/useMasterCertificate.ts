import { useState, useEffect } from 'react';
import { apiClient } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface MasterCertificateData {
  is_eligible: boolean;
  stats: {
    overall_accuracy: number;
    total_queries: number;
    correct_queries: number;
    sessions_completed: {
      basic: number;
      intermediate: number;
      advanced: number;
    };
  };
  requirements: {
    minimum_accuracy: number;
    basic_sessions: number;
    intermediate_sessions: number;
    advanced_sessions: number;
  };
}

interface UseMasterCertificateReturn {
  masterCertificateData: MasterCertificateData | null;
  loading: boolean;
  error: string | null;
  canDownloadCertificates: boolean;
  isEligible: boolean;
  isPremiumUser: boolean;
  refetch: () => Promise<void>;
}

export const useMasterCertificate = (): UseMasterCertificateReturn => {
  const { user, subscription } = useAuth();
  const [masterCertificateData, setMasterCertificateData] = useState<MasterCertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMasterCertificate = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getMasterCertificateEligibility();
      if (response.error) {
        setError(response.error);
        setMasterCertificateData(null);
      } else if (response.data) {
        setMasterCertificateData(response.data as MasterCertificateData);
      } else {
        setMasterCertificateData(null);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to check master certificate');
      setMasterCertificateData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterCertificate();
  }, [user]);

  // Use subscription from AuthContext (which gets it from backend)
  const canDownloadCertificates = subscription?.plan?.features?.can_download_certificates ?? false;
  const isPremiumUser = subscription?.plan?.name === 'pro' || subscription?.plan?.name === 'max';
  const isEligible = masterCertificateData?.is_eligible ?? false;

  return {
    masterCertificateData,
    loading,
    error,
    canDownloadCertificates,
    isEligible,
    isPremiumUser,
    refetch: fetchMasterCertificate
  };
};

