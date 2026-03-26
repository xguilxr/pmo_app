import { createContext, useContext, useState, ReactNode } from 'react';
import { BrandingConfig, getBranding, setBranding as setGlobalBranding, getColors, colorMap } from '../config/branding';

interface BrandingContextType {
  branding: BrandingConfig;
  colors: typeof colorMap.blue;
  switchBranding: (orgId: string) => void;
}

const BrandingContext = createContext<BrandingContextType | null>(null);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<BrandingConfig>(getBranding());
  const [colors, setColors] = useState(getColors());

  const switchBranding = (orgId: string) => {
    setGlobalBranding(orgId);
    setBrandingState(getBranding());
    setColors(getColors());
  };

  return (
    <BrandingContext.Provider value={{ branding, colors, switchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) throw new Error('useBranding must be used within BrandingProvider');
  return context;
}
