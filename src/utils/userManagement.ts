import { UserProfile } from '../types';

export interface AdminSettings {
  flashLiteCost: number;
  standardCost: number;
  quotaDemo: number;
  quotaStandard: number;
  quotaAdmin: number;
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  flashLiteCost: 1,
  standardCost: 20,
  quotaDemo: 20,
  quotaStandard: 100,
  quotaAdmin: 500
};

export function getAdminSettings(): AdminSettings {
  try {
    const saved = localStorage.getItem('admin_agent_settings');
    if (saved) {
      return { ...DEFAULT_ADMIN_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn("Error getting admin settings", e);
  }
  return DEFAULT_ADMIN_SETTINGS;
}

export function saveAdminSettings(settings: AdminSettings) {
  try {
    localStorage.setItem('admin_agent_settings', JSON.stringify(settings));
  } catch (e) {
    console.error("Error saving admin settings", e);
  }
}

export function getAllLocalUsers(): { 
  email: string; 
  userType: 'Standard' | 'Admin' | 'Demo'; 
  nickname: string; 
  lastLogin: string; 
  creditUsage: number; 
  profile: UserProfile; 
}[] {
  const users: any[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('health_cockpit_app_data_')) {
        const email = key.replace('health_cockpit_app_data_', '').trim();
        const value = localStorage.getItem(key);
        if (value) {
          const parsed = JSON.parse(value);
          if (parsed && parsed.profile) {
            const prof = parsed.profile;
            users.push({
              email: email,
              userType: prof.userType || 'Standard',
              nickname: prof.nickname || 'Healthy User',
              lastLogin: prof.lastLogin || new Date().toISOString(),
              creditUsage: prof.agentCredits?.totalUsed || 0,
              profile: prof
            });
          }
        }
      }
    }
  } catch (e) {
    console.error("Error fetching local users", e);
  }

  // Ensure demo user is present in the list
  if (!users.some(u => u.email === 'demo@healthcockpit.com')) {
    const demoProfile: any = {
      nickname: 'Alex (Demo)',
      photoUrl: '',
      email: 'demo@healthcockpit.com',
      userType: 'Demo',
      age: 28,
      ethnicity: 'Caucasian',
      weight: 165,
      height: 70,
      gender: 'Male',
      timezone: 'UTC',
      lastLogin: new Date().toISOString(),
      agentCredits: {
        totalUsed: 0,
        dailyUsed: 0,
        lastResetDate: new Date().toISOString().split('T')[0],
        grantedCredits: []
      }
    };
    users.push({
      email: 'demo@healthcockpit.com',
      userType: 'Demo',
      nickname: 'Alex (Demo)',
      lastLogin: demoProfile.lastLogin,
      creditUsage: 0,
      profile: demoProfile
    });
  }

  return users;
}

export function updateUserProfile(email: string, updatedProfile: UserProfile) {
  try {
    const storageKey = `health_cockpit_app_data_${email.toLowerCase().trim()}`;
    const value = localStorage.getItem(storageKey);
    if (value) {
      const parsed = JSON.parse(value);
      parsed.profile = updatedProfile;
      localStorage.setItem(storageKey, JSON.stringify(parsed));
    } else {
      const bundle = {
        profile: updatedProfile,
        foodLogs: [],
        biomarkers: {},
        biomarkerHistory: [],
        actions: [],
        dailyBenefits: [],
        report: null
      };
      localStorage.setItem(storageKey, JSON.stringify(bundle));
    }
    // Fire event to let other windows / states update if needed
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.error("Error updating user profile in management", e);
  }
}
