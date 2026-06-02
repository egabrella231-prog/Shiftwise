import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Edit3, Trash2, Shield, Phone, IdCard, DollarSign, MapPin, Users, X, Check } from 'lucide-react';
import { Employee } from '../types';

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120",
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=120",
  "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=120"
];

const ROLES = ["Guard", "Supervisor", "Team Leader", "Control Room", "Armed Response", "K9 Handler"] as const;

export default function EmployeeManager() {
  const { employees, sites, upsertEmployee, removeEmployee, selectedSiteId, upsertSite } = useApp();

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Partial<Employee> | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [badge, setBadge] = useState('');
  const [role, setRole] = useState<Employee['role']>('Guard');
  const [siteId, setSiteId] = useState('');
  const [hourlyRate, setHourlyRate] = useState('32.50'); // standard entry NAD rate for security
  const [photoUrl, setPhotoUrl] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');

  // Quick Site creation states
  const [showQuickSiteForm, setShowQuickSiteForm] = useState(false);
  const [quickSiteName, setQuickSiteName] = useState('');
  const [quickSiteLoc, setQuickSiteLoc] = useState('');

  const activeEmployees = useMemo(() => {
    if (selectedSiteId) {
      return employees.filter(e => e.site_id === selectedSiteId);
    }
    return employees;
  }, [employees, selectedSiteId]);

  const openAddMode = () => {
    setEditingEmp(null);
    setName('');
    setBadge(`SWN-${Math.floor(1000 + Math.random() * 9000)}`);
    setRole('Guard');
    setSiteId(sites[0]?.id || '');
    setHourlyRate('32.50');
    setPhotoUrl(PRESET_AVATARS[0]);
    setPhone('');
    setIdNumber('');
    setShowQuickSiteForm(false);
    setQuickSiteName('');
    setQuickSiteLoc('');
    setIsEditorOpen(true);
  };

  const openEditMode = (emp: Employee) => {
    setEditingEmp(emp);
    setName(emp.name);
    setBadge(emp.badge);
    setRole(emp.role);
    setSiteId(emp.site_id);
    setHourlyRate(String(emp.hourly_rate));
    setPhotoUrl(emp.photo_url || PRESET_AVATARS[0]);
    setPhone(emp.phone || '');
    setIdNumber(emp.id_number || '');
    setShowQuickSiteForm(false);
    setQuickSiteName('');
    setQuickSiteLoc('');
    setIsEditorOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Please specify the Guard's full name!");

    const payload: Partial<Employee> = {
      ...(editingEmp && { id: editingEmp.id }),
      name,
      badge,
      role,
      site_id: siteId,
      hourly_rate: parseFloat(hourlyRate) || 0,
      photo_url: photoUrl,
      phone,
      id_number: idNumber,
      ...(editingEmp && { created_at: editingEmp.created_at })
    };

    await upsertEmployee(payload);
    setIsEditorOpen(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you absolutely sure you want to remove ${name} from active registries? This action will permanently delete their rosters as well!`)) {
      await removeEmployee(id);
    }
  };

  const getSiteName = (sId: string) => {
    const s = sites.find(site => site.id === sId);
    return s ? s.name : "Unassigned Site";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Active Employee Registry</h2>
          <p className="text-xs text-gray-500">Manage work profiles, roles, phone details and hourly payment indexes.</p>
        </div>
        <button
          onClick={openAddMode}
          className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Register New Guard / Staff
        </button>
      </div>

      {activeEmployees.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center shadow-xs">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <h4 className="font-bold text-gray-900 mt-2 text-sm">No Workforce Members Found</h4>
          <p className="text-xs text-gray-500 mt-1">Specify site, register and configure shifts easily.</p>
          <button
            onClick={openAddMode}
            className="mt-4 bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100 transition px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
          >
            Add first guard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeEmployees.map((emp) => (
            <div key={emp.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition overflow-hidden flex flex-col justify-between">
              {/* Profile Card Header */}
              <div className="p-5 flex items-start gap-4">
                <img
                  src={emp.photo_url || PRESET_AVATARS[0]}
                  alt={emp.name}
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 rounded-full object-cover shrink-0 border border-blue-100"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-sm text-gray-900 truncate">{emp.name}</h4>
                    <Shield className="h-3.5 w-3.5 text-blue-700 shrink-0" />
                  </div>
                  <p className="text-[10px] font-mono font-medium text-gray-400 mt-0.5 tracking-tight uppercase">BADGE: {emp.badge}</p>
                  
                  <div className="inline-flex items-center gap-1 bg-blue-50 text-[#185FA5] px-2 py-0.5 rounded-full text-[10px] font-bold mt-1.5">
                    {emp.role}
                  </div>
                </div>
              </div>

              {/* Attributes Checklist */}
              <div className="px-5 pb-5 space-y-2 border-t border-gray-50 pt-4 flex-1">
                <div className="flex items-center text-xs text-gray-600 gap-2">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                  <span className="font-medium truncate">Site: <strong className="text-gray-900">{getSiteName(emp.site_id)}</strong></span>
                </div>
                <div className="flex items-center text-xs text-gray-600 gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                  <span className="font-medium">Rate: <strong className="text-gray-900">N$ {emp.hourly_rate.toFixed(2)}/hr</strong></span>
                </div>
                <div className="flex items-center text-xs text-gray-600 gap-2">
                  <Phone className="h-3.5 w-3.5 text-gray-400" />
                  <span className="font-medium truncate">Phone: <strong className="text-gray-900">{emp.phone || "No phone added"}</strong></span>
                </div>
                <div className="flex items-center text-xs text-gray-600 gap-2">
                  <IdCard className="h-3.5 w-3.5 text-gray-400" />
                  <span className="font-medium">ID Number: <strong className="text-gray-900">{emp.id_number || "Not input"}</strong></span>
                </div>
              </div>

              {/* Action Buttons footer */}
              <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => openEditMode(emp)}
                  className="flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-800 font-bold transition cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit details
                </button>
                <button
                  onClick={() => handleDelete(emp.id, emp.name)}
                  className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-bold transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal Sheet */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-lg rounded-2xl border border-gray-100 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-[#185FA5] text-white p-4 flex items-center justify-between">
              <h3 className="font-bold tracking-tight text-base">{editingEmp ? `Edit Profile Data` : `Add Guard to roster`}</h3>
              <button onClick={() => setIsEditorOpen(false)} className="text-white hover:opacity-80 transition p-1 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Guards Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Samuel Shivute"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-700 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Badge ID</label>
                  <input
                    type="text"
                    required
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g. SWN-5621"
                    className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-700 transition font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Employment Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-700 bg-white transition"
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Deployment Site</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickSiteForm(!showQuickSiteForm)}
                      className="text-[10px] text-blue-700 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      {showQuickSiteForm ? "Cancel New" : "+ Register Site"}
                    </button>
                  </div>
                  {showQuickSiteForm ? (
                    <div className="bg-blue-50/50 border border-blue-100 p-2.5 rounded-xl space-y-2">
                      <div className="text-[9px] font-bold text-[#185FA5] uppercase tracking-wider">Quick Add Site</div>
                      <input
                        type="text"
                        placeholder="Site Name (e.g. Grove Mall)"
                        value={quickSiteName}
                        onChange={(e) => setQuickSiteName(e.target.value)}
                        className="w-full text-xs border border-gray-100 rounded-lg px-2 py-1.5 focus:outline-none bg-white font-medium"
                      />
                      <input
                        type="text"
                        placeholder="Location (e.g. Windhoek)"
                        value={quickSiteLoc}
                        onChange={(e) => setQuickSiteLoc(e.target.value)}
                        className="w-full text-xs border border-gray-100 rounded-lg px-2 py-1.5 focus:outline-none bg-white font-medium"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          if (!quickSiteName.trim()) {
                            alert("Please specify the Site Name first!");
                            return;
                          }
                          const newId = "site_" + Date.now().toString();
                          await upsertSite({
                            id: newId,
                            name: quickSiteName.trim(),
                            location: quickSiteLoc.trim()
                          });
                          setSiteId(newId);
                          setQuickSiteName('');
                          setQuickSiteLoc('');
                          setShowQuickSiteForm(false);
                        }}
                        className="w-full bg-[#185FA5] hover:bg-blue-800 text-white font-bold text-[10px] py-1.5 rounded-lg transition"
                      >
                        Create & Select
                      </button>
                    </div>
                  ) : (
                    <select
                      value={siteId}
                      onChange={(e) => setSiteId(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-700 bg-white transition"
                      required
                    >
                      <option value="">-- Choose site --</option>
                      {sites.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.location || 'Namibia'})</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Hourly rate (NAD / N$)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">N$</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(e.target.value)}
                      placeholder="32.50"
                      className="w-full text-sm border border-gray-200 rounded-xl pl-9 pr-3.5 py-2.5 focus:outline-none focus:border-blue-700 transition"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Cell Number (Prefix: 081 / 085)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +264 81 234 5678"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-700 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Namibian ID card Number</label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="e.g. 84121500123"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-blue-700 transition"
                />
              </div>

              {/* Avatar Preset Grid */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Configure Profile Avatar</label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_AVATARS.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPhotoUrl(url)}
                      className="relative rounded-full overflow-hidden border-2 h-11 w-11 transition shadow-xs focus:outline-none shrink-0 cursor-pointer"
                      style={{ borderColor: photoUrl === url ? '#185FA5' : 'transparent' }}
                    >
                      <img src={url} alt={`Avatar Preset ${i + 1}`} className="h-full w-full object-cover" />
                      {photoUrl === url && (
                        <span className="absolute inset-0 bg-blue-700/40 flex items-center justify-center text-white font-bold">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="border border-gray-200 hover:bg-gray-50 text-gray-600 font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-xs transition cursor-pointer"
                >
                  Save Guard Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
