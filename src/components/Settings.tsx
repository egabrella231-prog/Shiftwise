import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useShiftWiseLicensing } from '../hooks/useShiftWiseLicensing';
import { 
  Building2, CreditCard, ShieldCheck, MapPin, Plus, Trash2, 
  Settings as SettingsIcon, DollarSign, Clock, HelpCircle, Save, Sparkles 
} from 'lucide-react';

export default function Settings() {
  const { 
    company, 
    sites, 
    payrollSettings, 
    upsertSite, 
    removeSite, 
    updatePayrollSettingsDoc,
    clearRostersCached
  } = useApp();

  const { isPremium, trialStatus, activatePremiumLocally } = useShiftWiseLicensing();

  // Site forms
  const [siteName, setSiteName] = useState('');
  const [siteLoc, setSiteLoc] = useState('');

  // Payroll Config Forms
  const [nightAllowance, setNightAllowance] = useState(String(payrollSettings?.night_allowance || 15));
  const [otRate, setOtRate] = useState(String(payrollSettings?.ot_rate || 1.5));
  const [otThreshold, setOtThreshold] = useState(String(payrollSettings?.ot_threshold || 160));
  const [phBonus, setPhBonus] = useState(String(payrollSettings?.ph_bonus || 250));

  // Active Monetization State
  const [currentPlan, setCurrentPlan] = useState<'starter' | 'business' | 'enterprise'>(company?.plan || 'starter');
  const [isDemoPaid, setIsDemoPaid] = useState(false);

  const handleAddSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteName.trim()) return;

    await upsertSite({
      name: siteName,
      location: siteLoc
    });

    setSiteName('');
    setSiteLoc('');
  };

  const handleSavePayrollSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updatePayrollSettingsDoc({
      night_allowance: parseFloat(nightAllowance) || 0,
      ot_rate: parseFloat(otRate) || 0,
      ot_threshold: parseInt(otThreshold) || 0,
      ph_bonus: parseFloat(phBonus) || 0
    });
  };

  const handleTriggerPayGateSimulate = (planName: string, price: number) => {
    const confirmPay = confirm(`🇳🇦 PayToday & DPO PayGate Simulation:\n\nDo you want to authorize subscription billing of N$ ${price} per month for "ShiftWise Namibia - ${planName} Plan"?`);
    if (confirmPay) {
      setIsDemoPaid(true);
      activatePremiumLocally();
      alert(`Subscription Success! Authorization granted via PayToday APIs and commercial license activated. Thank you for supporting Namibian tech! Sharp sharp!`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Col 1 & 2: Main configurations */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Sites configuration */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 text-sm tracking-tight flex items-center gap-2 mb-1">
            <MapPin className="h-4.5 w-4.5 text-[#185FA5]" />
            DEPLOYMENT SITES & STATIONS
          </h3>
          <p className="text-xs text-gray-500 mb-4">Create work locations where your security guards or roster members are assigned.</p>

          <form onSubmit={handleAddSite} className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 items-end">
            <div className="col-span-1">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Site / Station Name</label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Grove Mall Windhoek"
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-700 transition"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Location Details</label>
              <input
                type="text"
                value={siteLoc}
                onChange={(e) => setSiteLoc(e.target.value)}
                placeholder="e.g. Kleine Kuppe"
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-700 transition"
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full bg-[#185FA5] hover:bg-blue-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add site
              </button>
            </div>
          </form>

          {/* Site list items */}
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
            {sites.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-xs">No active sites registered. Add one above!</div>
            ) : (
              sites.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-100 text-xs">
                  <div>
                    <div className="font-bold text-gray-800">{s.name}</div>
                    <div className="text-[10px] text-gray-400 font-medium mt-0.5">{s.location || "Namibia"}</div>
                  </div>
                  <button
                    onClick={() => removeSite(s.id)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 transition cursor-pointer"
                    title="Remove site"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Global payroll parameters */}
        <form onSubmit={handleSavePayrollSettings} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-900 text-sm tracking-tight flex items-center gap-2">
            <DollarSign className="h-4.5 w-4.5 text-[#185FA5]" />
            NAMIBIAN LABOR & PAYROLL COEFFICIENTS
          </h3>
          <p className="text-xs text-gray-500">Configure regulatory overtime parameters, night special rates and holiday flat rates.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Night Allowance Premium (NAD/hr extra)</label>
              <input
                type="number"
                step="0.01"
                required
                value={nightAllowance}
                onChange={(e) => setNightAllowance(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-700 transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Overtime Multiplier Rate (standard: 1.5×)</label>
              <input
                type="number"
                step="0.1"
                required
                value={otRate}
                onChange={(e) => setOtRate(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-700 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Monthly Overtime Threshold (standard: 160 hrs)</label>
              <input
                type="number"
                required
                value={otThreshold}
                onChange={(e) => setOtThreshold(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-700 transition"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-1">Public Holiday Worked Bonus (NAD flat per day)</label>
              <input
                type="number"
                required
                value={phBonus}
                onChange={(e) => setPhBonus(e.target.value)}
                className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-700 transition"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <Save className="h-4 w-4" />
              Save Payroll configurations
            </button>
          </div>
        </form>
      </div>

      {/* Col 3: Subscription & Billing options */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-900 text-sm tracking-tight flex items-center gap-2">
            <CreditCard className="h-4.5 w-4.5 text-[#185FA5]" />
            NAMIBIA SUBSCRIPTIONS & LICENSING
          </h3>

          {/* Current plan card showing state */}
          {isPremium ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-1 relative overflow-hidden">
              <span className="text-[9px] bg-amber-600 text-white font-bold px-2.5 py-0.5 rounded-md select-none uppercase inline-block">👑 LICENSE ACTIVE</span>
              <h4 className="text-base font-black text-amber-900 capitalize mt-2">Commercial Pro Plan</h4>
              <span className="text-[10px] text-amber-700 font-bold block leading-relaxed">
                100% Fully Activated Offline-First Workspace
              </span>
            </div>
          ) : trialStatus.hasExpired ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-1">
              <span className="text-[9px] bg-rose-600 text-white font-bold px-2.5 py-0.5 rounded-md select-none uppercase inline-block font-mono">🚨 EXPIRED</span>
              <h4 className="text-base font-black text-rose-950 mt-2">Trial Concluded</h4>
              <span className="text-[10px] text-rose-700 font-bold block leading-relaxed">
                Please finalize licensing setup or authorization to unlock.
              </span>
            </div>
          ) : (
            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-center space-y-1">
              <span className="text-[9px] bg-[#185FA5] text-white font-bold px-2.5 py-0.5 rounded-md select-none uppercase inline-block">⏳ EVALUATION ACTIVE</span>
              <h4 className="text-lg font-black text-blue-950 capitalize mt-2">{trialStatus.daysRemaining} Days Left</h4>
              <span className="text-[10px] text-blue-700 font-semibold block leading-relaxed">
                Evaluating physical workspace options.
              </span>
            </div>
          )}

          {/* Evaluation Simulator shortcuts block */}
          <div className="p-3.5 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
              EVALUATION CONTROLS
            </h4>
            <p className="text-[9px] text-slate-500 leading-relaxed">
              Manually trigger applet state transitions to preview the robust licensing and Namibian Paywall lock overlay layout.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  activatePremiumLocally();
                  alert("Premium License simulation unlocked on this browser sandbox!");
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold py-1.5 px-2 rounded-lg transition"
              >
                Force Premium
              </button>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('shiftwise_premium_unlocked');
                  // Move start date to past
                  const trialExpiredSeconds = Date.now() - (32 * 24 * 60 * 60 * 1000);
                  localStorage.setItem('shiftwise_trial_start_epoch', trialExpiredSeconds.toString());
                  window.location.reload();
                }}
                className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold py-1.5 px-2 rounded-lg transition"
              >
                Force Expire
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('shiftwise_premium_unlocked');
                localStorage.setItem('shiftwise_trial_start_epoch', Date.now().toString());
                window.location.reload();
              }}
              className="w-full border border-gray-200 hover:bg-gray-100 text-gray-700 text-[10px] font-bold py-1 px-2 rounded-lg transition block text-center"
            >
              Reset to 30-Day Evaluation
            </button>
          </div>

          {/* Plan selections */}
          <div className="space-y-2">
            <div className={`p-3.5 rounded-xl border transition cursor-pointer ${
              currentPlan === 'starter' ? 'border-[#185FA5] bg-blue-50/10' : 'border-gray-100 hover:bg-gray-50'
            }`} onClick={() => setCurrentPlan('starter')}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-gray-800">STARTER PLAN</span>
                <span className="text-[10px] text-gray-500 font-mono font-bold">N$ 199/m</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Up to 10 employees, 1 site deployment</p>
            </div>

            <div className={`p-3.5 rounded-xl border transition cursor-pointer ${
              currentPlan === 'business' ? 'border-[#185FA5] bg-blue-50/10' : 'border-gray-100 hover:bg-gray-50'
            }`} onClick={() => setCurrentPlan('business')}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-indigo-900 flex items-center gap-1">
                  BUSINESS PLAN★
                </span>
                <span className="text-[10px] text-indigo-800 font-mono font-bold">N$ 499/m</span>
              </div>
              <p className="text-[10px] text-indigo-900/60 mt-1">Up to 50 employees, 3 sites + payroll integrations</p>
            </div>

            <div className={`p-3.5 rounded-xl border transition cursor-pointer ${
              currentPlan === 'enterprise' ? 'border-[#185FA5] bg-blue-50/10' : 'border-gray-100 hover:bg-gray-50'
            }`} onClick={() => setCurrentPlan('enterprise')}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-gray-800">ENTERPRISE TIER</span>
                <span className="text-[10px] text-gray-500 font-mono font-bold">N$ 1,200/m</span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Unlimited records, full APIs, white label options</p>
            </div>
          </div>

          {/* PayToday/PayGate triggers */}
          <button
            onClick={() => handleTriggerPayGateSimulate(currentPlan, currentPlan === 'starter' ? 199 : currentPlan === 'business' ? 499 : 1200)}
            className="w-full bg-[#25D366] hover:bg-emerald-600 text-white font-bold text-xs py-2.5 rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Pay via PayToday / PayGate
          </button>
        </div>

        {/* Offline Cache Diagnostic Section */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <h3 className="font-bold text-gray-900 text-sm tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-4.5 w-4.5 text-[#185FA5]" />
            OFFLINE WORKSPACE STORAGE
          </h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            For local-first compliance, rosters are cached in your local hardware sandbox for offline stability and speed.
          </p>

          <button
            onClick={() => {
              if (confirm("Are you sure you want to securely wipe the local offline roster cache? This resets local state to server defaults.")) {
                clearRostersCached();
                alert("Offline roster cache has been purged successfully!");
              }
            }}
            className="w-full bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Clock className="h-4 w-4" />
            Clear Offline Roster Cache
          </button>
        </div>
      </div>
    </div>
  );
}
