import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { DollarSign, FileSpreadsheet, Printer, TrendingUp, User, Receipt, Download, X } from 'lucide-react';

export default function PayrollCalculator() {
  const { employees, rosters, payrollSettings, currentMonth, selectedSiteId } = useApp();
  
  const [selectedPayslipEmp, setSelectedPayslipEmp] = useState<any | null>(null);

  const [yearStr, monthStr] = currentMonth.split("-");
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  const getMonthName = (m: number) => {
    return new Date(2026, m - 1, 1).toLocaleDateString('en-US', { month: 'long' });
  };

  // Filter employees
  const activeEmployees = useMemo(() => {
    if (selectedSiteId) {
      return employees.filter(e => e.site_id === selectedSiteId);
    }
    return employees;
  }, [employees, selectedSiteId]);

  // Compute breakdown for all employees
  const payrollData = useMemo(() => {
    if (!payrollSettings) return [];

    const { night_allowance, ot_rate, ot_threshold, ph_bonus } = payrollSettings;

    return activeEmployees.map(emp => {
      const empRoster = rosters[emp.id];
      let dCount = 0;
      let nCount = 0;
      let phCount = 0;

      if (empRoster && empRoster.shifts) {
        Object.values(empRoster.shifts).forEach(s => {
          if (s === 'D') dCount++;
          else if (s === 'N') nCount++;
          else if (s === 'PH') phCount++;
        });
      }

      const totalHours = (dCount * 12) + (nCount * 12) + (phCount * 12);
      const nightHours = nCount * 12;
      
      const overtimeHours = Math.max(0, totalHours - ot_threshold);
      const regularHours = Math.max(0, totalHours - overtimeHours);

      const regularPay = regularHours * emp.hourly_rate;
      const overtimePay = overtimeHours * emp.hourly_rate * ot_rate;
      const nightAllowancePay = nightHours * night_allowance;
      const phBonusPay = phCount * ph_bonus;
      const grossPay = regularPay + overtimePay + nightAllowancePay + phBonusPay;

      // Tax estimation: roughly 15% if gross exceeds N$ 4166 (N$ 50,000 threshold/yr)
      const taxRate = grossPay > 4166 ? 0.15 : 0;
      const textTax = grossPay * taxRate;
      const netPay = grossPay - textTax;

      return {
        id: emp.id,
        name: emp.name,
        badge: emp.badge,
        role: emp.role,
        hourlyRate: emp.hourly_rate,
        totalHours,
        regularHours,
        overtimeHours,
        regularPay,
        overtimePay,
        nightAllowancePay,
        phBonusPay,
        grossPay,
        tax: textTax,
        netPay,
        shiftSummary: `${dCount} Day, ${nCount} Night, ${phCount} PH`
      };
    });
  }, [activeEmployees, rosters, payrollSettings]);

  // Combined metrics
  const totals = useMemo(() => {
    let grossTotal = 0;
    let netTotal = 0;
    let otHoursTotal = 0;
    let hoursTotal = 0;

    payrollData.forEach(item => {
      grossTotal += item.grossPay;
      netTotal += item.netPay;
      otHoursTotal += item.overtimeHours;
      hoursTotal += item.totalHours;
    });

    return {
      grossTotal,
      netTotal,
      otHoursTotal,
      hoursTotal
    };
  }, [payrollData]);

  // Export CSV
  const exportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Guard Name,Badge ID,Role,Hourly Rate (NAD),Total Hours,Regular Hours,Overtime Hours,Regular Pay,Overtime Pay,Night Allowance,PH Bonus,Gross Salary,Tax (Est),Net Salary\r\n";

    payrollData.forEach(p => {
      csvContent += `"${p.name}","${p.badge}","${p.role}",${p.hourlyRate},${p.totalHours},${p.regularHours},${p.overtimeHours},${p.regularPay.toFixed(2)},${p.overtimePay.toFixed(2)},${p.nightAllowancePay.toFixed(2)},${p.phBonusPay.toFixed(2)},${p.grossPay.toFixed(2)},${p.tax.toFixed(2)},${p.netPay.toFixed(2)}\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ShiftWise_Namibia_Payroll_${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open printed receipt layout
  const printPayslip = () => {
    const printContent = document.getElementById("printable-payslip-content");
    if (!printContent) return;

    const winPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
    if (!winPrint) return alert("Please allow popups to print salary worksheets!");

    winPrint.document.write(`
      <html>
        <head>
          <title>Payslip - ${selectedPayslipEmp?.name}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 40px; color: #111; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 20px; margin-bottom: 25px; }
            .title { font-size: 22px; font-weight: bold; }
            .meta { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 14px; }
            .section-title { font-weight: bold; text-decoration: underline; margin-top: 20px; font-size: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
            th, td { padding: 8px; text-align: left; }
            tr.dashed-top { border-top: 1px dashed #000; }
            tr.double-top { border-top: 3px double #000; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; border-top: 1px dashed #000; padding-top: 15px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    winPrint.document.close();
  };

  // Overall Print payroll summary
  const printFullPayrollSummary = () => {
    const winPrint = window.open('', '', 'left=0,top=0,width=1000,height=900,toolbar=0,scrollbars=0,status=0');
    if (!winPrint) return alert("Please allow popups to print payroll documentation!");

    let rowsString = "";
    payrollData.forEach((p, idx) => {
      rowsString += `
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">${idx + 1}</td>
          <td style="border: 1px solid #ddd; padding: 8px;"><b>${p.name}</b><br><small>${p.badge}</small></td>
          <td style="border: 1px solid #ddd; padding: 8px;">${p.role}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${p.totalHours} hrs</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">N$ ${p.regularPay.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">N$ ${p.overtimePay.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">N$ ${p.nightAllowancePay.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">N$ ${p.phBonusPay.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">N$ ${p.grossPay.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; color: #b91c1c;">N$ ${p.tax.toFixed(2)}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold; background: #f0fdf4;">N$ ${p.netPay.toFixed(2)}</td>
        </tr>
      `;
    });

    winPrint.document.write(`
      <html>
        <head>
          <title>ShiftWise Namibia - Payroll Worksheet ${getMonthName(month)} ${year}</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 30px; font-size: 13px; color: #333; }
            .header { margin-bottom: 30px; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #185FA5; color: white; padding: 10px; font-size: 11px; text-transform: uppercase; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0; color: #185FA5;">ShiftWise Namibia 🇳🇦</h1>
            <p style="margin: 5px 0 0 0; font-size: 15px; font-weight: bold;">Payroll Worksheet Summary: ${getMonthName(month)} ${year}</p>
            <p style="margin: 3px 0 0 0; color: #666; font-size: 12px;">Generated securely via cloud database connection</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align: left;">#</th>
                <th style="text-align: left;">Employee</th>
                <th style="text-align: left;">Role</th>
                <th style="text-align: right;">Hours</th>
                <th style="text-align: right;">Regular</th>
                <th style="text-align: right;">Overtime</th>
                <th style="text-align: right;">Night All.</th>
                <th style="text-align: right;">PH Bonus</th>
                <th style="text-align: right;">Gross NAD</th>
                <th style="text-align: right;">P.A.Y.E Tax</th>
                <th style="text-align: right;">Net NAD</th>
              </tr>
            </thead>
            <tbody>
              ${rowsString}
              <tr style="background: #e2e8f0; font-weight: bold;">
                <td colspan="3" style="padding: 12px; border: 1px solid #cbd5e1;">TOTALS:</td>
                <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: right;">${totals.hoursTotal} hrs</td>
                <td colspan="5" style="padding: 12px; border: 1px solid #cbd5e1; text-align: right;">Gross: N$ ${totals.grossTotal.toFixed(2)}</td>
                <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: right;">Tax: N$ ${(totals.grossTotal - totals.netTotal).toFixed(2)}</td>
                <td style="padding: 12px; border: 1px solid #cbd5e1; text-align: right; background: #dcfce7; color: #166534;">N$ ${totals.netTotal.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    winPrint.document.close();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Namibian Payroll Calculator</h2>
          <p className="text-xs text-gray-500">
            Real-time hours, overtime, night allowances, and public holiday bonus structures calculated in <strong>Namibian Dollar (N$ / NAD)</strong>.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={printFullPayrollSummary}
            className="bg-white border border-gray-200 hover:border-blue-700 text-[#185FA5] font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            Print Worksheet
          </button>
          
          <button
            onClick={exportCSV}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Export CSV File
          </button>
        </div>
      </div>

      {/* Stats Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-700 to-[#185FA5] p-5 rounded-2xl text-white shadow-xs">
          <p className="text-xs text-blue-200 font-semibold uppercase tracking-wider">Gross Month Budget</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-sm font-semibold">N$</span>
            <span className="text-2xl font-black">{totals.grossTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[10px] text-blue-200 mt-2">Sum of regular, overtime, and night allowances</p>
        </div>

        <div className="bg-emerald-800 p-5 rounded-2xl text-white shadow-xs">
          <p className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">Net Payable Cash</p>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-sm font-semibold">N$</span>
            <span className="text-2xl font-black">{totals.netTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <p className="text-[10px] text-emerald-200 mt-2">Transfers to guard accounts after basic P.A.Y.E</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-700">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Overtime Accumulations</p>
            <h4 className="text-xl font-black text-gray-900 mt-1">{totals.otHoursTotal} hrs total</h4>
          </div>
        </div>
      </div>

      {/* Main payroll calculations grid */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-4 bg-gray-50 border-b border-gray-100 font-bold text-xs text-gray-700 tracking-wider uppercase">
          Salary sheet breakdowns ({getMonthName(month)} {year})
        </div>
        
        <div className="overflow-x-auto">
          {payrollData.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">No employees found in current registry.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100/30 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase">
                  <th className="p-3">Staff Member</th>
                  <th className="p-3 text-center">Hours</th>
                  <th className="p-3 text-right">Regular Pay</th>
                  <th className="p-3 text-right">Overtime Pay</th>
                  <th className="p-3 text-right">Night Extra</th>
                  <th className="p-3 text-right">PH Bonus</th>
                  <th className="p-3 text-right">Gross NAD</th>
                  <th className="p-3 text-right text-rose-700">Est. Tax</th>
                  <th className="p-3 text-right text-emerald-700">Net NAD</th>
                  <th className="p-3 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payrollData.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition">
                    <td className="p-3">
                      <div className="text-xs font-bold text-gray-900">{p.name}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{p.badge} | {p.role}</div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="text-xs font-bold text-gray-800">{p.totalHours} h</div>
                      <div className="text-[9px] text-gray-400 font-mono mt-0.5">({p.overtimeHours} Overtime)</div>
                    </td>
                    <td className="p-3 text-right text-xs font-medium text-gray-700">N$ {p.regularPay.toFixed(2)}</td>
                    <td className="p-3 text-right text-xs font-medium text-gray-700">
                      N$ {p.overtimePay.toFixed(2)}
                      <div className="text-[8px] text-gray-400 mt-0.5">({p.overtimeHours}h × 1.5)</div>
                    </td>
                    <td className="p-3 text-right text-xs font-medium text-gray-700">N$ {p.nightAllowancePay.toFixed(2)}</td>
                    <td className="p-3 text-right text-xs font-medium text-gray-700">N$ {p.phBonusPay.toFixed(2)}</td>
                    <td className="p-3 text-right text-xs font-black text-gray-900">N$ {p.grossPay.toFixed(2)}</td>
                    <td className="p-3 text-right text-xs font-bold text-rose-600">N$ {p.tax.toFixed(2)}</td>
                    <td className="p-3 text-right text-xs font-black text-emerald-700 bg-emerald-50/20">N$ {p.netPay.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedPayslipEmp(p)}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-blue-100 hover:text-blue-700 text-gray-600 transition cursor-pointer"
                        title="Display dynamic payslip"
                      >
                        <Receipt className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Dynamic Payslip Modal Dialog */}
      {selectedPayslipEmp && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-[#185FA5] text-white p-4 flex items-center justify-between">
              <span className="font-bold tracking-tight text-sm">Guard Salary Statement</span>
              <button 
                onClick={() => setSelectedPayslipEmp(null)} 
                className="text-white hover:opacity-80 transition p-1 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Payslip content (Printable formatting matches classic style) */}
            <div className="p-6 bg-amber-50/20 overflow-y-auto max-h-[70vh]">
              <div id="printable-payslip-content" className="bg-white p-5 border border-gray-200 shadow-sm font-mono text-xs text-gray-800 leading-relaxed">
                <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
                  <h3 className="text-base font-extrabold text-blue-800 tracking-wider">SHIFTWISE NAMIBIA 🇳🇦</h3>
                  <p className="text-[10px] text-gray-400 mt-1">Official Employee Salary Advisory Slip</p>
                </div>

                <div className="flex justify-between mb-1.5">
                  <span className="text-gray-500">Employee:</span>
                  <span className="font-bold text-gray-900">{selectedPayslipEmp.name}</span>
                </div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-gray-500">Badge ID:</span>
                  <span className="font-semibold text-gray-900">{selectedPayslipEmp.badge}</span>
                </div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-gray-500">Role Title:</span>
                  <span className="font-semibold text-gray-900">{selectedPayslipEmp.role}</span>
                </div>
                <div className="flex justify-between mb-3 border-b border-dashed border-gray-200 pb-2">
                  <span className="text-gray-500">Month Period:</span>
                  <span className="font-semibold text-gray-900">{getMonthName(month)} {year}</span>
                </div>

                <div className="font-bold text-gray-900 border-b border-dashed border-gray-200 pb-1 mb-2">EARNING BREAKDOWNS</div>
                
                <div className="flex justify-between mb-1.5">
                  <span>Regular Pay ({selectedPayslipEmp.regularHours}h @ N$ {selectedPayslipEmp.hourlyRate.toFixed(2)})</span>
                  <span>N$ {selectedPayslipEmp.regularPay.toFixed(2)}</span>
                </div>
                
                {selectedPayslipEmp.overtimeHours > 0 && (
                  <div className="flex justify-between mb-1.5">
                    <span>Overtime ({selectedPayslipEmp.overtimeHours}h @ N$ {(selectedPayslipEmp.hourlyRate * 1.5).toFixed(2)})</span>
                    <span>N$ {selectedPayslipEmp.overtimePay.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between mb-1.5">
                  <span>Night shift Allowances</span>
                  <span>N$ {selectedPayslipEmp.nightAllowancePay.toFixed(2)}</span>
                </div>

                <div className="flex justify-between mb-3 border-b border-dashed border-gray-200 pb-2">
                  <span>Namibian Public Holiday Bonuses</span>
                  <span>N$ {selectedPayslipEmp.phBonusPay.toFixed(2)}</span>
                </div>

                {/* Totals and deductions */}
                <div className="flex justify-between font-bold text-gray-900 mb-1.5">
                  <span>GROSS MONTH SALARY:</span>
                  <span>N$ {selectedPayslipEmp.grossPay.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-rose-700 mb-3 border-b border-dashed border-gray-250 pb-2">
                  <span>P.A.Y.E Deductions (15% est):</span>
                  <span>- N$ {selectedPayslipEmp.tax.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-base font-black text-emerald-800 border-b-2 border-double border-emerald-800 pb-2 pt-1 mb-4">
                  <span>NET PAYABLE DISBURSEMENT:</span>
                  <span>N$ {selectedPayslipEmp.netPay.toFixed(2)}</span>
                </div>

                <div className="text-center pt-2 text-[10px] text-gray-400">
                  <p>Sharp sharp my friend!</p>
                  <p className="mt-1">Generated securely. Retain for tax records.</p>
                </div>
              </div>
            </div>

            {/* Print trigger footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setSelectedPayslipEmp(null)}
                className="border border-gray-250 hover:bg-gray-100 text-gray-600 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={printPayslip}
                className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Print Payslip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
