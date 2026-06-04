import React, { useState } from 'react';

// Define structures for guard rosters matching your dashboard data layout
interface GuardRoster {
  id: string;
  name: string;
  badgeNumber: string;
  station: string;
  totalHours: number;
  shifts: string[]; // Holds values for 31 days: 'D', 'N', 'O', 'X'
}

export default function RosterGrid() {
  // Target year and month for June 2026 as displayed on the main cockpit panel
  const daysInMonth = 31;
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Mock initial state capturing the exact structural profile visible on screen rows
  const [guards, setGuards] = useState<GuardRoster[]>([
    {
      id: '1',
      name: 'SS',
      badgeNumber: 'SWN-3427',
      station: 'Guard',
      totalHours: 240,
      shifts: ['D', 'D', 'N', 'N', 'O', 'O', 'D', 'D', 'N', 'N', 'O', 'O', 'D', 'D', 'O', 'O', 'D', 'D', 'N', 'N', 'O', 'O', 'D', 'D', 'N', 'N', 'O', 'O', 'D', 'D', 'O']
    },
    {
      id: '2',
      name: 'CCCccrr',
      badgeNumber: 'SWN-7656',
      station: 'Guard',
      totalHours: 240,
      shifts: ['D', 'N', 'N', 'O', 'O', 'D', 'D', 'N', 'N', 'O', 'O', 'D', 'D', 'N', 'N', 'O', 'O', 'D', 'D', 'N', 'N', 'O', 'O', 'D', 'D', 'N', 'N', 'O', 'O', 'D', 'D']
    },
    {
      id: '3',
      name: 'CCCccrr',
      badgeNumber: 'SWN-7656',
      station: 'Guard',
      totalHours: 240,
      shifts: ['N', 'N', 'O', 'O', 'D', 'D', 'N', 'N', 'O', 'O', 'D', 'D', 'N', 'N', 'O', 'O', 'D', 'D', 'N', 'N', 'O', 'O', 'D', 'D', 'N', 'N', 'O', 'O', 'D', 'D', 'N']
    }
  ]);

  // Handler to cycle shift badges interactively on the grid matrix if clicked
  const handleShiftCycle = (guardId: string, dayIndex: number) => {
    setGuards(prevGuards =>
      prevGuards.map(guard => {
        if (guard.id === guardId) {
          const updatedShifts = [...guard.shifts];
          const currentShift = updatedShifts[dayIndex];
          
          // Cycle rule pattern logic: Day (D) -> Night (N) -> Off (O) -> Leave/Sick (X)
          let nextShift = 'D';
          if (currentShift === 'D') nextShift = 'N';
          else if (currentShift === 'N') nextShift = 'O';
          else if (currentShift === 'O') nextShift = 'X';
          
          updatedShifts[dayIndex] = nextShift;
          return { ...guard, shifts: updatedShifts };
        }
        return guard;
      })
    );
  };

  // Maps the pill colors cleanly based on their assigned badge categories
  const getShiftBadgeStyle = (shift: string) => {
    switch (shift) {
      case 'D': return 'bg-blue-600 text-white font-bold status-d'; // Day Shift (12h)
      case 'N': return 'bg-blue-900 text-white font-bold status-n'; // Night Shift (12h)
      case 'O': return 'bg-gray-100 text-gray-800 status-o';       // Off Duty
      case 'X': return 'bg-red-100 text-red-600 font-bold status-x'; // Leave / Sick
      default: return 'bg-white text-gray-400';
    }
  };

  // Helper arrays for tracking dynamic weekday headers for columns matching June 2026
  const weekdays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const getWeekdayHeader = (day: number) => {
    // June 1st, 2026 starts on a Monday
    return weekdays[(day - 1) % 7];
  };

  return (
    /* 
      ==========================================================================
      CRITICAL FIX: This wrapper ID matches index.css overrides exactly.
      Forces layout tracking to 1510px for crisp WhatsApp transfers.
      ==========================================================================
    */
    <div id="monthly-shift-scheduler-container" className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm overflow-x-auto">
      
      {/* Title Header Section inside the output layout */}
      <div className="flex flex-col mb-4">
        <h3 className="text-xl font-bold text-gray-900">Monthly Shift Scheduler</h3>
        <p className="text-sm text-gray-500 mt-1">
          Click any regular day cell to cycle: <span className="text-blue-600 font-semibold">Day (D)</span> – <span className="text-blue-900 font-semibold">Night (N)</span> – Off (O) – <span className="text-red-600 font-semibold">Leave/Sick (X)</span>.
        </p>
      </div>

      {/* Grid Roster Table Matrix Wrapper */}
      <div className="w-full min-w-[1460px]">
        <table className="w-full matrix-table table-fixed border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500 tracking-wider">
              <th className="w-48 px-4 py-3 sticky left-0 bg-gray-50 z-10">GUARD & STATION BADGE</th>
              <th className="w-20 px-2 py-3 text-center">HOURS</th>
              {daysArray.map(day => (
                <th key={day} className="px-1 py-2 text-center text-[10px] font-medium border-l border-gray-100">
                  <div className="text-gray-400 font-normal uppercase">{getWeekdayHeader(day)}</div>
                  <div className="text-gray-800 font-bold text-sm mt-0.5">{day}</div>
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-100">
            {guards.map(guard => (
              <tr key={guard.id} className="hover:bg-gray-50 transition-colors">
                {/* Guard Profile Sticky Identification Info Card Row */}
                <td className="px-4 py-3 sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] z-10">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-sm border border-blue-100">
                      {guard.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{guard.name}</div>
                      <div className="text-[11px] text-gray-400 font-medium flex items-center space-x-1">
                        <span>{guard.badgeNumber}</span>
                        <span className="text-gray-300">|</span>
                        <span>{guard.station}</span>
                      </div>
                    </div>
                  </div>
                </td>
                
                {/* Total Calculated Working Hours Advisory Component */}
                <td className="px-2 py-3 text-center font-semibold text-blue-700 bg-blue-50/40 text-sm">
                  {guard.totalHours}h
                </td>
                
                {/* 31-Day Interactive Grid Matrix Cells Output */}
                {guard.shifts.map((shift, dayIdx) => (
                  <td key={dayIdx} className="p-1 border-l border-gray-50 text-center">
                    <button
                      type="button"
                      onClick={() => handleShiftCycle(guard.id, dayIdx)}
                      className={`w-8 h-10 rounded-md flex items-center justify-center text-xs transition-transform active:scale-95 shadow-sm cursor-pointer ${getShiftBadgeStyle(shift)}`}
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

      {/* Roster Color Legend Footer Area */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-6 text-xs font-medium text-gray-500 no-print">
        <div className="flex items-center space-x-2">
          <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">D</span>
          <span>Day Shift (12h)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-5 h-5 rounded bg-blue-900 text-white flex items-center justify-center font-bold text-[10px]">N</span>
          <span>Night Shift (12h)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-5 h-5 rounded bg-gray-100 text-gray-700 flex items-center justify-center text-[10px]">O</span>
          <span>Off Duty</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-5 h-5 rounded bg-red-100 text-red-600 flex items-center justify-center font-bold text-[10px]">X</span>
          <span>Leave / Sick</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-5 h-5 rounded bg-red-600 text-white flex items-center justify-center font-bold text-[10px]">PH</span>
          <span>Namibian Public Holiday (Auto)</span>
        </div>
      </div>

    </div>
  );
}
