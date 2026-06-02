import React, { useState } from 'react';
import { useApp, AppProvider } from './context/AppContext';
import Login from './pages/Login';
import Register from './pages/Register';

// Component layout tabs
import Dashboard from './components/Dashboard';
import RosterGrid from './components/RosterGrid';
import EmployeeManager from './components/EmployeeManager';
import PayrollCalculator from './components/PayrollCalculator';
import Settings from './components/Settings';
import AIAssistant from './components/AIAssistant';

import { 
  Bot, LayoutDashboard, Calendar, Users, DollarSign, Settings as SettingsIcon, 
  MapPin, LogOut, Bell, Flame, Shield, Briefcase 
} from 'lucide-react';

function DashboardShell() {
  const { 
    user, 
    company, 
    logout, 
    notifications, 
    dismissNotification, 
    currentMonth, 
    setCurrentMonth, 
    sites, 
    selectedSiteId, 
    setSelectedSiteId 
  } = useApp();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [unreadCount, setUnreadCount] = useState(notifications.length);

  // Month select options helper
  const monthOptions = [
    { value: "2026-06", label: "June 2026" },
    { value: "2026-07", label: "July 2026" },
    { value: "2026-08", label: "August 2026" },
    { value: "2026-09", label: "September 2026" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans select-none overflow-x-hidden">
      
      {/* Top Professional Header Bar */}
      <header className="bg-white border-b border-gray-150 sticky top-0 z-30 shadow-xs px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Platform Label */}
          <div className="flex items-center space-x-3 shrink-0">
            <div className="h-10 w-10 bg-[#185FA5] text-white rounded-xl flex items-center justify-center font-black shadow-md border border-blue-500/20">
              SW
            </div>
            <div>
              <span className="font-extrabold text-[#185FA5] tracking-tight text-sm sm:text-base flex items-center gap-1">
                ShiftWise Namibia <span className="text-sm select-none">🇳🇦</span>
              </span>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{company?.name || "Corporate Admin"}</p>
            </div>
          </div>

          {/* Center Filtering Tools */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Deployment Site Filter */}
            <div className="flex items-center space-x-1 border border-gray-200 bg-gray-50 rounded-xl px-2.5 py-1.5 focus-within:border-blue-700 transition">
              <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                className="text-xs bg-transparent border-none p-0 focus:ring-0 text-gray-700 font-bold focus:outline-none"
              >
                <option value="">All Stations / Sites</option>
                {sites.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Shift Month Selector */}
            <div className="flex items-center space-x-1 border border-gray-200 bg-gray-50 rounded-xl px-2.5 py-1.5 focus-within:border-blue-700 transition">
              <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                className="text-xs bg-transparent border-none p-0 focus:ring-0 text-gray-700 font-bold focus:outline-none"
              >
                {monthOptions.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Right hand metadata tools */}
          <div className="flex items-center space-x-4 shrink-0">
            {/* Quick in-app notification count */}
            <div className="relative group">
              <button 
                onClick={() => setUnreadCount(0)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition relative cursor-pointer"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-[#25D366] rounded-full border-2 border-white"></span>
                )}
              </button>
              
              {/* Notifications Dropdown Drawer */}
              <div className="absolute right-0 mt-2 bg-white w-72 rounded-2xl border border-gray-150 shadow-lg p-4 invisible group-hover:visible group-focus-within:visible duration-200 transition opacity-0 group-hover:opacity-100 z-50">
                <div className="font-bold text-xs text-gray-800 tracking-wider uppercase mb-2">Live Notifications</div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-[10px] text-gray-400 py-3 text-center">No alerts. ShiftWise is optimized!</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="p-2 border border-gray-100 rounded-lg text-[10px] text-gray-600 relative">
                        <p className="font-semibold text-gray-800 pr-4">{n.message}</p>
                        <p className="text-[8px] text-gray-400 mt-1">{new Date(n.timestamp).toLocaleTimeString()}</p>
                        <button 
                          onClick={() => dismissNotification(n.id)}
                          className="absolute right-1 top-1 text-gray-300 hover:text-gray-500 p-0.5"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* User Account / Logo detail */}
            <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
              <div className="hidden lg:block text-right">
                <span className="text-xs font-extrabold text-gray-800 block truncate max-w-[120px]">{user?.email?.split('@')[0]}</span>
                <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold mt-0.5 inline-block uppercase">Superv. Auth</span>
              </div>
              <button
                onClick={logout}
                className="p-2 bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-500 rounded-xl transition cursor-pointer"
                title="Log out from dashboard"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>

          </div>

        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">

        {/* Mobile Filter Assist Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 md:hidden bg-white p-3 border border-gray-100 rounded-2xl">
          <div className="flex items-center space-x-2 border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 flex-1">
            <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="text-xs bg-transparent border-none p-0 focus:ring-0 text-gray-800 font-bold focus:outline-none w-full"
            >
              <option value="">All Deployment Sites</option>
              {sites.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 border border-gray-100 bg-gray-50 rounded-xl px-3 py-2 flex-1">
            <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="text-xs bg-transparent border-none p-0 focus:ring-0 text-gray-800 font-bold focus:outline-none w-full"
            >
              {monthOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Secondary Navigation Menu Tabs */}
        <div className="bg-white border border-gray-150 p-2.5 rounded-2xl flex flex-nowrap overflow-x-auto gap-1 scrollbar-none items-center shadow-xs">
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer flex items-center gap-2 ${
              activeTab === 'dashboard' 
                ? 'bg-blue-50 text-[#185FA5]' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Cockpit Panel
          </button>

          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer flex items-center gap-2 ${
              activeTab === 'roster' 
                ? 'bg-blue-50 text-[#185FA5]' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Calendar className="h-4 w-4" />
            Shift Scheduler
          </button>

          <button
            onClick={() => setActiveTab('employees')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer flex items-center gap-2 ${
              activeTab === 'employees' 
                ? 'bg-blue-50 text-[#185FA5]' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <Users className="h-4 w-4" />
            Guard Registry
          </button>

          <button
            onClick={() => setActiveTab('payroll')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer flex items-center gap-2 ${
              activeTab === 'payroll' 
                ? 'bg-blue-50 text-[#185FA5]' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Payroll Advisory
          </button>

          <button
            onClick={() => setActiveTab('ai_assistant')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer flex items-center gap-2 bg-gradient-to-r from-blue-700/5 to-blue-800/10 border border-blue-500/20 text-[#185FA5] relative`}
          >
            <Bot className="h-4 w-4 text-[#185FA5]" />
            AI Roster Assistant
            <span className="absolute -top-1.5 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition shrink-0 cursor-pointer flex items-center gap-2 ${
              activeTab === 'settings' 
                ? 'bg-blue-50 text-[#185FA5]' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <SettingsIcon className="h-4 w-4" />
            Configurations
          </button>

        </div>

        {/* Dynamic Display Rendering */}
        <main className="transition duration-150">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === 'roster' && <RosterGrid />}
          {activeTab === 'employees' && <EmployeeManager />}
          {activeTab === 'payroll' && <PayrollCalculator />}
          {activeTab === 'ai_assistant' && <AIAssistant />}
          {activeTab === 'settings' && <Settings />}
        </main>

      </div>

      <footer className="bg-white border-t border-gray-150 py-6 text-center text-xs text-gray-400 font-medium">
        <p>© 2026 ShiftWise Namibia Workforce Management Solution.</p>
        <p className="mt-1 text-[10px] text-gray-300">Operational Security Compliance & Payroll Integration — Windhoek, Namibia 🇳🇦</p>
      </footer>

    </div>
  );
}

function MainApp() {
  const { user, isAuthReady } = useApp();
  const [showRegister, setShowRegister] = useState(false);

  // Authentication loading screen
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="h-10 w-10 border-4 border-[#185FA5] border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-gray-500 uppercase tracking-widest animate-pulse">
          Synchronizing ShiftWise Secure DB...
        </p>
      </div>
    );
  }

  // Display authentication if user is not authorized
  if (!user) {
    if (showRegister) {
      return <Register onLoginRedirect={() => setShowRegister(false)} />;
    }
    return <Login onRegisterRedirect={() => setShowRegister(true)} />;
  }

  // App Dashboard Shell workspace
  return <DashboardShell />;
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
