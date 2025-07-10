import { useEffect, useState } from "react";

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
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
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