import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface GoogleAdsProps {
  adSlot?: string;
  adClient?: string;
  adFormat?: string;
  className?: string;
  isEnabled?: boolean;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export function GoogleAds({ 
  adSlot = "1234567890", 
  adClient = "ca-pub-1234567890123456",
  adFormat = "auto",
  className = "",
  isEnabled = true 
}: GoogleAdsProps) {
  const [adLoaded, setAdLoaded] = useState(false);
  
  useEffect(() => {
    if (!isEnabled) return;
    
    // Load Google AdSense script if not already loaded
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`;
      script.crossOrigin = "anonymous";
      document.head.appendChild(script);
      
      script.onload = () => {
        setAdLoaded(true);
      };
    } else {
      setAdLoaded(true);
    }
    
    // Initialize ad when script is loaded
    if (window.adsbygoogle && adLoaded) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('Google Ads error:', e);
      }
    }
  }, [isEnabled, adClient, adLoaded]);

  if (!isEnabled) {
    return null;
  }

  return (
    <div className={`google-ads-container ${className}`}>
      {/* Demo placeholder for Google Ads - replace with real ads in production */}
      <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 text-center">
        <div className="text-blue-600 font-semibold mb-2">📢 Advertisement</div>
        <div className="text-sm text-blue-700 mb-3">
          ShareLink Pro - Upgrade for unlimited transfers, custom branding, and priority support
        </div>
        <div className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          Learn More
        </div>
      </div>
      
      {/* Hidden real AdSense code for production */}
      <ins
        className="adsbygoogle hidden"
        style={{ display: 'none' }}
        data-ad-client={adClient}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
}

// Banner ad component
export function BannerAd({ isEnabled = true }: { isEnabled?: boolean }) {
  return (
    <GoogleAds
      className="w-full max-w-4xl mx-auto my-4"
      adFormat="auto"
      isEnabled={isEnabled}
    />
  );
}

// Sidebar ad component
export function SidebarAd({ isEnabled = true }: { isEnabled?: boolean }) {
  return (
    <GoogleAds
      className="w-full max-w-xs"
      adFormat="rectangle"
      isEnabled={isEnabled}
    />
  );
}

// Square ad component
export function SquareAd({ isEnabled = true }: { isEnabled?: boolean }) {
  return (
    <GoogleAds
      className="w-80 h-80"
      adFormat="rectangle"
      isEnabled={isEnabled}
    />
  );
}

// Component to dynamically load ads from database
export function DynamicAds({ position, isEnabled = true }: { position: string; isEnabled?: boolean }) {
  const { data: adPlacements = [] } = useQuery({
    queryKey: ["/api/ad-placements/enabled"],
    enabled: isEnabled,
  });

  if (!isEnabled) return null;

  const relevantAds = adPlacements.filter((ad: any) => {
    // Map position names to match database values
    const positionMap: { [key: string]: string } = {
      'between-content': 'between-content',
      'footer': 'footer',
      'header': 'top-banner',
      'sidebar': 'sidebar'
    };
    
    return ad.position === (positionMap[position] || position) && ad.isEnabled;
  });

  if (relevantAds.length === 0) return null;

  // Show only the first ad for each position to avoid duplicates
  const adToShow = relevantAds[0];
  
  return (
    <div className="w-full">
      <GoogleAds
        key={adToShow.id}
        adClient={adToShow.adClient}
        adSlot={adToShow.adSlot}
        adFormat={adToShow.adFormat}
        isEnabled={isEnabled}
        className="w-full"
      />
    </div>
  );
}