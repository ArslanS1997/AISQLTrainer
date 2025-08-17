import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUpgrade } from '../contexts/UpgradeContext';
import { apiClient } from '../utils/api';
import { Button } from '../components/Button';
import { Certificate } from '../components/certificate'; // Use lowercase to match existing file
import MasterCertificateCard from '../components/MasterCertificateCard'; // Default import
import { Award, Download, FileText, Trophy, Eye, X } from 'lucide-react';

// Interface definitions
interface CertificateData {
  id: string;
  session_id: string;
  title: string;
  difficulty: string;
  score: number;
  total_points: number;
  completion_date: string;
  topic: string;
  certificate_url: string;
}

interface CertificatesResponse {
  certificates: CertificateData[];
  requires_upgrade?: boolean;
  upgrade_message?: string;
  user_plan?: string;
  available_features?: string[];
  premium_features?: string[];
}

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

export const CertificatePage: React.FC = () => {
  const { user } = useAuth();
  const { showUpgradeModal } = useUpgrade();
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateData | null>(null);
  
  // Upgrade state
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState('');
  const [userPlan, setUserPlan] = useState('free');

  useEffect(() => {
    if (user) {
      fetchCertificates();
    } else {
      setLoading(false);
    }
  }, [user]);

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

  const downloadCertificate = (cert: CertificateData) => {
    const link = document.createElement('a');
    link.href = cert.certificate_url;
    link.download = `certificate-${cert.session_id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const UpgradePrompt: React.FC = () => (
    <div className="text-center py-16">
      <div className="max-w-2xl mx-auto">
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
            onClick={() => showUpgradeModal('certificates', 'pro')}
            className="bg-blue-600 hover:bg-blue-700 px-8 py-3"
          >
            Upgrade to Pro
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your certificates...</p>
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
                  onClick={() => window.location.href = '/main'}
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
                        <span className="text-sm text-gray-600">Date</span>
                        <span className="text-sm text-gray-900">
                          {new Date(cert.completion_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => setSelectedCertificate(cert)}
                        variant="outline"
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      <Button
                        onClick={() => downloadCertificate(cert)}
                        className="flex-1"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Certificate Modal */}
        {selectedCertificate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Certificate Preview</h2>
                  <button
                    onClick={() => setSelectedCertificate(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                
                <Certificate 
                  type="session"
                  userName={user?.name || 'Student'} // Fix: use userName instead of user
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
                
                <div className="mt-6 flex justify-end space-x-3">
                  <Button
                    onClick={() => setSelectedCertificate(null)}
                    variant="outline"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => downloadCertificate(selectedCertificate)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificatePage;
