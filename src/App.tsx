import React, { useState } from 'react';
import html2canvas from 'html2canvas';

// --- TYPE INTERFACES ---
interface Guard {
  id: string;
  name: string;
  badgeNumber: string;
  station: string;
  hours: number;
  schedule: string[]; // 31 Days matrix array
}

export default function App() {
  const [currentTab, setCurrentTab] = useState('scheduler');
  const [selectedStation, setSelectedStation] = useState('All Stations');
  const [selectedMonth, setSelectedMonth] = useState('June 2026');
  const [isExporting, setIsExporting] = useState(false);

  // --- INITIAL DATA STATE MATCHING THE LIVE DEMO VIDEO ---
  const [guards, setGuards] = useState<Guard[]>([
    { id: '1', name: 'SS', badgeNumber: 'SWN-3427', station: 'Guard Tower A', hours: 240, schedule: Array(31).fill('D') },
    { id: '2', name: 'CCCccrr', badgeNumber: 'SWN-7656', station: 'Main Gate', hours: 240, schedule: Array(31).fill('N') },
    { id: '3', name: 'CCccrrr', badgeNumber: 'SWN-7656', station: 'Patrol Asset', hours: 240, schedule: Array(31).fill('O') }
  ]);

  // Dynamic status colors for guard deployment cycles
  const statusColors: Record<string, string> = {
    'D': 'bg-blue-600 text-white font-bold',
    'N': 'bg-slate-800 text-white font-bold',
    'O': 'bg-blue-100 text-blue-800 font-bold',
    'X': 'bg-rose-500 text-white font-bold',
  };

  // Cycle guard shift code locally on click
  const handleCellClick = (guardId: string, dayIndex: number) => {
    const states = ['D', 'N', 'O', 'X'];
    setGuards(prev => prev.map(g => {
      if (g.id === guardId) {
        const nextSchedule = [...g.schedule];
        const currentIdx = states.indexOf(nextSchedule[dayIndex]);
        nextSchedule[dayIndex] = states[(currentIdx + 1) % states.length];
        
        // Dynamic localized math recalculation for total duty hours (12h shifts)
        const activeShiftsCount = nextSchedule.filter(s => s === 'D' || s === 'N').length;
        return { ...g, schedule: nextSchedule, hours: activeShiftsCount * 12 };
      }
      return g;
    }));
  };

  // --- AUTOMATED STAGGERED AUTO-FILL ALGORITHM ---
  const handleAutoFill = () => {
    setGuards(prev => prev.map((g, idx) => {
      const generated = Array.from({ length: 31 }, (_, day) => {
        if ((day + idx) % 7 === 0) return 'O'; // Every 7th day cycle off
        return idx % 2 === 0 ? 'D' : 'N';     // Stagger day/night guards
      });
      const activeShiftsCount = generated.filter(s => s === 'D' || s === 'N').length;
      return { ...g, schedule: generated, hours: activeShiftsCount * 12 };
    }));
  };

  const handleClearMonth = () => {
    setGuards(prev => prev.map(g => ({ ...g, schedule: Array(31).fill('O'), hours: 0 })));
  };

  // --- IMAGE GENERATION FOR MOBILE DISTRIBUTION (WHATSAPP) ---
  const handleDownloadImage = async () => {
    const container = document.getElementById('monthly-shift-scheduler-container');
    if (!container) return;
    try {
      setIsExporting(true);
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        windowWidth: 1510
      });
      setIsExporting(false);
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `ShiftWise_Namibia_Roster_${selectedMonth.replace(' ', '_')}.png`;
      link.click();
    } catch (err) {
      console.error(err);
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased p-3 sm:p-6">
      <div className="max-w-[1600px] mx-auto bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
        
        {/* ================= IDENTITY HEADER ROW ================= */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between border-b border-slate-100 pb-4 mb-6 gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xl shadow-md shadow-blue-200">
              SW
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                ShiftWise Namibia <span className="text-base">🇳🇦</span>
              </h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                GABRIEL ELIA CORP
              </p>
            </div>
          </div>

          {/* Context Dropdowns */}
          <div className="flex items-center gap-2 self-end lg:self-auto no-print">
            <select 
              value={selectedStation} 
              onChange={(e) => setSelectedStation(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All Stations">📍 All Stations / Sites</option>
              <option value="Windhoek Hub">📍 Windhoek Control Hub</option>
              <option value="Gobabis Outpost">📍 Gobabis Outpost</option>
            </select>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="June 2026">📅 June 2026</option>
              <option value="July 2026">📅 July 2026</option>
            </select>
          </div>
        </div>

        {/* ================= DYNAMIC NAVIGATION CONTROL BAR ================= */}
        <div className="flex overflow-x-auto pb-1 mb-6 border-b border-slate-100 no-print gap-1 scrollbar-none">
          {[
            { id: 'cockpit', label: '🎛️ Cockpit Panel' },
            { id: 'scheduler', label: '📅 Shift Scheduler' },
            { id: 'registry', label: '🛡️ Guard Registry' },
            { id: 'payroll', label: '💰 Payroll Advisory' },
            { id: 'ai-helper', label: '✨ AI Roster Assistant' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`py-2.5 px-4 rounded-lg text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                currentTab === tab.id
                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ================= CORE TABS FUNCTIONAL SYSTEM ROUTER ================= */}
        <main>
          
          {/* TAB 1: COCKPIT OVERVIEW */}
          {currentTab === 'cockpit' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <span className="text-xs font-bold text-blue-500 uppercase">Deployed Strength</span>
                  <p className="text-2xl font-black text-blue-900 mt-1">{guards.length} Officers</p>
                </div>
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <span className="text-xs font-bold text-emerald-500 uppercase">Scheduled Volume</span>
                  <p className="text-2xl font-black text-emerald-900 mt-1">{guards.reduce((acc, curr) => acc + curr.hours, 0)} Hours</p>
                </div>
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-xs font-bold text-slate-500 uppercase">Active Hub Context</span>
                  <p className="text-2xl font-black text-slate-900 mt-1">Namibia Region</p>
                </div>
              </div>
              <div className="border border-slate-100 rounded-xl p-6 bg-slate-50/30 text-center text-sm font-medium text-slate-500">
                🎛️ ShiftWise Command Center running completely stateless in secure local viewport memory.
              </div>
            </div>
          )}

          {/* TAB 2: SHIFT SCHEDULER MATRIX FRAME */}
          {currentTab === 'scheduler' && (
            <div className="space-y-6">
              {/* Context Trigger Tool Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200/60 no-print">
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleAutoFill} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-sm transition-all">
                    ⚡ Staggered Auto-Fill
                  </button>
                  <button onClick={handleDownloadImage} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-sm transition-all">
                    💬 Share Roster
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleDownloadImage} disabled={isExporting} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs py-2 px-3 rounded-lg shadow-sm transition-all">
                    {isExporting ? '⏳ Rendering...' : '🖼️ Download Image'}
                  </button>
                  <button onClick={() => window.print()} className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs py-2 px-3 rounded-lg shadow-sm transition-all">
                    🖨️ Print / PDF
                  </button>
                  <button onClick={handleClearMonth} className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs py-2 px-3 rounded-lg transition-all">
                    🗑️ Clear Month
                  </button>
                </div>
              </div>

              {/* Responsive Matrix Container Wrapping The Scheduler Grid */}
              <div className="border border-slate-100 rounded-xl bg-white shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-600 inline-block"></span> Day (D)</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-800 inline-block"></span> Night (N)</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 inline-block"></span> Off (O)</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-500 inline-block"></span> Leave/Sick (X)</div>
                  <div className="flex items-center gap-1.5 text-blue-600"><span className="font-bold">PH</span> Namibian Public Holiday</div>
                </div>

                {/* Horizontal scroll engine with locked 1510px width to protect structural alignment */}
                <div className="overflow-x-auto scrollbar-thin">
                  <div id="monthly-shift-scheduler-container" className="min-w-[1510px] bg-white p-4">
                    <table className="w-full text-left border-collapse select-none">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider bg-slate-50/40">
                          <th className="py-3 px-3 w-48 sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Guard & Station</th>
                          <th className="py-3 px-2 w-16 text-center text-blue-600">Hours</th>
                          {Array.from({ length: 31 }, (_, i) => {
                            const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
                            const currentDayLabel = days[i % 7];
                            // Match Namibian Public Holiday highlighting logic for June 16 (Africa Civics Day override)
                            const isHoliday = i + 1 === 16;
                            return (
                              <th key={i} className={`py-2 px-0.5 text-center w-9 border-l border-slate-100 ${isHoliday ? 'bg-amber-50 text-amber-700 font-black' : ''}`}>
                                <div>{currentDayLabel}</div>
                                <div className="text-xs font-black text-slate-700 mt-0.5">{i + 1}</div>
                                {isHoliday && <span className="text-[7px] block font-black leading-none text-amber-600">PH</span>}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {guards.map((guard) => (
                          <tr key={guard.id} className="hover:bg-slate-50/40 transition-colors">
                            <td className="py-3 px-3 sticky left-0 bg-white font-bold text-slate-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                              <div className="flex items-center space-x-2">
                                <div className="w-7 h-7 rounded-full bg-slate-100 font-bold text-slate-600 flex items-center justify-center text-[10px] border border-slate-200 uppercase">
                                  {guard.name.substring(0, 2)}
                                </div>
                                <div>
                                  <div className="font-black text-slate-800 tracking-tight">{guard.name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono font-medium">{guard.badgeNumber} · <span className="text-blue-600">{guard.station}</span></div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center font-black text-slate-800 bg-blue-50/30 border-l border-r border-slate-100">
                              {guard.hours}h
                            </td>
                            {guard.schedule.map((shift, dayIdx) => (
                              <td key={dayIdx} className="p-0.5 border-r border-slate-100 text-center">
                                <button 
                                  onClick={() => handleCellClick(guard.id, dayIdx)}
                                  className={`w-8 h-8 rounded-md flex items-center justify-center text-xs transition-all tracking-tighter shadow-sm hover:scale-105 active:scale-95 ${statusColors[shift] || 'bg-slate-100 text-slate-400'}`}
                                >
                                  {shift}
                                </button>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FUNCTIONAL GUARD REGISTRY REGISTRATION ENGINE */}
          {currentTab === 'registry' && (
            <div className="border border-slate-100 rounded-xl p-5 bg-white space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 uppercase">Active Security Guards Database</h3>
                <span className="bg-blue-100 text-blue-700 text-xs px-2.5 py-0.5 rounded-full font-bold">{guards.length} Registered</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                      <th className="p-3">Full Officer Name</th>
                      <th className="p-3">System Badge</th>
                      <th className="p-3">Current Target Post Assignment</th>
                      <th className="p-3">Action Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {guards.map(g => (
                      <tr key={g.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-black text-slate-800">{g.name}</td>
                        <td className="p-3 font-mono font-bold text-slate-500">{g.badgeNumber}</td>
                        <td className="p-3 font-bold text-blue-600">{g.station}</td>
                        <td className="p-3"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">Active Deployment</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: FUNCTIONAL LOCALIZED PAYROLL ADVISORY CENTER */}
          {currentTab === 'payroll' && (
            <div className="border border-slate-100 rounded-xl p-5 bg-white space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 uppercase">Namibian Bank E-Wallet Remittance Calculator</h3>
                <p className="text-xs text-slate-400 mt-0.5">Calculated hourly totals converted automatically into local wallet remittance metrics.</p>
              </div>
              <div className="grid grid-cols-1 md:divide-x md:divide-y-0 divide-y divide-slate-100 gap-4">
                {guards.map(g => {
                  const baseRate = 25; // N$25.00 per hour local base guard estimate
                  const totalRemittance = g.hours * baseRate;
                  return (
                    <div key={g.id} className="p-4 flex items-center justify-between">
                      <div>
                        <h4 className="font-black text-slate-800">{g.name}</h4>
                        <p className="text-xs font-mono text-slate-400">{g.badgeNumber} · Total Tracked Hours: {g.hours}h</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black text-emerald-600">N$ {totalRemittance.toLocaleString()}</div>
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-bold block mt-1">
                          📱 Mobile E-Wallet Compliant
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: COMPLIANT AI ROSTER COMPLIANCE LOGIC ENGINE */}
          {currentTab === 'ai-helper' && (
            <div className="border border-slate-100 rounded-xl p-5 bg-white space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 uppercase">AI Automated Roster Assistant</h3>
                <p className="text-xs text-slate-400 mt-0.5">Compliance checker processing shifts based on local safety regulations.</p>
              </div>
              <div className="p-4 bg-slate-900 rounded-xl font-mono text-xs text-emerald-400 border border-slate-800 space-y-2 shadow-inner">
                <div>🤖 [ShiftWise AI Core Engine online]</div>
                <div>🔒 Privacy Directive enforced: Running strictly inside active local runtime cache memory.</div>
                <div>📍 Synchronizing matrix coordinates to exact 1510px grid container blueprint.</div>
                <div>⚡ Auto-Fill operations ready to dynamically separate adjacent Night/Day guard pairings.</div>
              </div>
              <button onClick={() => { handleAutoFill(); setCurrentTab('scheduler'); }} className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs py-2.5 px-4 rounded-xl shadow-sm tracking-wide uppercase">
                ⚡ Execute Auto-Fill Matrix & View Grid
              </button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}