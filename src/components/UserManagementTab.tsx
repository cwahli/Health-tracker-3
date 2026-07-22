import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Settings, 
  Coins, 
  Clock, 
  Plus, 
  Check, 
  Trash2, 
  Shield, 
  AlertCircle, 
  Activity, 
  UserPlus, 
  Sparkles,
  Info
} from 'lucide-react';
import { UserProfile } from '../types';
import { 
  getAllLocalUsers, 
  updateUserProfile, 
  getAdminSettings, 
  saveAdminSettings, 
  AdminSettings 
} from '../utils/userManagement';
import { getAvailableCredits } from '../utils/creditManager';

export default function UserManagementTab() {
  // Use Awaited<ReturnType<...>> if you have strict TS config, but here any works too since it's just state.
  const [users, setUsers] = useState<any[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings>(getAdminSettings());
  const [selectedUserEmail, setSelectedUserEmail] = useState<string>('');
  
  // Grant Credits form state
  const [grantAmount, setGrantAmount] = useState<number>(50);
  const [grantDurationHours, setGrantDurationHours] = useState<number>(24);
  const [grantSuccessMsg, setGrantSuccessMsg] = useState<string>('');

  // Cost and Quota edit states
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [editFlashLiteCost, setEditFlashLiteCost] = useState(adminSettings.flashLiteCost);
  const [editStandardCost, setEditStandardCost] = useState(adminSettings.standardCost);
  const [editQuotaDemo, setEditQuotaDemo] = useState(adminSettings.quotaDemo);
  const [editQuotaStandard, setEditQuotaStandard] = useState(adminSettings.quotaStandard);
  const [editQuotaAdmin, setEditQuotaAdmin] = useState(adminSettings.quotaAdmin);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Admin' | 'Demo' | 'Standard'>('all');

  const loadData = async () => {
    const fetchedUsers = await getAllLocalUsers();
    setUsers(fetchedUsers);
    const settings = getAdminSettings();
    setAdminSettings(settings);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: AdminSettings = {
      flashLiteCost: Number(editFlashLiteCost),
      standardCost: Number(editStandardCost),
      quotaDemo: Number(editQuotaDemo),
      quotaStandard: Number(editQuotaStandard),
      quotaAdmin: Number(editQuotaAdmin)
    };
    saveAdminSettings(updated);
    setAdminSettings(updated);
    setIsEditingSettings(false);
    await loadData();
    // Dispatch storage event to update other states immediately
    window.dispatchEvent(new Event('storage'));
  };

  const handleGrantCredits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserEmail) return;

    const matchedUser = users.find(u => u.email === selectedUserEmail);
    if (!matchedUser) return;

    const updatedProfile = { ...matchedUser.profile };
    if (!updatedProfile.agentCredits) {
      updatedProfile.agentCredits = {
        totalUsed: 0,
        dailyQuota: 100,
        remaining: 100,
        lastResetTime: new Date().toISOString(),
        grantedCredits: [],
        modelUsage: {}
      };
    }
    if (!updatedProfile.agentCredits.grantedCredits) {
      updatedProfile.agentCredits.grantedCredits = [];
    }

    const expiresAt = new Date(Date.now() + grantDurationHours * 60 * 60 * 1000).toISOString();
    updatedProfile.agentCredits.grantedCredits.push({
      amount: Number(grantAmount),
      grantedAt: new Date().toISOString(),
      expiresAt
    });

    await updateUserProfile(matchedUser.email, updatedProfile);
    setGrantSuccessMsg(`Successfully granted ${grantAmount} credits to ${matchedUser.nickname}!`);
    setTimeout(() => setGrantSuccessMsg(''), 4000);
    await loadData();
  };

  const handleResetDailyUsage = async (email: string) => {
    const matchedUser = users.find(u => u.email === email);
    if (!matchedUser) return;

    const updatedProfile = { ...matchedUser.profile };
    if (updatedProfile.agentCredits) {
      updatedProfile.agentCredits.remaining = updatedProfile.userType === 'Admin' 
        ? adminSettings.quotaAdmin 
        : (updatedProfile.userType === 'Demo' ? adminSettings.quotaDemo : adminSettings.quotaStandard);
      updatedProfile.agentCredits.lastResetTime = new Date().toISOString();
    }
    await updateUserProfile(email, updatedProfile);
    await loadData();
  };

  const handleChangeUserType = async (email: string, newType: 'Standard' | 'Admin' | 'Demo') => {
    const matchedUser = users.find(u => u.email === email);
    if (!matchedUser) return;

    const updatedProfile = { ...matchedUser.profile };
    updatedProfile.userType = newType;
    
    // Set daily quota default matching new user type
    const newQuota = newType === 'Admin' 
      ? adminSettings.quotaAdmin 
      : (newType === 'Demo' ? adminSettings.quotaDemo : adminSettings.quotaStandard);

    if (updatedProfile.agentCredits) {
      updatedProfile.agentCredits.dailyQuota = newQuota;
      updatedProfile.agentCredits.remaining = newQuota;
    } else {
      updatedProfile.agentCredits = {
        totalUsed: 0,
        dailyQuota: newQuota,
        remaining: newQuota,
        lastResetTime: new Date().toISOString(),
        grantedCredits: [],
        modelUsage: {}
      };
    }

    await updateUserProfile(email, updatedProfile);
    await loadData();
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.nickname.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || u.userType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 text-slate-800 dark:text-slate-100">
      
      {/* Configuration Cards Row */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-4.5 h-4.5 text-indigo-500" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Agent Call Costs & Quotas Configuration
            </h4>
          </div>
          {!isEditingSettings && (
            <button
              type="button"
              onClick={() => {
                setEditFlashLiteCost(adminSettings.flashLiteCost);
                setEditStandardCost(adminSettings.standardCost);
                setEditQuotaDemo(adminSettings.quotaDemo);
                setEditQuotaStandard(adminSettings.quotaStandard);
                setEditQuotaAdmin(adminSettings.quotaAdmin);
                setIsEditingSettings(true);
              }}
              className="text-xs px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100 dark:border-indigo-900/30 rounded-lg hover:bg-indigo-100/60 transition-colors cursor-pointer"
            >
              Adjust Settings
            </button>
          )}
        </div>

        {isEditingSettings ? (
          <form onSubmit={handleSaveSettings} className="space-y-4 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Costs Column */}
              <div className="space-y-3 bg-white dark:bg-slate-950 p-4 border border-slate-150 dark:border-slate-800/80 rounded-xl">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  1. Model Call Costs (Credits)
                </span>
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold mb-1">
                    Gemini 3.1 & 3.5 Flash Lite Call Cost
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editFlashLiteCost}
                    onChange={e => setEditFlashLiteCost(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-mono outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold mb-1">
                    All Other Agents Call Cost (e.g. 2.5-Pro, etc.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editStandardCost}
                    onChange={e => setEditStandardCost(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Quotas Column */}
              <div className="space-y-3 bg-white dark:bg-slate-950 p-4 border border-slate-150 dark:border-slate-800/80 rounded-xl">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  2. User Quotas (Credits / Day)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] text-slate-500 font-semibold mb-1">
                      Demo User
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editQuotaDemo}
                      onChange={e => setEditQuotaDemo(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-100 font-mono outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-semibold mb-1">
                      Standard
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editQuotaStandard}
                      onChange={e => setEditQuotaStandard(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-100 font-mono outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-500 font-semibold mb-1">
                      Admin
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={editQuotaAdmin}
                      onChange={e => setEditQuotaAdmin(Number(e.target.value))}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-xs text-slate-800 dark:text-slate-100 font-mono outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingSettings(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
              >
                Save Configurations
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
            <div className="bg-white dark:bg-slate-950 p-4 border border-slate-150 dark:border-slate-850 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Call Rates
                </span>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  ⚡ 3.1 & 3.5 Flash Lite: <span className="text-indigo-600 font-bold font-mono">{adminSettings.flashLiteCost} credit</span>
                </p>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  🎯 Other Agents: <span className="text-indigo-600 font-bold font-mono">{adminSettings.standardCost} credits</span>
                </p>
              </div>
              <Coins className="w-8 h-8 text-indigo-500/20" />
            </div>

            <div className="bg-white dark:bg-slate-950 p-4 border border-slate-150 dark:border-slate-850 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Daily Quota Limits
                </span>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Standard Accounts: <span className="text-emerald-500 font-bold font-mono">{adminSettings.quotaStandard} / day</span>
                </p>
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  Demo Accounts: <span className="text-amber-500 font-bold font-mono">{adminSettings.quotaDemo} / day</span>
                </p>
              </div>
              <Activity className="w-8 h-8 text-emerald-500/20" />
            </div>
          </div>
        )}
      </div>

      {/* Grant Extra Credits Dialog form */}
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4.5 h-4.5 text-emerald-500" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Grant Extra Credit to Specific User
          </h4>
        </div>

        {grantSuccessMsg && (
          <div className="p-3 bg-emerald-950/25 border border-emerald-900 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4" />
            <span>{grantSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={handleGrantCredits} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
          <div className="sm:col-span-2">
            <label className="block text-[10px] text-slate-500 font-semibold mb-1">
              Select User Profile
            </label>
            <select
              value={selectedUserEmail}
              onChange={e => setSelectedUserEmail(e.target.value)}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 cursor-pointer"
              required
            >
              <option value="">-- Choose Account --</option>
              {users.map(u => (
                <option key={u.email} value={u.email}>
                  {u.nickname} ({u.email}) - {u.userType}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-semibold mb-1">
              Amount (Credits)
            </label>
            <input
              type="number"
              min="1"
              value={grantAmount}
              onChange={e => setGrantAmount(Number(e.target.value))}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 font-mono outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-500 font-semibold mb-1">
              Duration (Hours)
            </label>
            <select
              value={grantDurationHours}
              onChange={e => setGrantDurationHours(Number(e.target.value))}
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value={1}>1 Hour</option>
              <option value={12}>12 Hours</option>
              <option value={24}>24 Hours (1 Day)</option>
              <option value={48}>48 Hours (2 Days)</option>
              <option value={168}>168 Hours (7 Days)</option>
            </select>
          </div>

          <div className="sm:col-span-4 flex justify-end mt-2">
            <button
              type="submit"
              disabled={!selectedUserEmail}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Grant Additional Credits</span>
            </button>
          </div>
        </form>
      </div>

      {/* Accounts List Directory */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              User Directory & Consumption Live Logs ({filteredUsers.length} accounts)
            </h4>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <input
              type="text"
              placeholder="Search by nickname or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500"
            />
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value as any)}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Demo">Demo</option>
              <option value="Standard">Standard</option>
            </select>
          </div>
        </div>

        <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-950 text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">User Details</th>
                  <th className="p-4">Account Type</th>
                  <th className="p-4">Last Login</th>
                  <th className="p-4">Remaining Credits / Quota</th>
                  <th className="p-4 text-center">Model Usage Summary</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-slate-400">
                      No matching registered user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => {
                    const creditsInfo = getAvailableCredits(user.profile);
                    const usage = user.profile.agentCredits?.modelUsage || {};
                    const totalUsedVal = user.profile.agentCredits?.totalUsed || 0;
                    
                    return (
                      <tr key={user.email} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {user.nickname}
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                            {user.email}
                          </div>
                        </td>
                        <td className="p-4">
                          <select
                            value={user.userType}
                            onChange={e => handleChangeUserType(user.email, e.target.value as any)}
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded px-1.5 py-0.5 text-[11px] font-semibold outline-none text-slate-700 dark:text-slate-300 cursor-pointer"
                          >
                            <option value="Standard">Standard</option>
                            <option value="Demo">Demo</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>
                              {user.lastLogin 
                                ? new Date(user.lastLogin).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) 
                                : 'Never'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                {creditsInfo.total} available
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              (Daily: {creditsInfo.daily} remaining, Granted: {creditsInfo.granted})
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="space-y-1.5 flex flex-col items-center">
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">
                              {totalUsedVal} total credits used
                            </span>
                            {Object.keys(usage).length > 0 ? (
                              <div className="flex flex-wrap gap-1 justify-center max-w-[160px]">
                                {Object.entries(usage).map(([model, count]) => (
                                  <span key={model} className="text-[9px] px-1 bg-slate-100 dark:bg-slate-900 text-slate-500 rounded font-mono" title={model}>
                                    {model.replace('gemini-', '')}: {count as React.ReactNode}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No agent calls yet</span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleResetDailyUsage(user.email)}
                            className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-900 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-800 rounded px-2.5 py-1 cursor-pointer transition-colors"
                            title="Refill daily quota immediately"
                          >
                            Refill Quota
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
    </div>
  );
}
