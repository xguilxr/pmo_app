import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import {
  type BrandingConfig,
  getBranding,
  setBranding as setGlobalBranding,
  getColors,
  colorMap,
  fetchAndApplyBranding,
} from '../config/branding';

interface BrandingContextType {
  branding: BrandingConfig;
  colors: typeof colorMap.blue;
  switchBranding: (orgId: string) => void;
  loading: boolean;
}

const BrandingContext = createContext<BrandingContextType | null>(null);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBrandingState] = useState<BrandingConfig>(getBranding());
  const [colors, setColors] = useState(getColors());
  const [loading, setLoading] = useState(true);

  // Fetch branding from API on initial load (for subdomain/domain-based resolution)
  useEffect(() => {
    fetchAndApplyBranding()
      .then(() => {
        setBrandingState(getBranding());
        setColors(getColors());
      })
      .finally(() => setLoading(false));
  }, []);

  const switchBranding = (orgId: string) => {
    setGlobalBranding(orgId);
    setBrandingState(getBranding());
    setColors(getColors());
  };

  return (
    <BrandingContext.Provider value={{ branding, colors, switchBranding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) throw new Error('useBranding must be used within BrandingProvider');
  return context;
}
