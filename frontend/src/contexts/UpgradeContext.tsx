import React, { createContext, useContext, useState } from 'react';

interface UpgradeModalProps {
  feature: string;
  currentPlan: string;
}

interface UpgradeContextType {
  isModalOpen: boolean;  // Changed from isUpgradeModalOpen
  modalProps: UpgradeModalProps | null;  // Changed from upgradeModalProps
  showUpgradeModal: (feature: string, currentPlan: string) => void;  // Updated signature
  hideUpgradeModal: () => void;
}

const UpgradeContext = createContext<UpgradeContextType>({
  isModalOpen: false,
  modalProps: null,
  showUpgradeModal: () => {},
  hideUpgradeModal: () => {},
});

export const useUpgrade = () => useContext(UpgradeContext);

export const UpgradeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalProps, setModalProps] = useState<UpgradeModalProps | null>(null);

  const showUpgradeModal = (feature: string, currentPlan: string) => {
    setModalProps({ feature, currentPlan });
    setIsModalOpen(true);
  };

  const hideUpgradeModal = () => {
    setIsModalOpen(false);
    setModalProps(null);
  };

  return (
    <UpgradeContext.Provider
      value={{
        isModalOpen,
        modalProps,
        showUpgradeModal,
        hideUpgradeModal,
      }}
    >
      {children}
    </UpgradeContext.Provider>
  );
};
