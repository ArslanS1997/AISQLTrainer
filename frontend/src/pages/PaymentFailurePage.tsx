import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Button } from '../components/Button';

export const PaymentFailurePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
        <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Payment Failed</h2>
        <p className="text-gray-600 mb-6">
          Your payment could not be processed. No charges were made to your account.
        </p>
        <div className="space-y-3">
          <Button 
            onClick={() => navigate('/pricing')}
            className="w-full"
          >
            Try Again
          </Button>
          <Button 
            onClick={() => navigate('/main')}
            variant="outline"
            className="w-full"
          >
            Continue with Free Plan
          </Button>
        </div>
        <p className="text-sm text-gray-500 mt-4">
          Need help? Contact our support team.
        </p>
      </div>
    </div>
  );
};
