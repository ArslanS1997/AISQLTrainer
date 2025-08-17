import React, { useState } from 'react';
import { useMasterCertificate } from '../hooks/useMasterCertificate';
import { useAuth } from '../contexts/AuthContext';
import { Certificate } from './certificate';
import { X } from 'lucide-react';

interface MasterCertificateCardProps {
  className?: string;
}

export const MasterCertificateCard: React.FC<MasterCertificateCardProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const {
    masterCertificateData,
    loading,
    error,
    canDownloadCertificates,
    isEligible,
    isPremiumUser
  } = useMasterCertificate();
  
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Checking master certificate status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 ${className}`}>
        Error checking master certificate: {error}
      </div>
    );
  }

  if (!masterCertificateData) {
    return null;
  }

  const handleGetCertificate = () => {
    if (isEligible && canDownloadCertificates) {
      setShowCertificateModal(true);
    }
  };

  const closeCertificateModal = () => {
    setShowCertificateModal(false);
  };

  const getButtonContent = () => {
    if (!canDownloadCertificates) {
      // Free plan users always see upgrade button
      return (
        <button 
          onClick={() => window.open('/pricing', '_blank')}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
        >
          Upgrade Plan
        </button>
      );
    } else if (isEligible) {
      // Premium + eligible users see get certificate button
      return (
        <button 
          onClick={handleGetCertificate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Get Certificate
        </button>
      );
    } else {
      // Premium + not eligible users see disabled button
      return (
        <button 
          disabled
          className="px-4 py-2 bg-gray-300 text-gray-500 rounded-md cursor-not-allowed"
          title="Complete the requirements to unlock"
        >
          Not Eligible Yet
        </button>
      );
    }
  };

  const getStatusMessage = () => {
    if (!canDownloadCertificates) {
      return "Upgrade to Pro or Max plan to unlock certificates!";
    } else if (isEligible) {
      return "Congratulations! You've earned the Master SQL Certificate!";
    } else {
      return "Complete the requirements to earn your Master Certificate";
    }
  };

  return (
    <>
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Master SQL Certificate</h2>
            <p className="text-gray-600">{getStatusMessage()}</p>
          </div>
          {getButtonContent()}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Your Progress</h3>
            <ul className="space-y-2">
              <li className="flex justify-between">
                <span>Overall Accuracy</span>
                <span className={masterCertificateData.stats.overall_accuracy >= masterCertificateData.requirements.minimum_accuracy ? 'text-green-600 font-medium' : 'text-gray-600'}>
                  {masterCertificateData.stats.overall_accuracy}% 
                  <span className="text-gray-400 text-sm">
                    / {masterCertificateData.requirements.minimum_accuracy}%
                  </span>
                </span>
              </li>
              <li className="flex justify-between">
                <span>Basic Sessions</span>
                <span className={masterCertificateData.stats.sessions_completed.basic >= masterCertificateData.requirements.basic_sessions ? 'text-green-600 font-medium' : 'text-gray-600'}>
                  {masterCertificateData.stats.sessions_completed.basic}/{masterCertificateData.requirements.basic_sessions}
                </span>
              </li>
              <li className="flex justify-between">
                <span>Intermediate Sessions</span>
                <span className={masterCertificateData.stats.sessions_completed.intermediate >= masterCertificateData.requirements.intermediate_sessions ? 'text-green-600 font-medium' : 'text-gray-600'}>
                  {masterCertificateData.stats.sessions_completed.intermediate}/{masterCertificateData.requirements.intermediate_sessions}
                </span>
              </li>
              <li className="flex justify-between">
                <span>Advanced Sessions</span>
                <span className={masterCertificateData.stats.sessions_completed.advanced >= masterCertificateData.requirements.advanced_sessions ? 'text-green-600 font-medium' : 'text-gray-600'}>
                  {masterCertificateData.stats.sessions_completed.advanced}/{masterCertificateData.requirements.advanced_sessions}
                </span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Requirements</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• Maintain {masterCertificateData.requirements.minimum_accuracy}%+ overall accuracy</li>
              <li>• Complete {masterCertificateData.requirements.basic_sessions} basic sessions</li>
              <li>• Complete {masterCertificateData.requirements.intermediate_sessions} intermediate sessions</li>
              <li>• Complete {masterCertificateData.requirements.advanced_sessions} advanced sessions</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Master Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={closeCertificateModal}
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
            
            <Certificate
              userName={user?.name || user?.email || 'Student'}
              type="master"
              master={{
                date: new Date().toISOString(),
                certificate_url: '/api/achievements/master-certificate'
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};
