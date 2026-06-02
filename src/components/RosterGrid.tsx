import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Trash2, Calendar, HelpCircle, UserCheck } from 'lucide-react';
import { isNamibianPublicHoliday, getNamibianHolidayName } from '../lib/holidays';
import { ShiftType } from '../types';

export default function RosterGrid() {
  const { 
    currentMonth, 
    employees, 
    rosters, 
    selectedSiteId, 
    updateSingleShift, 
    executeAutoFill, 
    executeClearAll,
    executeClearEmployee 
  } = useApp();

  // Parse Year and Month
  const [yearStr, monthStr] = currentMonth.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  // Total days in the selected month
  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  // Generate date entries
  const calendarDays = useMemo(() => {
    const list = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6; // 0 = Sunday, 6 = Saturday
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isHoliday = isNamibianPublicHoliday(dateStr);
      const holidayName = getNamibianHolidayName(dateStr);

      list.push({
        dayNum: d,
        dateStr,
        isWeekend,
        isHoliday,
        holidayName,
        dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' })
      });
    }
    return list;
  }, [year, month, daysInMonth]);

  // Filtered active employees
  const activeEmployees = useMemo(() => {
    if (selectedSiteId) {
      return employees.filter(e => e.site_id === selectedSiteId);
    }
    return employees;
  }, [employees, selectedSiteId]);

  // Helper to handle cell click and cycle through shifts:
  // D -> N -> O -> X -> (loop to D)
  const handleCellClick = async (employeeId: string, dayNum: number, isHolidayLocked: boolean) => {
    if (isHolidayLocked) {
      alert("This is a Namibia Public Holiday! Under Namibian labor law, this shift is auto-locked as a paid Holiday (PH).");
      return;
    }

    const currentRoster = rosters[employeeId];
    const currentShift = (currentRoster?.shifts?.[String(dayNum)]) || 'O';
    
    // Cycle logic
    let nextShift: ShiftType;
    if (currentShift === 'D') nextShift = 'N';
    else if (currentShift === 'N') nextShift = 'O';
    else if (currentShift === 'O') nextShift = 'X';
    else if (currentShift === 'X') nextShift = 'D';
    else nextShift = 'O';

    await updateSingleShift(employeeId, String(dayNum), nextShift);
  };

  // Compute Total guard hours for the month
  const computeEmployeeHours = (employeeId: string) => {
    const r = rosters[employeeId];
    if (!r || !r.shifts) return 0;
    
    let total = 0;
    Object.values(r.shifts).forEach(s => {
      if (s === 'D' || s === 'N' || s === 'PH') {
        total += 12;
      }
    });
    return total;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Header operations */}
      <div className="p-4 bg-gray-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-900 tracking-tight text-base flex items-center gap-2">
            Monthly Shift Scheduler
          </h3>
          <p className="text-xs text-gray-500">
            Click any regular day cell to cycle: <span className="font-semibold text-blue-700">Day (D)</span> → <span className="font-semibold text-blue-900">Night (N)</span> → <span className="font-semibold text-gray-500">Off (O)</span> → <span className="font-semibold text-rose-600">Leave/Sick (X)</span>.
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={executeAutoFill}
            disabled={activeEmployees.length === 0}
            className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
          >
            <Sparkles className="h-4 w-4 animate-pulse" />
            Auto-Fill staggered shifts
          </button>
          
          <button
            onClick={executeClearAll}
            disabled={activeEmployees.length === 0}
            className="border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Clear Month
          </button>
        </div>
      </div>

      {/* Grid container with custom scroll styling */}
      <div className="overflow-x-auto">
        {activeEmployees.length === 0 ? (
          <div className="py-12 text-center">
            <HelpCircle className="mx-auto h-12 w-12 text-gray-300" />
            <h4 className="mt-2 text-sm font-bold text-gray-900">No Guards Registered</h4>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              Please go to the <strong>Employee Registry</strong> tab to add your security guards or workforce members first.
            </p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse table-fixed select-none">
            <thead>
              <tr className="bg-gray-100/50 border-b border-gray-200">
                {/* Employee Info Header Column */}
                <th className="min-w-[180px] max-w-[200px] w-[180px] p-3 text-xs font-bold text-gray-700 uppercase tracking-wider sticky left-0 bg-[#f9fafb] z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.03)] border-r border-gray-200">
                  Guard / Employee
                </th>
                
                {/* Total scheduled hours indicator */}
                <th className="min-w-[70px] w-[70px] p-3 text-xs font-bold text-gray-700 uppercase tracking-wider text-center border-r border-gray-200">
                  Hours
                </th>

                {/* Days of the month columns */}
                {calendarDays.map((cd) => (
                  <th 
                    key={cd.dayNum} 
                    className={`min-w-[42px] p-1.5 text-center border-r border-gray-200 ${
                      cd.isWeekend ? 'bg-orange-50/50' : ''
                    } ${cd.isHoliday ? 'bg-red-50/70 border-r-red-100' : ''}`}
                    title={cd.isHoliday ? cd.holidayName || "" : ""}
                  >
                    <div className="text-[10px] uppercase font-bold text-gray-400">{cd.dayLabel}</div>
                    <div className={`text-xs font-black mt-0.5 ${cd.isHoliday ? 'text-rose-600 font-extrabold' : 'text-gray-800'}`}>
                      {cd.dayNum}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeEmployees.map((emp) => {
                const totalHours = computeEmployeeHours(emp.id);
                return (
                  <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50/30 transition group">
                    {/* Sticky Employee Badge cell */}
                    <td className="p-3 font-medium text-gray-800 sticky left-0 bg-white group-hover:bg-gray-50 z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.03)] border-r border-gray-200 flex items-center gap-2 select-none">
                      <div className="h-7 w-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-[#185FA5] text-[10px] uppercase">
                        {emp.name.slice(0, 2)}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-bold text-gray-900 group-hover:text-blue-700 transition truncate">{emp.name}</div>
                        <div className="text-[9px] text-gray-400 font-mono tracking-tight font-medium mt-0.5">{emp.badge} | {emp.role}</div>
                      </div>
                    </td>

                    {/* Total hours */}
                    <td className="p-3 text-center border-r border-gray-200 font-bold text-xs select-none">
                      <span className={`inline-block px-1.5 py-0.5 rounded ${
                        totalHours >= 200 ? 'bg-indigo-100 text-indigo-800 font-extrabold' : 
                        totalHours >= 160 ? 'bg-emerald-100 text-emerald-800' :
                        totalHours > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-400'
                      }`}>
                        {totalHours}h
                      </span>
                    </td>

                    {/* Roster shifts per day cells */}
                    {calendarDays.map((cd) => {
                      const empRoster = rosters[emp.id];
                      let shiftCode = empRoster?.shifts?.[String(cd.dayNum)];
                      
                      // Auto lock public holidays
                      if (cd.isHoliday) {
                        shiftCode = 'PH';
                      } else if (!shiftCode) {
                        shiftCode = 'O'; // default to off
                      }

                      // Visual states depending on code
                      let bgClass = "bg-white text-gray-400 hover:bg-gray-100/50";
                      let badgeText = "O";
                      
                      if (shiftCode === 'D') {
                        bgClass = "bg-blue-50 text-blue-700 font-extrabold hover:bg-blue-100/70";
                        badgeText = "D";
                      } else if (shiftCode === 'N') {
                        bgClass = "bg-blue-900 text-blue-100 font-extrabold hover:bg-blue-800/90";
                        badgeText = "N";
                      } else if (shiftCode === 'X') {
                        bgClass = "bg-rose-50 text-rose-700 border border-rose-100 font-bold hover:bg-rose-100/70";
                        badgeText = "X";
                      } else if (shiftCode === 'PH') {
                        bgClass = "bg-red-600 text-white font-black";
                        badgeText = "PH";
                      }

                      return (
                        <td 
                          key={cd.dayNum} 
                          onClick={() => handleCellClick(emp.id, cd.dayNum, cd.isHoliday)}
                          className={`p-1 Text-center border-r border-gray-150 cursor-pointer transition select-none ${
                            cd.isWeekend && shiftCode === 'O' ? 'bg-orange-50/20' : ''
                          } h-11`}
                        >
                          <div className={`w-full h-full flex items-center justify-center text-xs rounded-lg transition-all border border-transparent ${bgClass}`}>
                            {badgeText}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend details */}
      <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex flex-wrap gap-4 text-xs font-semibold text-gray-600 select-none">
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-6 bg-blue-50 border border-blue-100 text-blue-700 rounded flex items-center justify-center font-bold text-[10px]">D</span>
          Day Shift (12h)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-6 bg-blue-900 text-blue-100 rounded flex items-center justify-center font-bold text-[10px]">N</span>
          Night Shift (12h)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-6 bg-white border border-gray-200 text-gray-400 rounded flex items-center justify-center font-bold text-[10px]">O</span>
          Off Duty
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-6 bg-rose-50 border border-rose-100 text-rose-700 rounded flex items-center justify-center font-bold text-[10px]">X</span>
          Leave / Sick
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-4 w-6 bg-red-600 text-white rounded flex items-center justify-center font-bold text-[10px]">PH</span>
          Namibian Public Holiday (Auto)
        </span>
      </div>
    </div>
  );
}
