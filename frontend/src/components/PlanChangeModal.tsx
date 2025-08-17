import React, { useState, useEffect } from 'react';
import { apiClient, PlanChangePreview, ChangePlanRequest } from '../utils/api';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Button } from './Button';
import { Card } from './Card';
import { X, ArrowUp, ArrowDown, DollarSign, Calendar } from 'lucide-react';

interface PlanChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetPlan: string;
  billingCycle: string;
}

export const PlanChangeModal: React.FC<PlanChangeModalProps> = ({
  isOpen,
  onClose,
  targetPlan,
  billingCycle
}) => {
  const { subscription, refetchSubscription } = useSubscription();
  const [preview, setPreview] = useState<PlanChangePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [changing, setChanging] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && targetPlan) {
      loadPreview();
    }
  }, [isOpen, targetPlan, billingCycle]);

  const loadPreview = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await apiClient.getPlanChangePreview(targetPlan, billingCycle);
      if (response.data) {
        setPreview(response.data);
      } else {
        setError(response.error || 'Failed to load preview');
      }
    } catch (err) {
      setError('Failed to load plan change preview');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async () => {
    if (!preview) return;
    
    setChanging(true);
    setError('');
    
    try {
      const request: ChangePlanRequest = {
        new_plan: targetPlan,
        billing_cycle: billingCycle
      };
      
      const response = await apiClient.changePlan(request);
      
      if (response.data?.success) {
        // Refresh subscription data
        await refetchSubscription();
        alert(response.data.message);
        onClose();
      } else {
        setError(response.error || 'Failed to change plan');
      }
    } catch (err) {
      setError('Failed to change plan');
    } finally {
      setChanging(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            Change Plan to {targetPlan.toUpperCase()}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading preview...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
              <Button onClick={loadPreview} className="mt-4">
                Try Again
              </Button>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              {/* Plan Change Summary */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-600">Current Plan</span>
                  <span className="font-semibold">{preview.current_plan.toUpperCase()}</span>
                </div>
                
                <div className="flex items-center justify-center py-2">
                  {preview.is_upgrade ? (
                    <ArrowUp className="h-6 w-6 text-green-600" />
                  ) : (
                    <ArrowDown className="h-6 w-6 text-orange-600" />
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">New Plan</span>
                  <span className="font-semibold text-blue-600">{preview.new_plan.toUpperCase()}</span>
                </div>
              </Card>

              {/* Billing Details */}
              <Card className="p-4">
                <h3 className="font-semibold mb-3 flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Billing Details
                </h3>
                
                {preview.proration_amount > 0 && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-sm">Prorated charge today</span>
                    <span className="font-medium">${preview.proration_amount.toFixed(2)}</span>
                  </div>
                )}
                
                <div className="flex justify-between py-2">
                  <span className="text-sm">Next billing amount</span>
                  <span className="font-medium">${preview.next_billing_amount.toFixed(2)}</span>
                </div>
              </Card>

              {/* Effective Date */}
              <Card className="p-4">
                <h3 className="font-semibold mb-2 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  When does this take effect?
                </h3>
                <p className="text-sm text-gray-600">
                  {preview.effective_immediately ? (
                    'Your plan will be changed immediately.'
                  ) : (
                    `Your plan will change on ${new Date(preview.effective_date).toLocaleDateString()}.`
                  )}
                </p>
              </Card>

              {/* Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">{preview.message}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={changing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePlanChange}
                  className="flex-1"
                  disabled={changing}
                >
                  {changing ? 'Processing...' : `Change to ${targetPlan.toUpperCase()}`}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};



