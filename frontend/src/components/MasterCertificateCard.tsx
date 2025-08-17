import React, { useState } from 'react';
import { useMasterCertificate } from '../hooks/useMasterCertificate';
import { useAuth } from '../contexts/AuthContext';
import { Certificate } from './certificate';
import { X } from 'lucide-react';

interface MasterCertificateCardProps {
  className?: string;
}

const MasterCertificateCard: React.FC<MasterCertificateCardProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const { masterCertificateData, loading, error, isEligible } = useMasterCertificate(); // Fix: use correct property names
  const [showModal, setShowModal] = useState(false);

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-secondary-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <p className="text-red-600">Error loading master certificate data</p>
      </div>
    );
  }

  if (!masterCertificateData) {
    return null;
  }

  const { stats, requirements } = masterCertificateData;

  return (
    <>
      <div className={`bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              🏆 Master SQL Certificate
            </h3>
            {isEligible ? (
              <p className="text-purple-700">
                Congratulations! You're eligible for the Master Certificate
              </p>
            ) : (
              <p className="text-purple-700">
                Complete more sessions to unlock the Master Certificate
              </p>
            )}
          </div>
          
          {isEligible && (
            <button
              onClick={() => setShowModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              View Certificate
            </button>
          )}
        </div>

        {/* Progress indicators */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-900">
              {stats.overall_accuracy.toFixed(1)}%
            </div>
            <div className="text-sm text-purple-600">Accuracy</div>
            <div className="text-xs text-gray-500">
              Need {requirements.minimum_accuracy}%
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-900">
              {stats.sessions_completed.basic}
            </div>
            <div className="text-sm text-purple-600">Basic</div>
            <div className="text-xs text-gray-500">
              Need {requirements.basic_sessions}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-900">
              {stats.sessions_completed.intermediate}
            </div>
            <div className="text-sm text-purple-600">Intermediate</div>
            <div className="text-xs text-gray-500">
              Need {requirements.intermediate_sessions}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-900">
              {stats.sessions_completed.advanced}
            </div>
            <div className="text-sm text-purple-600">Advanced</div>
            <div className="text-xs text-gray-500">
              Need {requirements.advanced_sessions}
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Modal */}
      {showModal && isEligible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Master SQL Certificate</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <Certificate 
                type="master"
                userName={user?.name || 'Student'}
                master={{
                  date: new Date().toISOString(),
                  certificate_url: '/api/achievements/master-certificate'
                }}
              />
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export { MasterCertificateCard };
export default MasterCertificateCard;
