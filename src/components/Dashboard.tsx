import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Users, Calendar, Clock, AlertCircle, Sparkles, Send, FileSpreadsheet } from 'lucide-react';
import { SHIFT_DEFINITIONS, ShiftType } from '../types';
import { isNamibianPublicHoliday } from '../lib/holidays';

export default function Dashboard({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { employees, rosters, currentMonth, selectedSiteId, executeAutoFill, sites } = useApp();

  // Get current year and month numerical value
  const [yearStr, monthStr] = currentMonth.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  const daysInMonth = useMemo(() => {
    return new Date(year, month, 0).getDate();
  }, [year, month]);

  const activeEmployees = useMemo(() => {
    if (selectedSiteId) {
      return employees.filter(e => e.site_id === selectedSiteId);
    }
    return employees;
  }, [employees, selectedSiteId]);

  // Compute Holidays this month
  const holidaysThisMonth = useMemo(() => {
    let count = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (isNamibianPublicHoliday(dateStr)) {
        count++;
      }
    }
    return count;
  }, [year, month, daysInMonth]);

  // Calculations for stats
  const stats = useMemo(() => {
    let totalAssignedShifts = 0;
    let totalWorkingHours = 0;

    activeEmployees.forEach(emp => {
      const empRoster = rosters[emp.id];
      if (empRoster && empRoster.shifts) {
        Object.values(empRoster.shifts).forEach((s) => {
          if (s === 'D' || s === 'N' || s === 'PH') {
            totalAssignedShifts++;
            totalWorkingHours += 12;
          }
        });
      }
    });

    return {
      totalEmployees: activeEmployees.length,
      shiftsAssigned: totalAssignedShifts,
      totalHours: totalWorkingHours,
      holidays: holidaysThisMonth
    };
  }, [activeEmployees, rosters, holidaysThisMonth]);

  // Weekly Coverage Calculation
  // Week 1: 1-7, Week 2: 8-14, Week 3: 15-21, Week 4: 22+
  const weeklyCoverage = useMemo(() => {
    const counts = [0, 0, 0, 0]; // 4 weeks
    activeEmployees.forEach(emp => {
      const empRoster = rosters[emp.id];
      if (empRoster && empRoster.shifts) {
        Object.entries(empRoster.shifts).forEach(([day, shift]) => {
          if (shift === 'D' || shift === 'N' || shift === 'PH') {
            const dayNum = parseInt(day);
            if (dayNum <= 7) counts[0]++;
            else if (dayNum <= 14) counts[1]++;
            else if (dayNum <= 21) counts[2]++;
            else counts[3]++;
          }
        });
      }
    });
    return counts;
  }, [activeEmployees, rosters]);

  // Hours per Employee calculation
  const employeeHours = useMemo(() => {
    return activeEmployees.map(emp => {
      let hours = 0;
      const empRoster = rosters[emp.id];
      if (empRoster && empRoster.shifts) {
        Object.values(empRoster.shifts).forEach(s => {
          if (s === 'D' || s === 'N' || s === 'PH') {
            hours += 12;
          }
        });
      }
      return {
        id: emp.id,
        name: emp.name,
        badge: emp.badge,
        hours
      };
    }).sort((a, b) => b.hours - a.hours).slice(0, 5); // top 5
  }, [activeEmployees, rosters]);

  const maxWeeklyShifts = Math.max(...weeklyCoverage, 5);

  const getMonthName = (m: number) => {
    const dates = new Date(2026, m - 1, 1);
    return dates.toLocaleDateString('en-US', { month: 'long' });
  };

  // WhatsApp Share pre-formatted summarizing coverage text
  const shareToWhatsApp = () => {
    let summaryText = `🇳🇦 *ShiftWise Namibia - Roster Summary (${getMonthName(month)} ${year})*\n\n`;
    summaryText += `*Stats Overview:*\n`;
    summaryText += `• Total Employees: ${activeEmployees.length}\n`;
    summaryText += `• Assigned Shifts: ${stats.shiftsAssigned}\n`;
    summaryText += `• Total Scheduled Hours: ${stats.totalHours} hrs\n\n`;
    
    summaryText += `*Hours Breakdown:*\n`;
    activeEmployees.forEach(emp => {
      let hours = 0;
      let dayShifts = 0;
      let nightShifts = 0;
      const empRoster = rosters[emp.id];
      if (empRoster && empRoster.shifts) {
        Object.values(empRoster.shifts).forEach(s => {
          if (s === 'D') { dayShifts++; hours += 12; }
          else if (s === 'N') { nightShifts++; hours += 12; }
          else if (s === 'PH') { dayShifts++; hours += 12; }
        });
      }
      summaryText += `• *${emp.name}* (${emp.badge}): ${hours} hrs (${dayShifts} Day, ${nightShifts} Night)\n`;
    });

    summaryText += `\n_Generated securely using ShiftWise Namibia_`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-[#185FA5] to-blue-800 text-white p-6 rounded-2xl shadow-xs relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 font-black text-8xl -mr-8 -mt-8 select-none">🇳🇦</div>
        <div className="max-w-2xl relative z-10">
          <div className="text-xs bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 mb-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Awe! Active Shifting
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Workforce Cockpit</h2>
          <p className="mt-1.5 text-blue-100 text-sm md:text-base">
            Manage, review, and auto-calculate payroll for your staff in <strong>{getMonthName(month)} {year}</strong>. Focus on continuous security coverage across sites.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center text-[#185FA5] shrink-0 font-semibold">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Scheduled Guards</p>
            <h4 className="text-2xl font-black text-gray-900 mt-1">{stats.totalEmployees}</h4>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#25D366]/10 flex items-center justify-center text-emerald-600 shrink-0 font-semibold">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Shifts Assigned</p>
            <h4 className="text-2xl font-black text-gray-900 mt-1">{stats.shiftsAssigned}</h4>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 font-semibold">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Total Roster Hours</p>
            <h4 className="text-2xl font-black text-gray-900 mt-1">{stats.totalHours} h</h4>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0 font-semibold">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500">Holidays in {getMonthName(month)}</p>
            <h4 className="text-2xl font-black text-gray-900 mt-1">{stats.holidays}</h4>
          </div>
        </div>
      </div>

      {/* Two-Column Chart Block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Coverage Chart */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <h3 className="font-bold text-gray-800 text-sm tracking-tight mb-4">WEEKLY SHIFT COVERAGE (SHIFTS)</h3>
          
          <div className="h-64 flex items-end justify-between px-6 pb-2 pt-4 relative">
            {/* Gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pt-4">
              <div className="border-b border-gray-150 w-full h-0"></div>
              <div className="border-b border-gray-150 w-full h-0"></div>
              <div className="border-b border-gray-150 w-full h-0"></div>
              <div className="border-b border-gray-150 w-full h-0"></div>
            </div>

            {/* Bars */}
            {weeklyCoverage.map((val, idx) => {
              const pct = maxWeeklyShifts > 0 ? (val / maxWeeklyShifts) * 100 : 0;
              return (
                <div key={idx} className="flex flex-col items-center flex-1 relative z-10 group cursor-default">
                  <div className="bg-[#185FA5] hover:bg-blue-700 w-12 rounded-t-lg transition-all duration-300 relative shadow-xs" style={{ height: `${Math.max(pct, 5)}%` }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white font-bold text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap shadow-xs">
                      {val} shifts
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 font-medium mt-2">Week {idx + 1}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Employees By Hours Chart */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <h3 className="font-bold text-gray-800 text-sm tracking-tight mb-4">MOST SCHEDULED GUARDS (HOURS)</h3>
          
          <div className="h-64 flex flex-col justify-around">
            {employeeHours.length === 0 ? (
              <div className="text-center text-gray-400 text-xs py-10">No shifts assigned yet in rosters.</div>
            ) : (
              employeeHours.map((emp) => {
                const maxHrs = 12 * daysInMonth;
                const ratio = maxHrs > 0 ? (emp.hours / 240) * 100 : 0; // limit reference to 240 normal hrs
                return (
                  <div key={emp.id} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-800">{emp.name} <span className="text-gray-400 font-medium font-mono">({emp.badge})</span></span>
                      <span className="text-gray-900">{emp.hours} hrs</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div className="bg-[#185FA5] h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(ratio, 100)}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Quick Action Panel */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <h3 className="font-bold text-gray-800 text-sm tracking-tight mb-4">QUICK OPERATIONS Cockpit</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Action 1 */}
          <button 
            onClick={executeAutoFill}
            disabled={employees.length === 0}
            className="flex flex-col items-center justify-center p-4 bg-blue-50 border border-blue-100 hover:border-[#185FA5] text-[#185FA5] rounded-xl transition cursor-pointer text-center disabled:opacity-40"
          >
            <Sparkles className="h-6 w-6 text-[#185FA5] mb-2 animate-pulse" />
            <span className="font-bold text-xs">Run 6-Day Auto-Fill</span>
            <span className="text-[10px] text-blue-600 mt-1">Generates rotation template</span>
          </button>

          {/* Action 2 */}
          <button 
            onClick={() => setActiveTab("roster")}
            className="flex flex-col items-center justify-center p-4 bg-emerald-50 border border-emerald-100 hover:border-emerald-500 text-emerald-800 rounded-xl transition cursor-pointer text-center"
          >
            <FileSpreadsheet className="h-6 w-6 text-emerald-600 mb-2" />
            <span className="font-bold text-xs">Manage Roster Grid</span>
            <span className="text-[10px] text-emerald-600 mt-1">Cell-by-cell scheduler</span>
          </button>
        </div>
      </div>
    </div>
  );
}
