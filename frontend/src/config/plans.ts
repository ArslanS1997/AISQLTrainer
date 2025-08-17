export const PLAN_CONFIGS = {
  free: {
    name: 'free',
    display_name: 'Free Plan',
    price: {
      monthly: 0,
      yearly: 0
    },
    limits: {
      schemas_per_month: 5,
      competitions_per_month: 3
    },
    features: {
      can_download_certificates: false,
      can_get_master_certificate: false,
      ai_model_tier: 'gpt-4o-mini',
      has_premium_ai: false,
      has_advanced_analytics: false,
      has_priority_support: false,
      has_early_access: false
    }
  },
  pro: {
    name: 'pro',
    display_name: 'Pro Plan',
    price: {
      monthly: 15,
      yearly: 144 // $12/month with 20% yearly discount
    },
    limits: {
      schemas_per_month: 15,
      competitions_per_month: 15
    },
    features: {
      can_download_certificates: true,
      can_get_master_certificate: true,
      ai_model_tier: 'gpt-4',
      has_premium_ai: true,
      has_advanced_analytics: true,
      has_priority_support: false,
      has_early_access: false
    }
  },
  max: {
    name: 'max',
    display_name: 'Max Plan',
    price: {
      monthly: 30,
      yearly: 288 // $24/month with 20% yearly discount
    },
    limits: {
      schemas_per_month: 50,
      competitions_per_month: 50
    },
    features: {
      can_download_certificates: true,
      can_get_master_certificate: true,
      ai_model_tier: 'gpt-4',
      has_premium_ai: true,
      has_advanced_analytics: true,
      has_priority_support: true,
      has_early_access: true
    }
  }
} as const;

export type PlanName = keyof typeof PLAN_CONFIGS;

export const getPlanLimits = (planName: PlanName = 'free') => {
  return PLAN_CONFIGS[planName].limits;
};

export const getPlanFeatures = (planName: PlanName = 'free') => {
  return PLAN_CONFIGS[planName].features;
};

export const getPlanDisplayName = (planName: PlanName = 'free') => {
  return PLAN_CONFIGS[planName].display_name;
};

export const getPlanPrice = (planName: PlanName = 'free', billingCycle: 'monthly' | 'yearly' = 'monthly') => {
  return PLAN_CONFIGS[planName].price[billingCycle];
};

export const getFeatureDescription = (feature: keyof typeof PLAN_CONFIGS.free.features): string => {
  const descriptions = {
    can_download_certificates: 'Download certificates for completed sessions',
    can_get_master_certificate: 'Earn the master SQL certificate',
    has_premium_ai: 'Premium AI models for better feedback',
    has_advanced_analytics: 'Advanced progress analytics',
    has_priority_support: 'Priority support response',
    has_early_access: 'Early access to new features',
    ai_model_tier: 'AI model quality'
  };
  return descriptions[feature];
};
