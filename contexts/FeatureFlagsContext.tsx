import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Feature, FeatureFlagConfig, getFeatureFlags } from '../utils/featureFlags';

interface FeatureFlagsContextType {
  flags: FeatureFlagConfig;
  isEnabled: (feature: Feature) => boolean;
  toggleFlag?: (feature: Feature) => void;
}

const FeatureFlagsContext = createContext<FeatureFlagsContextType | undefined>(undefined);

export const FeatureFlagsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [flags, setFlags] = useState<FeatureFlagConfig>(getFeatureFlags());

  const isEnabled = (feature: Feature) => !!flags[feature];

  const toggleFlag = (feature: Feature) => {
    if (process.env.NODE_ENV === 'development') {
      const newFlags = { ...flags, [feature]: !flags[feature] };
      setFlags(newFlags);
      localStorage.setItem('resumeai_feature_flags', JSON.stringify(newFlags));
    }
  };

  return (
    <FeatureFlagsContext.Provider value={{ flags, isEnabled, toggleFlag }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
};

export const useFeatureFlags = () => {
  const context = useContext(FeatureFlagsContext);
  if (context === undefined) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider');
  }
  return context;
};
