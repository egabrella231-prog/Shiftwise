import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Trash2, Calendar, HelpCircle, UserCheck, Printer, Download, Copy, Check, ExternalLink, Image } from 'lucide-react';
import { isNamibianPublicHoliday, getNamibianHolidayName } from '../lib/holidays';
import { ShiftType } from '../types';
import html2canvas from 'html2canvas';

export default function RosterGrid() {
  const { 
    currentMonth, 
    employees, 
    rosters, 
    selectedSiteId, 
    updateSingleShift, 
    executeAutoFill, 
    executeClearAll,
    executeClearEmployee,
    sites
  } = useApp();

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTitle, setShareTitle] = useState('');
  const [shareText, setShareText] = useState('');
  const [targetPhone, setTargetPhone] = useState('');
  const [copied, setCopied] = useState(false);

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

  const [isExportingImage, setIsExportingImage] = useState(false);

  // Action: Print trigger
  const handlePrint = () => {
    window.print();
  };

  // Action: Download Roster as a beautiful Image (PNG) with absolute style preservation
  const handleDownloadImage = async () => {
    const originalElement = document.getElementById('monthly-shift-scheduler-container');
    if (!originalElement) return;

    setIsExportingImage(true);

    let clonedElement: HTMLElement | null = null;
    const originalStylesheets: {
      element: HTMLStyleElement | HTMLLinkElement;
      parent: Node | null;
      nextSibling: Node | null;
    }[] = [];
    const tempStyleElements: HTMLStyleElement[] = [];

    // Helper to convert OKLCH and OKLAB colors to HSL/RGB colors (fully supported by html2canvas's parser)
    const convertCSSOklchToHsl = (cssText: string): string => {
      if (!cssText) return '';
      try {
        // Convert OKLCH: oklch(L C H [ / A])
        let res = cssText.replace(/oklch\(([^)]+)\)/g, (match, content) => {
          try {
            const parts = content.trim().split(/[\s/]+/);
            if (parts.length >= 3) {
              const L = parts[0];
              const C = parts[1];
              const H = parts[2];
              const A = parts[3] !== undefined ? parts[3] : '1';

              let lNum = L.endsWith('%') ? parseFloat(L) : parseFloat(L) * 100;
              const cNum = parseFloat(C);
              const sNum = Math.min(100, Math.max(0, cNum * 250));
              const hNum = parseFloat(H.replace('deg', ''));
              
              let alpha = A;
              if (A.endsWith('%')) {
                alpha = (parseFloat(A) / 100).toString();
              }

              if (!isNaN(lNum) && !isNaN(sNum) && !isNaN(hNum)) {
                return `hsla(${hNum.toFixed(1)}, ${sNum.toFixed(1)}%, ${lNum.toFixed(1)}%, ${alpha})`;
              }
            }
          } catch (e) {
            // Ignore
          }
          return match;
        });

        // Convert OKLAB: oklab(L A B [ / Alpha])
        res = res.replace(/oklab\(([^)]+)\)/g, (match, content) => {
          try {
            const parts = content.trim().split(/[\s/]+/);
            if (parts.length >= 1) {
              const L = parts[0];
              const A = parts[3] !== undefined ? parts[3] : '1';

              let lNum = L.endsWith('%') ? parseFloat(L) : parseFloat(L) * 100;
              let alpha = A;
              if (A.endsWith('%')) {
                alpha = (parseFloat(A) / 100).toString();
              }

              if (!isNaN(lNum)) {
                const grayVal = Math.round(lNum * 2.55);
                return `rgba(${grayVal}, ${grayVal}, ${grayVal}, ${alpha})`;
              }
            }
          } catch (e) {
            // Ignore
          }
          return match;
        });

        return res;
      } catch (err) {
        return cssText;
      }
    };

    // Disabled original slow loop
    const convertCSSOklchToHslOLD = (cssText: string): string => { return cssText; };
    const convertCSSOklchToHslOLD_disabled = (cssText: string): string => {
      let result = '';
      let i = 0;
      while (i < cssText.length) {
        if (cssText.substring(i, i + 6) === 'oklch(') {
          // Find the balancing closing parenthesis
          let parenCount = 1;
          let start = i + 6;
          let j = start;
          while (j < cssText.length && parenCount > 0) {
            if (cssText[j] === '(') {
              parenCount++;
            } else if (cssText[j] === ')') {
              parenCount--;
            }
            j++;
          }
          
          const contents = cssText.substring(start, j - 1);
          let replaced = 'rgb(240, 240, 240)'; // default fallback
          try {
            const parts = contents.trim().split(/[\s/]+/).filter(Boolean);
            if (parts.length >= 3) {
              let L = parts[0];
              let C = parts[1];
              let H = parts[2];
              let A = '1';
              if (parts.length >= 4) {
                if (!parts[3].includes('var')) {
                  A = parts[3];
                }
              }

              let lNum = L.endsWith('%') ? parseFloat(L) : parseFloat(L) * 100;
              let cNum = parseFloat(C);
              let sNum = Math.min(100, Math.max(0, cNum * 250));
              let hNum = parseFloat(H.replace('deg', ''));

              let alpha = A;
              if (A.endsWith('%')) {
                alpha = (parseFloat(A) / 100).toString();
              }

              if (!isNaN(lNum) && !isNaN(sNum) && !isNaN(hNum)) {
                replaced = `hsla(${hNum}, ${sNum.toFixed(1)}%, ${lNum.toFixed(1)}%, ${alpha})`;
              }
            }
          } catch (e) {
            // Fallback
          }
          result += replaced;
          i = j;
        } else if (cssText.substring(i, i + 6) === 'oklab(') {
          // Find the balancing closing parenthesis
          let parenCount = 1;
          let start = i + 6;
          let j = start;
          while (j < cssText.length && parenCount > 0) {
            if (cssText[j] === '(') {
              parenCount++;
            } else if (cssText[j] === ')') {
              parenCount--;
            }
            j++;
          }
          
          const contents = cssText.substring(start, j - 1);
          let replaced = 'rgb(240, 240, 240)'; // default fallback for oklab
          try {
            const parts = contents.trim().split(/[\s/]+/).filter(Boolean);
            if (parts.length >= 1) {
              let L = parts[0];
              let lNum = L.endsWith('%') ? parseFloat(L) : parseFloat(L) * 100;
              let A = '1';
              if (parts.length >= 4) {
                if (!parts[3].includes('var')) {
                  A = parts[3];
                }
              }

              let alpha = A;
              if (A.endsWith('%')) {
                alpha = (parseFloat(A) / 100).toString();
              }

              if (!isNaN(lNum)) {
                // simple grayscale approximation for oklab
                replaced = `rgba(${Math.round(lNum * 2.55)}, ${Math.round(lNum * 2.55)}, ${Math.round(lNum * 2.55)}, ${alpha})`;
              }
            }
          } catch (e) {
            // Fallback
          }
          result += replaced;
          i = j;
        } else {
          result += cssText[i];
          i++;
        }
      }
      return result;
    };

    try {
      // Clean and sanitize stylesheets to avoid oklch and oklab parsing crashes in html2canvas
      try {
        const stylesheets = Array.from(document.styleSheets);
        for (let i = 0; i < stylesheets.length; i++) {
          const sheet = stylesheets[i];
          const ownerNode = sheet.ownerNode as HTMLElement | null;
          if (!ownerNode) continue;

          if (ownerNode.tagName === 'STYLE') {
            const styleEl = ownerNode as HTMLStyleElement;
            const originalText = styleEl.textContent || '';
            if (originalText.includes('oklch') || originalText.includes('oklab')) {
              originalStylesheets.push({
                element: styleEl,
                parent: styleEl.parentNode,
                nextSibling: styleEl.nextSibling
              });
              styleEl.disabled = true;
              if (styleEl.parentNode) {
                styleEl.parentNode.removeChild(styleEl);
              }

              const tempStyle = document.createElement('style');
              tempStyle.className = 'temp-hl2c-style-override';
              tempStyle.textContent = convertCSSOklchToHsl(originalText);
              document.head.appendChild(tempStyle);
              tempStyleElements.push(tempStyle);
            }
          } else if (ownerNode.tagName === 'LINK') {
            const linkEl = ownerNode as HTMLLinkElement;
            if (linkEl.rel === 'stylesheet') {
              try {
                let rulesText = '';
                const rules = sheet.cssRules || sheet.rules;
                if (rules && rules.length > 0) {
                  rulesText = Array.from(rules).map(r => r.cssText).join('\n');
                }

                if (rulesText.includes('oklch') || rulesText.includes('oklab')) {
                  originalStylesheets.push({
                    element: linkEl,
                    parent: linkEl.parentNode,
                    nextSibling: linkEl.nextSibling
                  });
                  linkEl.disabled = true;
                  if (linkEl.parentNode) {
                    linkEl.parentNode.removeChild(linkEl);
                  }

                  const tempStyle = document.createElement('style');
                  tempStyle.className = 'temp-hl2c-style-override';
                  tempStyle.textContent = convertCSSOklchToHsl(rulesText);
                  document.head.appendChild(tempStyle);
                  tempStyleElements.push(tempStyle);
                }
              } catch (e) {
                // Fetch Link stylesheet dynamically for cross-origin or same-origin rule block fallback
                try {
                  const response = await fetch(linkEl.href);
                  if (response.ok) {
                    const rulesText = await response.text();
                    if (rulesText.includes('oklch') || rulesText.includes('oklab')) {
                      originalStylesheets.push({
                        element: linkEl,
                        parent: linkEl.parentNode,
                        nextSibling: linkEl.nextSibling
                      });
                      linkEl.disabled = true;
                      if (linkEl.parentNode) {
                        linkEl.parentNode.removeChild(linkEl);
                      }

                      const tempStyle = document.createElement('style');
                      tempStyle.className = 'temp-hl2c-style-override';
                      tempStyle.textContent = convertCSSOklchToHsl(rulesText);
                      document.head.appendChild(tempStyle);
                      tempStyleElements.push(tempStyle);
                    }
                  }
                } catch (err) {
                  // Ignore silently
                }
              }
            }
          }
        }
      } catch (styleErr) {
        console.warn('Stylesheet processing skipped/failed:', styleErr);
      }

      // 1. Programmatically create an off-screen temporary DOM clone of the element with the ID monthly-shift-scheduler-container.
      clonedElement = originalElement.cloneNode(true) as HTMLElement;
      clonedElement.id = 'monthly-shift-scheduler-container-clone';

      // Ensure the clone is positioned off-screen to prevent visual disruption, but correctly laid out by the browser
      clonedElement.style.position = 'absolute';
      clonedElement.style.top = '0';
      clonedElement.style.left = '0';
      clonedElement.style.zIndex = '-99999';
      clonedElement.style.opacity = '1'; // Solid opacity so that html2canvas renders it fully bright and solid
      clonedElement.style.visibility = 'visible';
      clonedElement.style.pointerEvents = 'none';
      clonedElement.style.transform = 'none';
      
      // 2. Explicitly force this off-screen cloned container to adopt a fixed, uncompressed width of exactly 1510px
      clonedElement.style.width = '1510px';
      clonedElement.style.maxWidth = '1510px';
      clonedElement.style.minWidth = '1510px';
      clonedElement.style.overflow = 'visible';
      clonedElement.style.boxSizing = 'border-box';
      clonedElement.style.backgroundColor = '#ffffff';

      // Locate and style table/scroll wrappers inside the clone
      const clonedScrollContainer = clonedElement.querySelector('#roster-scroll-container') as HTMLElement | null;
      if (clonedScrollContainer) {
        clonedScrollContainer.style.overflowX = 'visible';
        clonedScrollContainer.style.overflowY = 'visible';
        clonedScrollContainer.style.width = '1510px';
        clonedScrollContainer.style.maxWidth = '1510px';
        clonedScrollContainer.style.minWidth = '1510px';
        clonedScrollContainer.scrollLeft = 0;
      }

      const clonedTable = clonedElement.querySelector('table') as HTMLTableElement | null;
      if (clonedTable) {
        clonedTable.style.width = '1510px';
        clonedTable.style.minWidth = '1510px';
        clonedTable.style.maxWidth = '1510px';
        clonedTable.style.tableLayout = 'fixed';
      }

      // Ensure the beautifully styled print-only header cap is displayed inside the clone
      const clonedPrintHeader = clonedElement.querySelector('.print-header-cap') as HTMLElement | null;
      if (clonedPrintHeader) {
        clonedPrintHeader.style.setProperty('display', 'block', 'important');
        clonedPrintHeader.classList.remove('hidden');
      }

      // Ensure the legend is explicitly styled and made visible in the clone pass
      const legendElement = clonedElement.querySelector('#monthly-shift-legend') as HTMLElement | null;
      if (legendElement) {
        legendElement.style.setProperty('display', 'flex', 'important');
        legendElement.style.setProperty('margin-top', '20px', 'important');
        legendElement.style.setProperty('width', '100%', 'important');
        legendElement.style.setProperty('opacity', '1', 'important');
        legendElement.style.setProperty('visibility', 'visible', 'important');
        legendElement.style.setProperty('background-color', '#f8fafc', 'important');
      }

      // 3. Automatically look inside the cloned container and strip away/hide any non-essential management elements,
      // action buttons, or active dropdowns (button, select, .no-print, .print:hidden) so they do not clutter the final clean output.
      const nonEssentialElements = clonedElement.querySelectorAll(
        'button, select, .no-print, .print\\:hidden:not(#monthly-shift-legend), [class*="print:hidden"]:not(#monthly-shift-legend), #header-operations-bar'
      );
      nonEssentialElements.forEach(el => {
        (el as HTMLElement).style.setProperty('display', 'none', 'important');
      });

      // Append clone to body to let html2canvas render it accurately
      document.body.appendChild(clonedElement);

      // Sanitize the cloned element and all descendants by converting computed oklch colors to inline style HSL/RGB overrides
      try {
        const allCloneElements = clonedElement.querySelectorAll('*');
        const processElement = (el: HTMLElement) => {
          // Normalize sticky positions for html2canvas export to prevent alignment gaps, overlapping, or clipping
          if (el.classList && (el.classList.contains('sticky') || el.classList.contains('sticky-left-0'))) {
            el.style.setProperty('position', 'static', 'important');
            el.style.setProperty('left', 'auto', 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
            el.style.setProperty('opacity', '1', 'important');
            el.style.setProperty('background-color', el.tagName === 'TH' ? '#f1f5f9' : '#ffffff', 'important');
          }

          if (el.className && typeof el.className === 'string' && el.className.includes('sticky')) {
            el.style.setProperty('position', 'static', 'important');
            el.style.setProperty('left', 'auto', 'important');
            el.style.setProperty('box-shadow', 'none', 'important');
            el.style.setProperty('opacity', '1', 'important');
          }

          if (el.tagName === 'TD' || el.tagName === 'TH') {
            el.style.setProperty('display', 'table-cell', 'important');
            el.style.setProperty('border-color', '#cbd5e1', 'important'); // Force visible high-contrast gray borders
          }

          // Detect if this element is inside the first TD (the "Guard & Station Badge" column) or the first TH
          const tdNode = el.closest('td');
          const isFirstTd = tdNode && tdNode.parentElement?.firstElementChild === tdNode;
          const thNode = el.closest('th');
          const isFirstTh = thNode && thNode.parentElement?.firstElementChild === thNode;

          if (isFirstTd || isFirstTh) {
            el.style.setProperty('opacity', '1', 'important');
            el.style.setProperty('visibility', 'visible', 'important');
            el.style.setProperty('overflow', 'visible', 'important');
            el.style.setProperty('white-space', 'normal', 'important');
            el.style.setProperty('text-overflow', 'clip', 'important');
            el.style.setProperty('color', '#0f172a', 'important'); // Force Solid Slate-900 Dark Color
            el.style.setProperty('font-weight', '700', 'important'); // Bold text
          }

          // Target guard identity nodes (Guard, Badge, and Station text blocks) to force dark contrast and bold lettering
          if (el.innerText && (
            el.innerText.toUpperCase().includes('GUARD') || 
            el.innerText.toUpperCase().includes('STATION') || 
            el.innerText.toUpperCase().includes('BADGE') ||
            el.classList.contains('font-medium') || 
            el.classList.contains('text-[9px]') || 
            el.classList.contains('text-xs') ||
            el.classList.contains('text-slate-900') ||
            el.classList.contains('text-gray-900') ||
            el.classList.contains('text-gray-800') ||
            el.classList.contains('font-mono')
          )) {
            el.style.color = '#0f172a'; // Force deep slate-900 dark text color
            el.style.fontWeight = '700'; // Set to bold text to stop clipping and faint printing
            el.style.opacity = '1'; // Bypass any faint opacity layers
            el.style.visibility = 'visible';
          }

          // 🔍 BUG 1 FIX: FORCE ABSOLUTE READABILITY ON GUARD NAMES & BADGES
          // Targets the column structures containing names/IDs and forces solid color
          if (el.classList.contains('text-slate-900') || el.classList.contains('font-medium') || el.tagName === 'SPAN' || el.tagName === 'DIV') {
            // If the element belongs to the left column text groupings, make it crisp and dark
            if (el.closest('.w-48') || el.closest('.sticky') || el.className?.toString().includes('sticky') || isFirstTd) {
              el.style.setProperty('color', '#0f172a', 'important'); // Force Solid Slate-900 Dark Color
              el.style.setProperty('font-weight', '700', 'important'); // Bold text
              el.style.setProperty('opacity', '1', 'important'); // Strip away faint opacity transparent layers
              el.style.setProperty('overflow', 'visible', 'important');
              el.style.setProperty('white-space', 'normal', 'important');
            }
          }

          // Force legend text indicators at the bottom to be dark and clear
          if (el.innerText && (el.innerText.includes('Shift') || el.innerText.includes('Holiday') || el.innerText.includes('Duty'))) {
            el.style.setProperty('color', '#1e293b', 'important');
            el.style.setProperty('font-weight', '700', 'important');
          }

          // Class-specific hardcoded replacements as a safety layer for primary colors
          if (el.classList) {
            // Day Shift Cells (D) which use bg-blue-50 text-blue-700
            if (el.classList.contains('bg-blue-50') && el.classList.contains('text-blue-700')) {
              el.style.backgroundColor = '#eff6ff';
              el.style.color = '#1d4ed8';
              el.style.borderColor = '#bfdbfe';
              el.style.fontWeight = 'bold';
            }
            // Night Shift Cells (N) which use bg-blue-900 text-blue-100
            else if (el.classList.contains('bg-blue-900')) {
              el.style.backgroundColor = '#1e3a8a';
              el.style.color = '#ffffff';
              el.style.fontWeight = 'bold';
            }
            // Leave / Sick Cells (X) which use bg-rose-50 text-rose-700
            else if (el.classList.contains('bg-rose-50') && el.classList.contains('text-rose-700')) {
              el.style.backgroundColor = '#fff1f2';
              el.style.color = '#be123c';
              el.style.borderColor = '#fecdd3';
              el.style.fontWeight = 'bold';
            }
            // Public Holiday Cells (PH) which use bg-red-600 text-white
            else if (el.classList.contains('bg-red-600')) {
              el.style.backgroundColor = '#dc2626';
              el.style.color = '#ffffff';
              el.style.fontWeight = '900';
            }
            // Default Off-Duty / Empty cells (which use text-gray-400 or other text classes)
            else if (el.tagName === 'TD' && el.textContent?.trim() === 'O') {
              el.style.backgroundColor = '#ffffff';
              el.style.color = '#64748b'; // beautiful, readable slate gray
              el.style.fontWeight = 'bold';
            }
            // Employee name headers text (which may use text-gray-900/text-slate-900)
            if (el.classList.contains('text-gray-900') || el.classList.contains('text-slate-900')) {
              el.style.color = '#0f172a'; // Clear slate-900 text
              el.style.fontWeight = '700'; // Make key names/headers extra bold for print
            }
            // Weekend highlight columns background
            if (el.classList.contains('bg-orange-50/50') || el.classList.contains('bg-orange-50/20')) {
              el.style.backgroundColor = '#fff7ed';
            }
            // Holiday background
            if (el.classList.contains('bg-red-50/70')) {
              el.style.backgroundColor = '#fef2f2';
            }
            // Hours badges
            if (el.classList.contains('bg-indigo-100')) {
              el.style.backgroundColor = '#e0e7ff';
              el.style.color = '#3730a3';
              el.style.fontWeight = 'bold';
            } else if (el.classList.contains('bg-emerald-100')) {
              el.style.backgroundColor = '#d1fae5';
              el.style.color = '#065f46';
              el.style.fontWeight = 'bold';
            } else if (el.classList.contains('bg-blue-50') && !el.classList.contains('text-blue-700')) {
              // Employee initial circle
              el.style.backgroundColor = '#eff6ff';
              el.style.color = '#185fa5';
            }

            // Explicitly map high-contrast hex code backgrounds to replace Tailwind v4 oklch as specified by user
            if (el.classList.contains('bg-blue-600')) {
              el.style.backgroundColor = '#1d4ed8'; 
              el.style.color = '#ffffff'; 
            } else if (el.classList.contains('bg-slate-800')) {
              el.style.backgroundColor = '#0f172a'; 
              el.style.color = '#ffffff'; 
            } else if (el.classList.contains('bg-blue-100')) {
              el.style.backgroundColor = '#bfdbfe'; 
              el.style.color = '#1e3a8a';
            } else if (el.classList.contains('bg-rose-500')) {
              el.style.backgroundColor = '#be123c'; 
              el.style.color = '#ffffff';
            } else if (el.classList.contains('bg-amber-50')) {
              el.style.backgroundColor = '#fef3c7'; 
              el.style.color = '#78350f';
            }

            // Station/Site badge specific classes inside cell
            if (el.classList.contains('bg-[#185FA5]/10') || el.className?.toString().includes('bg-[#185FA5]/10')) {
              el.style.backgroundColor = '#e0f2fe';
              el.style.color = '#0369a1';
              el.style.fontWeight = 'bold';
            }
          }

          if (el.tagName === 'TH' || el.tagName === 'TD') {
            el.style.borderColor = '#cbd5e1'; // Force high quality visible gray borders instead of invisible oklch/transparent borders
          }

          try {
            const computed = window.getComputedStyle(el);
            if (computed.backgroundColor && (computed.backgroundColor.includes('oklch') || computed.backgroundColor.includes('oklab'))) {
              el.style.backgroundColor = convertCSSOklchToHsl(computed.backgroundColor);
            }
            if (computed.color && (computed.color.includes('oklch') || computed.color.includes('oklab'))) {
              el.style.color = convertCSSOklchToHsl(computed.color);
            }
            if (computed.borderColor && (computed.borderColor.includes('oklch') || computed.borderColor.includes('oklab'))) {
              el.style.borderColor = convertCSSOklchToHsl(computed.borderColor);
            }
            if (computed.borderLeftColor && (computed.borderLeftColor.includes('oklch') || computed.borderLeftColor.includes('oklab'))) {
              el.style.borderLeftColor = convertCSSOklchToHsl(computed.borderLeftColor);
            }
            if (computed.borderRightColor && (computed.borderRightColor.includes('oklch') || computed.borderRightColor.includes('oklab'))) {
              el.style.borderRightColor = convertCSSOklchToHsl(computed.borderRightColor);
            }
            if (computed.borderTopColor && (computed.borderTopColor.includes('oklch') || computed.borderTopColor.includes('oklab'))) {
              el.style.borderTopColor = convertCSSOklchToHsl(computed.borderTopColor);
            }
            if (computed.borderBottomColor && (computed.borderBottomColor.includes('oklch') || computed.borderBottomColor.includes('oklab'))) {
              el.style.borderBottomColor = convertCSSOklchToHsl(computed.borderBottomColor);
            }
          } catch (styleErr) {
            // Ignore style processing error
          }
        };

        processElement(clonedElement);
        allCloneElements.forEach(node => {
          processElement(node as HTMLElement);
        });
      } catch (err) {
        console.warn('DOM oklch inline override failed:', err);
      }

      // Wait a tiny bit for the rendering layout of the cloned elements to settle
      await new Promise(resolve => setTimeout(resolve, 150));

      // 4. Render the high-resolution snapshot using html2canvas with scale: 2 and width: 1510
      const canvas = await html2canvas(clonedElement, {
        scale: 2, // Keeps text razor-sharp
        useCORS: true,
        allowTaint: false, // Ensures canvas is not tainted, allowing toDataURL/toBlob to work perfectly
        backgroundColor: '#ffffff',
        logging: false,
        width: 1510,
        windowWidth: 1510,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          // Double-check and re-sanitize any remaining oklch/oklab values inside the html2canvas cloned document
          try {
            const elements = clonedDoc.querySelectorAll('*');
            elements.forEach(node => {
              const el = node as HTMLElement;
              if (el.style) {
                if (el.style.backgroundColor && (el.style.backgroundColor.includes('oklch') || el.style.backgroundColor.includes('oklab'))) {
                  el.style.backgroundColor = convertCSSOklchToHsl(el.style.backgroundColor);
                }
                if (el.style.color && (el.style.color.includes('oklch') || el.style.color.includes('oklab'))) {
                  el.style.color = convertCSSOklchToHsl(el.style.color);
                }
                if (el.style.borderColor && (el.style.borderColor.includes('oklch') || el.style.borderColor.includes('oklab'))) {
                  el.style.borderColor = convertCSSOklchToHsl(el.style.borderColor);
                }
                if (el.style.borderLeftColor && (el.style.borderLeftColor.includes('oklch') || el.style.borderLeftColor.includes('oklab'))) {
                  el.style.borderLeftColor = convertCSSOklchToHsl(el.style.borderLeftColor);
                }
                if (el.style.borderRightColor && (el.style.borderRightColor.includes('oklch') || el.style.borderRightColor.includes('oklab'))) {
                  el.style.borderRightColor = convertCSSOklchToHsl(el.style.borderRightColor);
                }
                if (el.style.borderTopColor && (el.style.borderTopColor.includes('oklch') || el.style.borderTopColor.includes('oklab'))) {
                  el.style.borderTopColor = convertCSSOklchToHsl(el.style.borderTopColor);
                }
                if (el.style.borderBottomColor && (el.style.borderBottomColor.includes('oklch') || el.style.borderBottomColor.includes('oklab'))) {
                  el.style.borderBottomColor = convertCSSOklchToHsl(el.style.borderBottomColor);
                }
              }
            });
          } catch (err) {
            // Ignore
          }
        }
      });

      // 6. Trigger the automatic browser download of the crisp, uncompressed layout as a PNG file.
      const activeSite = sites.find(s => s.id === selectedSiteId);
      const siteName = activeSite ? activeSite.name.replace(/\s+/g, '_') : 'All_Sites';
      const fileName = `ShiftWise_Roster_${siteName}_${currentMonth}.png`;

      if (canvas.toBlob) {
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = fileName;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            }, 150);
          } else {
            // Fallback to dataURL if blob failed
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = fileName;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }, 'image/png');
      } else {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Failed to capture roster canvas:', err);
      alert('Failed to generate high-resolution image. Please try using the Print / PDF option.');
    } finally {
      // 5. Clean up and remove the off-screen temporary clone immediately from the document body
      if (clonedElement && clonedElement.parentNode) {
        clonedElement.parentNode.removeChild(clonedElement);
      }

      // Restore original stylesheets and remove temporary ones
      originalStylesheets.forEach(item => {
        try {
          if (item.parent) {
            item.parent.insertBefore(item.element, item.nextSibling);
          }
          item.element.disabled = false;
        } catch (e) {
          // Ignore
        }
      });
      tempStyleElements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
      });

      setIsExportingImage(false);
    }
  };

  // Action: Export CSV
  const exportToCSV = () => {
    if (activeEmployees.length === 0) return;
    
    const headers = ["Employee Name", "Badge", "Role", "Total Hours"];
    calendarDays.forEach(cd => {
      headers.push(`${cd.dayNum} (${cd.dayLabel})`);
    });
    
    const rows = [headers];
    
    activeEmployees.forEach(emp => {
      const r = rosters[emp.id];
      const totalHours = computeEmployeeHours(emp.id);
      
      const empRow = [
        emp.name,
        emp.badge,
        emp.role,
        `${totalHours}h`
      ];
      
      calendarDays.forEach(cd => {
        let sc = r?.shifts?.[String(cd.dayNum)];
        if (cd.isHoliday) sc = 'PH';
        else if (!sc) sc = 'O';
        empRow.push(sc);
      });
      
      rows.push(empRow);
    });
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    const activeSite = sites.find(s => s.id === selectedSiteId);
    const siteName = activeSite ? activeSite.name.replace(/\s+/g, '_') : 'All_Sites';
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ShiftWise_Roster_${siteName}_${currentMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Action: Share Site via WhatsApp
  const handleShareSiteWhatsApp = () => {
    if (activeEmployees.length === 0) return;
    
    const activeSite = sites.find(s => s.id === selectedSiteId);
    const siteLabel = activeSite ? `${activeSite.name} (${activeSite.location || 'Namibia'})` : 'All Active Sites';
    const formattedDate = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    let text = `🇳🇦 *SHIFTWISE NAMIBIA - SHIFT ROTATION SCHEDULE*\n`;
    text += `📅 *Month:* ${formattedDate}\n`;
    text += `📍 *Site/Station:* ${siteLabel}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    activeEmployees.forEach((emp, index) => {
      const r = rosters[emp.id];
      let rowShifts = "";
      
      calendarDays.forEach(cd => {
        let sc = r?.shifts?.[String(cd.dayNum)];
        if (cd.isHoliday) sc = 'PH';
        else if (!sc) sc = 'O';
        
        // Show scheduled days to prevent huge messages, only display non-Off days
        if (sc !== 'O') {
          rowShifts += `${cd.dayNum}:${sc}  `;
        }
      });
      
      const totalHours = computeEmployeeHours(emp.id);
      text += `*${index + 1}. ${emp.name}* (${emp.badge} | ${emp.role})\n`;
      text += `↳ Duties Scheduled: ${rowShifts || 'None (Off Duty Month)'}\n`;
      text += `↳ Hours Scheduled: ${totalHours} hours\n\n`;
    });
    
    text += `💡 *SHIFT LEGEND FOR WORKERS:*\n`;
    text += `☀️ *D* = Day Shift (12 hrs) [06:00 - 18:00]\n`;
    text += `🌙 *N* = Night Shift (12 hrs) [18:00 - 06:00]\n`;
    text += `😴 *O* = Off Duty (Rest Day)\n`;
    text += `🩺 *X* = Leave / Medical Sick Leave\n`;
    text += `🇳🇦 *PH* = Paid Namibian Public Holiday Duty (12 hrs)\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `Generated securely with ShiftWise Namibia. Sharp sharp! 🇳🇦`;
    
    setShareTitle('Share Site Roster');
    setShareText(text);
    setTargetPhone('');
    setCopied(false);
    setShowShareModal(true);
  };

  // Action: Share individual Guard shifts via WhatsApp
  const handleShareIndividualWhatsApp = (emp: any) => {
    const r = rosters[emp.id];
    const activeSite = sites.find(s => s.id === emp.site_id);
    const siteLabel = activeSite ? `${activeSite.name} (${activeSite.location || 'Namibia'})` : 'Main Assigned Site';
    const formattedDate = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    let text = `🇳🇦 *SHIFTWISE NAMIBIA - PERSONAL DUTY ROTATION*\n`;
    text += `👤 *Employee:* ${emp.name}\n`;
    text += `🏷️ *Badge Number:* ${emp.badge} | *Role:* ${emp.role}\n`;
    text += `📍 *Deployment Site:* ${siteLabel}\n`;
    text += `📅 *Month:* ${formattedDate}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    text += `Your scheduled active duty shifts for this month:\n`;
    
    let activeShiftsGroup = "";
    let countD = 0;
    let countN = 0;
    let countO = 0;
    let countX = 0;
    let countPH = 0;
    
    calendarDays.forEach(cd => {
      let sc = r?.shifts?.[String(cd.dayNum)];
      if (cd.isHoliday) sc = 'PH';
      else if (!sc) sc = 'O';
      
      if (sc !== 'O') {
        activeShiftsGroup += `• Day ${String(cd.dayNum).padStart(2, '0')} (${cd.dayLabel}): *${sc}* (${sc === 'D' ? 'Day Shift' : sc === 'N' ? 'Night Shift' : sc === 'PH' ? 'Public Holiday Worked' : 'Leave / Sick'})\n`;
      }
      
      if (sc === 'D') countD++;
      else if (sc === 'N') countN++;
      else if (sc === 'X') countX++;
      else if (sc === 'PH') countPH++;
      else countO++;
    });
    
    text += activeShiftsGroup || '• No active duty shifts assigned yet. Enjoy off-time!\n';
    text += `\n━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *SUMMARY STATISTICS:*\n`;
    text += `☀️ Day Shifts (12h): ${countD}\n`;
    text += `🌙 Night Shifts (12h): ${countN}\n`;
    text += `🇳🇦 Public Holidays (PH): ${countPH}\n`;
    text += `😴 Off-Duty Days: ${countO}\n`;
    text += `🩺 Leave/Sick: ${countX}\n`;
    text += `⏱️ Target Hours: ${computeEmployeeHours(emp.id)}h\n\n`;
    
    text += `💡 *SHIFT CODE DEFINITIONS:*\n`;
    text += `☀️ *D* = Day Shift (12 hrs) [06:00 - 18:00]\n`;
    text += `🌙 *N* = Night Shift (12 hrs) [18:00 - 06:00]\n`;
    text += `😴 *O* = Off Duty (Rest Day)\n`;
    text += `🩺 *X* = Leave / Medical Sick Leave\n`;
    text += `🇳🇦 *PH* = Paid Namibian Public Holiday Duty (12 hrs)\n`;
    text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `Please report any overlap issues immediately. Sharp sharp! 🇳🇦`;
    
    setShareTitle(`Share Schedule with ${emp.name}`);
    setShareText(text);
    setTargetPhone(emp.phone || '');
    setCopied(false);
    setShowShareModal(true);
  };

  return (
    <div id="monthly-shift-scheduler-container" className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      
      {/* Inject print layout specifications directly */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          @page {
            size: landscape;
            margin: 0.5cm;
          }
          .overflow-x-auto {
            overflow: visible !important;
            width: 1510px !important;
            max-width: none !important;
          }
          table {
            width: 1510px !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          th, td {
            padding: 4px 2px !important;
            font-size: 8px !important;
            border: 1px solid #cbd5e1 !important;
            text-align: center !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          th.sticky, td.sticky {
            position: static !important;
            background: #f8fafc !important;
            box-shadow: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Precise display style retention for printed pages */
          .bg-blue-50 {
            background-color: #eff6ff !important;
            color: #1d4ed8 !important;
            border: 1px solid #bfdbfe !important;
            font-weight: bold !important;
          }
          .bg-blue-900 {
            background-color: #1e3a8a !important;
            color: #ffffff !important;
            font-weight: bold !important;
          }
          .bg-rose-50 {
            background-color: #fff1f2 !important;
            color: #be123c !important;
            border: 1px solid #fecdd3 !important;
            font-weight: bold !important;
          }
          .bg-red-600 {
            background-color: #dc2626 !important;
            color: #ffffff !important;
            font-weight: 900 !important;
          }
          .bg-orange-50\\/50, .bg-orange-50\\/20 {
            background-color: #fff7ed !important;
          }
          .bg-red-50\\/70 {
            background-color: #fef2f2 !important;
          }
        }
      `}</style>

      {/* Print-only beautifully styled Header */}
      <div className="hidden print:block print-header-cap mb-6 text-center border-b border-gray-200 pb-4 p-4">
        <h1 className="text-xl font-black text-[#185FA5] uppercase tracking-wider">
          ShiftWise Namibia 🇳🇦 — Guard Deployment Roster
        </h1>
        <p className="text-sm font-bold text-gray-700 mt-1">
          📍 Site Station: {sites.find(s => s.id === selectedSiteId)?.name || 'All Active Sites'} | 📅 Billing Month: {new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </p>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
          CONFIDENTIAL • OPERAL WORKFORCE SCHEDULE • COMPILED ON: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Header operations */}
      <div id="header-operations-bar" className="p-4 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h3 className="font-bold text-gray-900 tracking-tight text-base flex items-center gap-2">
            Monthly Shift Scheduler
          </h3>
          <p className="text-xs text-gray-500">
            Click any regular day cell to cycle: <span className="font-semibold text-blue-700">Day (D)</span> → <span className="font-semibold text-blue-900">Night (N)</span> → <span className="font-semibold text-gray-500">Off (O)</span> → <span className="font-semibold text-rose-600">Leave/Sick (X)</span>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full md:w-auto items-stretch sm:items-center justify-start md:justify-end">
          <button
            onClick={executeAutoFill}
            disabled={activeEmployees.length === 0}
            className="w-full sm:w-auto bg-[#185FA5] hover:bg-blue-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 shadow-xs active:scale-95 duration-150 shrink-0"
            title="Staggered rotation auto-fill (D, D, N, N, O, O)"
          >
            <Sparkles className="h-4 w-4 animate-pulse" />
            Staggered Auto-Fill
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={activeEmployees.length === 0 || isExportingImage}
            className="w-full sm:w-auto bg-[#185FA5]/10 hover:bg-[#185FA5]/20 text-[#185FA5] border border-[#185FA5]/25 font-bold text-xs px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
            title="Download high-resolution roster image (PNG) for sharing or posting"
          >
            <Image className="h-4 w-4 text-[#185FA5]" />
            {isExportingImage ? 'Generating...' : 'Download Image'}
          </button>

          <button
            onClick={exportToCSV}
            disabled={activeEmployees.length === 0}
            className="w-full sm:w-auto border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-xs px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40"
            title="Download CSV worksheet"
          >
            <Download className="h-4 w-4 text-gray-500" />
            Excel / CSV
          </button>
          
          <button
            onClick={executeClearAll}
            disabled={activeEmployees.length === 0}
            className="w-full sm:w-auto border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-xs px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Clear Month
          </button>
        </div>
      </div>

      {/* Grid container with custom scroll styling */}
      <div id="roster-scroll-container" className="overflow-x-auto">
        {activeEmployees.length === 0 ? (
          <div className="py-12 text-center print:hidden">
            <HelpCircle className="mx-auto h-12 w-12 text-gray-300" />
            <h4 className="mt-2 text-sm font-bold text-gray-900">No Guards Registered</h4>
            <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
              Please go to the <strong>Employee Registry</strong> tab to add your security guards or workforce members first.
            </p>
          </div>
        ) : (
          <table className="min-w-[1510px] w-full text-left border-collapse table-fixed select-none">
            <thead>
              <tr className="bg-gray-100/50 border-b border-gray-200">
                {/* Employee Info Header Column */}
                <th className="min-w-[210px] max-w-[230px] w-[210px] p-2 text-[11px] font-bold text-gray-700 uppercase tracking-wider sticky left-0 bg-[#f9fafb] z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.03)] border-r border-gray-200">
                  Guard & Station Badge
                </th>
                
                {/* Total scheduled hours indicator */}
                <th className="min-w-[60px] w-[60px] p-2 text-[10px] font-bold text-gray-700 uppercase tracking-wider text-center border-r border-gray-200">
                  Hours
                </th>

                {/* Days of the month columns */}
                {calendarDays.map((cd) => (
                  <th 
                    key={cd.dayNum} 
                    className={`min-w-[40px] p-1 text-center border-r border-gray-200 ${
                      cd.isWeekend ? 'bg-orange-50/50' : ''
                    } ${cd.isHoliday ? 'bg-red-50/70 border-r-red-100' : ''}`}
                    title={cd.isHoliday ? cd.holidayName || "" : ""}
                  >
                    <div className="text-[9px] uppercase font-bold text-gray-400">{cd.dayLabel}</div>
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
                const empSite = sites.find(s => s.id === emp.site_id);
                return (
                  <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50/30 transition group">
                    {/* Sticky Employee Badge cell with WhatsApp integrations */}
                    <td className="p-2.5 font-medium text-gray-800 sticky left-0 bg-white group-hover:bg-gray-50 z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.03)] border-r border-gray-200 select-none">
                      <div className="flex items-center justify-between gap-2 w-full">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-[#185FA5] text-[10px] uppercase shrink-0">
                            {emp.name.slice(0, 2)}
                          </div>
                          <div className="min-w-0 text-left">
                            <div className="text-xs font-bold text-gray-900 group-hover:text-blue-700 transition truncate">{emp.name}</div>
                            <div className="text-[9px] text-gray-500 font-mono tracking-tight font-semibold mt-0.5 flex flex-wrap items-center gap-1">
                              <span className="bg-slate-100 text-slate-800 px-1 py-0.2 rounded text-[8px] font-bold">{emp.badge}</span>
                              <span>•</span>
                              <span className="text-gray-600 font-bold">{emp.role}</span>
                              {empSite && (
                                <>
                                  <span className="text-gray-300">•</span>
                                  <span className="bg-[#185FA5]/10 text-[#185FA5] px-1 py-0.2 rounded text-[8px] font-extrabold flex items-center gap-0.5">
                                    📍 {empSite.name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        

                      </div>
                    </td>

                    {/* Total hours */}
                    <td className="p-2 text-center border-r border-gray-200 font-bold text-xs select-none">
                      <span className={`inline-block px-1 py-0.5 rounded ${
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
                      let badgeText = "O 💤";
                      
                      if (shiftCode === 'D') {
                        bgClass = "bg-blue-50 text-blue-700 font-extrabold hover:bg-blue-100/70";
                        badgeText = "D ☀️";
                      } else if (shiftCode === 'N') {
                        bgClass = "bg-blue-900 text-blue-100 font-extrabold hover:bg-blue-800/90";
                        badgeText = "N 🌙";
                      } else if (shiftCode === 'X') {
                        bgClass = "bg-rose-50 text-rose-700 border border-rose-100 font-bold hover:bg-rose-100/70";
                        badgeText = "X 🏥";
                      } else if (shiftCode === 'PH') {
                        bgClass = "bg-red-600 text-white font-black";
                        badgeText = "PH 🇳🇦";
                      }

                      return (
                        <td 
                          key={cd.dayNum} 
                          onClick={() => handleCellClick(emp.id, cd.dayNum, cd.isHoliday)}
                          className={`p-1 text-center border-r border-gray-150 cursor-pointer transition select-none ${
                            cd.isWeekend && shiftCode === 'O' ? 'bg-orange-50/20' : ''
                          } h-11`}
                        >
                          <div className={`w-full h-full flex items-center justify-center text-[9px] sm:text-[11px] rounded-lg transition-all border border-transparent whitespace-nowrap gap-0.5 px-0.5 ${bgClass}`}>
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
      <div id="monthly-shift-legend" className="p-4 bg-gray-50/50 border-t border-gray-100 flex flex-wrap gap-4 text-xs font-semibold text-gray-600 select-none print:hidden">
        <span className="flex items-center gap-1.5">
          <span className="h-5 w-12 bg-blue-50 border border-blue-100 text-blue-700 rounded flex items-center justify-center font-bold text-[9px] sm:text-[10px] gap-0.5">D ☀️</span>
          Day Shift (12h)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-5 w-12 bg-blue-900 text-blue-100 rounded flex items-center justify-center font-bold text-[9px] sm:text-[10px] gap-0.5">N 🌙</span>
          Night Shift (12h)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-5 w-12 bg-white border border-gray-200 text-gray-400 rounded flex items-center justify-center font-bold text-[9px] sm:text-[10px] gap-0.5">O 💤</span>
          Off Duty
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-5 w-12 bg-rose-50 border border-rose-100 text-rose-700 rounded flex items-center justify-center font-bold text-[9px] sm:text-[10px] gap-0.5">X 🏥</span>
          Leave / Sick
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-5 w-14 bg-red-600 text-white rounded flex items-center justify-center font-bold text-[9px] sm:text-[10px] gap-0.5">PH 🇳🇦</span>
          Namibian Public Holiday (Auto-Locked Paid)
        </span>
      </div>

      {/* WhatsApp Share / Text Review Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh] animate-in fade-in duration-200">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <svg className="h-5 w-5 fill-[#25D366]" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.725 1.451 5.436 0 9.86-4.413 9.863-9.843.002-2.63-1.023-5.101-2.886-6.968C16.486 1.83 14.015.805 11.4.805c-5.441 0-9.865 4.412-9.867 9.842-.001 1.914.498 3.784 1.45 5.385l-.953 3.483 3.567-.926zm13.111-6.702c-.328-.164-1.94-.959-2.24-1.069-.3-.109-.519-.164-.738.164-.219.328-.847 1.069-1.039 1.288-.192.192-.384.219-.712.055-.327-.164-1.385-.511-2.639-1.631-.975-.87-1.633-1.944-1.824-2.272-.192-.328-.021-.505.143-.668.148-.147.328-.384.493-.575.164-.191.219-.328.328-.547.11-.219.055-.411-.027-.575-.082-.164-.738-1.777-1.012-2.434-.267-.641-.56-.553-.768-.564-.199-.011-.427-.013-.656-.013-.229 0-.601.086-.915.424-.315.337-1.202 1.176-1.202 2.868 0 1.691 1.233 3.322 1.405 3.551.173.229 2.427 3.705 5.877 5.196.82.355 1.46.568 1.96.727.824.262 1.574.225 2.167.137.66-.098 1.94-.794 2.214-1.52.274-.727.274-1.348.192-1.488-.082-.14-.3-.219-.628-.383z" />
                </svg>
                {shareTitle}
              </h4>
              <button 
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-650 text-xl font-bold px-2 py-1 cursor-pointer"
              >
                ×
              </button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">WhatsApp Content Preview</label>
                <textarea
                  readOnly
                  value={shareText}
                  className="w-full h-56 text-xs font-mono p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 select-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Recipient Phone Number (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. +264812345678"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#25D366] font-mono bg-white"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 font-medium italic">Use country directory code (e.g. +264 for Namibia). Leaving it blank allows general sharing to group/chat.</p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareText);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  } catch (err) {
                    console.error("Clipboard copy error:", err);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  copied 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy Schedule Text"}
              </button>

              <button
                onClick={() => {
                  let sanitizedPhone = targetPhone.replace(/[^0-9+]/g, '');
                  if (sanitizedPhone && !sanitizedPhone.startsWith('+') && !sanitizedPhone.startsWith('00')) {
                    if (sanitizedPhone.startsWith('0')) {
                      sanitizedPhone = '+264' + sanitizedPhone.slice(1);
                    } else if (sanitizedPhone.length === 9) {
                      sanitizedPhone = '+264' + sanitizedPhone;
                    }
                  }
                  
                  const waUrl = sanitizedPhone
                    ? `https://api.whatsapp.com/send?phone=${encodeURIComponent(sanitizedPhone)}&text=${encodeURIComponent(shareText)}`
                    : `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
                  
                  window.open(waUrl, '_blank');
                }}
                className="bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <ExternalLink className="h-4 w-4" />
                Open WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
