import React from 'react';
import { useUpgrade } from '../contexts/UpgradeContext';
import { UpgradeModal } from './UpgradeModal';
import { useNavigate } from 'react-router-dom';

export const GlobalUpgradeModal: React.FC = () => {
  const { isModalOpen, modalProps, hideUpgradeModal } = useUpgrade();
  const navigate = useNavigate();

  const handleUpgrade = () => {
    hideUpgradeModal();
    navigate('/subscription');
  };

  if (!isModalOpen || !modalProps) return null;

  return (
    <UpgradeModal
      isOpen={isModalOpen}
      onClose={hideUpgradeModal}
      onUpgrade={handleUpgrade}
      feature={modalProps.feature}
      currentPlan={modalProps.currentPlan}
    />
  );
};
