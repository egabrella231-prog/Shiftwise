import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';

// Core structural keys for our local-first tracking setup
const TRIAL_START_KEY = 'shiftwise_trial_start_epoch';
const PREMIUM_LICENSE_KEY = 'shiftwise_premium_unlocked';

export const useShiftWiseLicensing = () => {
  const { user, company } = useApp();

  const isPremiumEmail = user?.email === 'egabrella231@gmail.com';
  const isPremiumMetadata = 
    company?.plan === 'business' || 
    company?.plan === 'enterprise' || 
    (company as any)?.is_premium === true || 
    (company as any)?.premium === true ||
    (user as any)?.is_premium === true ||
    (user as any)?.premium === true;

  const [isPremiumLocal, setIsPremiumLocal] = useState<boolean>(() => {
    return localStorage.getItem(PREMIUM_LICENSE_KEY) === 'true';
  });

  const isPremium = isPremiumEmail || isPremiumMetadata || isPremiumLocal;

  const [trialStatus, setTrialStatus] = useState<{
    isActive: boolean;
    daysRemaining: number;
    hasExpired: boolean;
  }>({ isActive: true, daysRemaining: 30, hasExpired: false });

  useEffect(() => {
    const now = Date.now();
    let startTimestamp = localStorage.getItem(TRIAL_START_KEY);

    if (!startTimestamp) {
      // Initialize the local-first timestamp on first application boot
      startTimestamp = now.toString();
      localStorage.setItem(TRIAL_START_KEY, startTimestamp);
    }

    const startTime = parseInt(startTimestamp, 10);
    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const daysElapsed = Math.floor((now - startTime) / MS_PER_DAY);
    const remaining = Math.max(0, 30 - daysElapsed);

    // Keep trial status active; hasExpired is bypassed
    setTrialStatus({
      isActive: true,
      daysRemaining: Math.max(1, remaining),
      hasExpired: false
    });
  }, [isPremium]);

  const activatePremiumLocally = () => {
    localStorage.setItem(PREMIUM_LICENSE_KEY, 'true');
    setIsPremiumLocal(true);
  };

  return { isPremium, trialStatus, activatePremiumLocally };
};

interface PaywallLockProps {
  featureName: string;
  isLockedByExpiry: boolean;
  isPremiumFeature: boolean;
  isPremiumUser: boolean;
  children: React.ReactNode;
}

export const PaywallLockView: React.FC<PaywallLockProps> = ({
  featureName,
  isLockedByExpiry,
  isPremiumFeature,
  isPremiumUser,
  children
}) => {
  // Determine if this specific context requires an active lock wall
  // Bypassed trial expiration block per request ("remove forced trial")
  const shouldLock = isPremiumFeature && !isPremiumUser;

  if (!shouldLock) {
    return <>{children}</>;
  }

  return (
    <div className="relative border-2 border-dashed border-slate-200 rounded-xl overflow-hidden bg-slate-50/50 p-4">
      {/* Absolute Lock Overlay UI Layer */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-2xl text-center">
          <div className="inline-flex items-center justify-center px-3 py-1 bg-amber-100 text-amber-800 font-bold rounded-full text-xs uppercase tracking-wider mb-3">
            {isPremiumFeature ? "👑 Premium Layer Lock" : "⏳ Trial Period Expired"}
          </div>
          
          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">
            {isPremiumFeature ? `Unlock ${featureName}` : "Your 30-Day Free Trial Has Ended"}
          </h3>
          
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            {isPremiumFeature 
              ? "The Payroll Advisory calculator requires an active commercial activation key."
              : "Access to the Core Roster Cockpit features has paused. Please finalize license setup to unlock."}
          </p>

          {/* Local Namibian Payment Gateway Channels Mapping Block */}
          <div className="bg-slate-50 border border-slate-150 rounded-lg p-4 text-left mb-6">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
              Supported Namibian Payment Methods
            </h4>
            
            <div className="grid grid-cols-1 gap-2 text-xs font-semibold text-slate-700">
              <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded">
                <span>📱 FNB EasyWallet / Pay2Cell</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">Instant</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded">
                <span>📱 Bank Windhoek EasyWallet</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">Instant</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded">
                <span>📱 Standard Bank BlueWallet</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">Instant</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded">
                <span>📱 Nedbank Send-iMali</span>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">Instant</span>
              </div>
            </div>
          </div>

          {/* Active Call-to-Action Callouts */}
          <div className="space-y-2">
            <a
              href="https://wa.me/264813879841?text=Hi%20ShiftWise%20Namibia%2C%20I%20want%20to%20activate%20my%20license%20via%20E-Wallet"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors shadow text-xs"
            >
              💬 Send Proof via WhatsApp Wallet Window
            </a>
          </div>

          <p className="text-[10px] text-slate-400 mt-4 italic">
            🔒 Privacy Guaranteed: Local-first offline verification setup.
          </p>
        </div>
      </div>

      {/* Blurred out underlying page components layout view structure */}
      <div className="opacity-10 pointer-events-none select-none filter blur-[4px]">
        {children}
      </div>
    </div>
  );
};
