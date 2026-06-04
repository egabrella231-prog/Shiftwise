import React, { useState } from 'react';
import html2canvas from 'html2canvas';

interface DashboardProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export default function Dashboard({ currentTab, setCurrentTab }: DashboardProps) {
  const [isExporting, setIsExporting] = useState(false);

  // 📸 EXPORT TO IMAGE PIPELINE FOR WHATSAPP
  const handleDownloadImage = async () => {
    const element = document.getElementById('monthly-shift-scheduler-container');
    if (!element) {
      alert("Error: Scheduler container not found! Ensure RosterGrid is rendered.");
      return;
    }

    try {
      setIsExporting(true);
      
      // Force layout tracking engine to desktop width (1510px) to prevent mobile crushing
      const originalWidth = element.style.width;
      const originalMinWidth = element.style.minWidth;
      
      element.style.width = '1510px';
      element.style.minWidth = '1510px';

      // Capture the canvas structure matching our pixel-perfect specifications
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution for mobile screen reading
        useCORS: true,
        logging: false,
        windowWidth: 1510,
        backgroundColor: '#ffffff'
      });

      // Restore layout styles instantly
      element.style.width = originalWidth;
      element.style.minWidth = originalMinWidth;
      setIsExporting(false);

      // Trigger File Download
      const imageURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imageURL;
      link.download = `ShiftWise_Namibia_Roster_${new Date().toISOString().slice(0, 10)}.png`;
      link.click();
    } catch (error) {
      console.error("Export failed:", error);
      setIsExporting(false);
    }
  };

  // 🖨️ NATIVE HARDCOPY PRINT / SYSTEM PDF PIPELINE
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm mb-6">
      {/* Top Identity Header Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-100 pb-4 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center text-xl shadow-md shadow-blue-200">
            SW
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              ShiftWise Namibia <span className="text-base">🇳🇦</span>
            </h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              GABRIEL ELIA CORP
            </p>
          </div>
        </div>

        {/* Filters Panel Context */}
        <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0 no-print">
          <div className="bg-gray-50 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-2">
            <span>📍 All Stations / Sites</span>
          </div>
          <div className="bg-gray-50 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-2">
            <span>📅 June 2026</span>
          </div>
        </div>
      </div>

      {/* Main Nav-Tab Engine Controls */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100 no-print mb-6">
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
            className={`py-2.5 px-3 rounded-lg text-xs font-bold tracking-wide transition-all ${
              currentTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm border border-gray-100'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dynamic Action Trigger Bar (Visible only on Scheduler tab) */}
      {currentTab === 'scheduler' && (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-blue-50/40 rounded-xl border border-blue-50/80 no-print">
          <div className="flex flex-wrap gap-2">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm transition-all">
              ⚡ Staggered Auto-Fill
            </button>
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-lg shadow-sm transition-all">
              💬 Share Roster
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button 
              onClick={handleDownloadImage}
              disabled={isExporting}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs py-2 px-4 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              {isExporting ? '⏳ Rendering...' : '🖼️ Download Image'}
            </button>
            <button 
              onClick={handlePrintPDF}
              className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs py-2 px-4 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
            >
              🖨️ Print / PDF
            </button>
            <button className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs py-2 px-4 rounded-lg transition-all">
              🗑️ Clear Month
            </button>
          </div>
        </div>
      )}
    </div>
  );
}