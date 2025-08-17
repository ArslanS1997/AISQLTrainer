interface Window {
  showUpgradeModal?: (props: {
    title: string;
    message: string;
    feature: string;
  }) => void;
}
