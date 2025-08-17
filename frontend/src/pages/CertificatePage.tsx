import React, { useState, useEffect } from 'react';
import { useUpgrade } from '../contexts/UpgradeContext';
import { apiClient } from '../lib/apiClient';
import { Certificate, MasterCertificateCard } from '../components/Certificate';
import { Button } from '../components/ui/button';
import { Trophy, FileText, Award, Download, Eye, X } from 'lucide-react';
import { CertificateData, MasterCertificateData } from '../types';
import { getCurrentUser } from '../lib/auth';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { SubscriptionService } from '../services/SubscriptionService';
import { DBSession } from '../db/models';
import { get_db } from '../lib/db';
import { Session } from 'next-auth';
import { Any } from 'type-graphql';
import { get_current_user } from '../lib/auth';
import { Session as DBSessionModel } from '../db/models';
import { Session as DBSessionModel } from '../db/models';

interface CertificatesResponse {
  certificates: CertificateData[];
  requires_upgrade?: boolean;
  upgrade_message?: string;
  user_plan?: string;
  available_features?: string[];
  premium_features?: string[];
}

const CertificatePage = () => {
  const { user } = useAuth();
  const { showUpgradeModal } = useUpgrade();
  const { subscription } = useSubscription();

  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateData | null>(null);

  // Add state for upgrade info
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [userPlan, setUserPlan] = useState('free');

  // Add state for master certificate
  const [masterCertificateData, setMasterCertificateData] = useState<MasterCertificateData | null>(null);
  const [masterLoading, setMasterLoading] = useState(true);
  const [masterError, setMasterError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchCertificates();
      fetchMasterCertificate();
    }
  }, [user]);

  // Update the interface to include upgrade information
  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setError(null);
      setRequiresUpgrade(false);

      const response = await apiClient.getUserCertificates();
      if (response.error) {
        setError(response.error);
        setCertificates([]);
      } else if (response.data) {
        const data = response.data as CertificatesResponse;
        
        // Handle upgrade requirement
        if (data.requires_upgrade) {
          setRequiresUpgrade(true);
          setUpgradeMessage(data.upgrade_message || 'Upgrade to access certificates');
          setUserPlan(data.user_plan || 'free');
          setCertificates([]); // Free users see no certificates
        } else {
          setRequiresUpgrade(false);
          if (data.certificates && Array.isArray(data.certificates)) {
            setCertificates(data.certificates);
          } else {
            setCertificates([]);
          }
          setUserPlan(data.user_plan || 'pro');
        }
      } else {
        setCertificates([]);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load certificates');
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  // Master certificate checker
  const fetchMasterCertificate = async () => {
    try {
      setMasterLoading(true);
      setMasterError(null);
      // Use the correct method name that exists in the API client
      const response = await apiClient.getMasterCertificateEligibility();
      if (response?.error) {
        setMasterError(response.error);
        setMasterCertificateData(null);
      } else if (response?.data) {
        setMasterCertificateData(response.data as MasterCertificateData);
      } else {
        setMasterCertificateData(null);
      }
    } catch (error) {
      setMasterError(error instanceof Error ? error.message : 'Failed to check master certificate');
      setMasterCertificateData(null);
    } finally {
      setMasterLoading(false);
    }
  };

  const downloadCertificate = (cert: CertificateData) => {
    window.open(cert.certificate_url, '_blank');
  };

  const viewCertificate = (cert: CertificateData) => {
    setSelectedCertificate(cert);
  };

  const closeCertificateModal = () => {
    setSelectedCertificate(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Please log in to view certificates.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading certificates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <Button onClick={fetchCertificates}>Try Again</Button>
        </div>
      </div>
    );
  }

  // Add upgrade prompt component
  const UpgradePrompt: React.FC = () => (
    <div className="text-center py-16">
      <div className="max-w-2xl mx-auto">
        {/* Icon */}
        <div className="mb-8">
          <Trophy className="mx-auto h-20 w-20 text-yellow-500" />
        </div>
        
        {/* Title */}
        <h3 className="text-3xl font-bold text-gray-900 mb-4">
          Unlock Your Certificates
        </h3>
        
        {/* Message */}
        <p className="text-gray-600 mb-8 text-lg">
          {upgradeMessage}
        </p>
        
        {/* Features comparison */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Free features */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-gray-500" />
              Free Plan
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>✅ Practice SQL queries</li>
              <li>✅ Get instant feedback</li>
              <li>✅ Earn certificates (view only)</li>
              <li>❌ Download certificates</li>
              <li>❌ LinkedIn integration</li>
              <li>❌ Master certificate</li>
            </ul>
          </div>
          
          {/* Premium features */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
              <Award className="h-5 w-5 mr-2 text-blue-600" />
              Pro/Max Plan
            </h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>✅ Everything in Free</li>
              <li>✅ Download PDF certificates</li>
              <li>✅ LinkedIn profile integration</li>
              <li>✅ Master certificate eligibility</li>
              <li>✅ Advanced AI models</li>
              <li>✅ Competition mode</li>
            </ul>
          </div>
        </div>
        
        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => showUpgradeModal('certificates')}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3"
          >
            Upgrade to Pro - $20/month
          </Button>
          <Button
            onClick={() => window.location.href = '/main'}
            variant="outline"
            className="px-8 py-3"
          >
            Continue Practicing
          </Button>
        </div>
        
        {/* Small print */}
        <p className="text-sm text-gray-500 mt-6">
          You can still earn certificates by completing practice sessions with 70%+ accuracy.
          Upgrade anytime to download and share them!
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <Trophy className="mx-auto h-16 w-16 text-yellow-500 mb-4" />
          <h1 className="text-4xl font-bold text-gray-900">Your Certificates</h1>
          <p className="mt-4 text-xl text-gray-600">
            {requiresUpgrade 
              ? "Upgrade to access your earned certificates"
              : `${certificates.length} Certificate${certificates.length !== 1 ? 's' : ''} Earned`
            }
          </p>
        </div>

        {/* Show upgrade prompt for free users */}
        {requiresUpgrade ? (
          <UpgradePrompt />
        ) : (
          <>
            {/* Master Certificate Checker - only for premium users */}
            <MasterCertificateCard className="mb-10" />

            {/* Certificates Grid */}
            {certificates.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="mx-auto h-24 w-24 text-gray-300 mb-6" />
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">No Certificates Yet</h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  Complete practice sessions with 70% or higher accuracy to earn your first certificate!
                </p>
                <Button
                  onClick={() => window.location.href = '/practice'}
                  className="bg-blue-600 hover:bg-blue-700 px-8 py-3"
                >
                  Start Practicing
                </Button>
              </div>
            ) : (
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {certificates.map((cert) => (
                  <div key={cert.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Award className="h-10 w-10 text-yellow-500" />
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        cert.difficulty === 'basic' ? 'bg-green-100 text-green-800' :
                        cert.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        cert.difficulty === 'advanced' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {cert.difficulty.charAt(0).toUpperCase() + cert.difficulty.slice(1)}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{cert.title}</h3>
                    <p className="text-gray-600 mb-4">Topic: {cert.topic}</p>
                    
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Score</span>
                        <span className="text-lg font-bold text-green-600">
                          {cert.score}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Completed</span>
                        <span className="text-sm text-gray-900">
                          {new Date(cert.completion_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => viewCertificate(cert)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 flex items-center justify-center"
                      >
                        <Eye className="w-5 h-5 mr-2" />
                        View Certificate
                      </Button>
                      <Button
                        onClick={() => downloadCertificate(cert)}
                        className="bg-gray-600 hover:bg-gray-700 flex items-center justify-center px-3"
                        title="Download PDF"
                      >
                        <Download className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Certificate Modal */}
      {selectedCertificate && (
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
              type="session"
              session={{
                session_id: selectedCertificate.session_id,
                title: selectedCertificate.title,
                difficulty: selectedCertificate.difficulty,
                score: selectedCertificate.score,
                total_points: selectedCertificate.total_points,
                completion_date: selectedCertificate.completion_date,
                topic: selectedCertificate.topic,
                certificate_url: selectedCertificate.certificate_url
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificatePage;
