import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import PasswordInput from '@/components/ui/PasswordInput';
import {
  User,
  Bell,
  Shield,
  Moon,
  Sun,
  Laptop,
  LogOut,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sliders,
  Smartphone,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  Camera,
  Upload,
  Zap,
  Layout,
  ChevronRight,
  Info,
  Sparkles,
  Save,
  Trash2,
  QrCode,
  KeyRound,
  UserPlus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ModernSlider from '@/components/ui/ModernSlider';
import {
  cn,
  capitalize,
  validateEmail,
  validatePassword,
  copyToClipboard,
} from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ColorPalette from '@/components/ui/ColorPalette';

const Settings = () => {
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme(); // Use Global Theme

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('notifications');
    return saved
      ? JSON.parse(saved)
      : {
          email: true,
          push: false,
          marketing: false,
        };
  });

  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem('user') || '{}'),
  );

  const isManager = user.isManager && user.role === 'staff';
  const isAdmin = ['admin', 'Admin', 'super_admin', 'staff'].includes(
    user.role,
  );

  // Modal States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedSecurityCode, setCopiedSecurityCode] = useState(false);

  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');

  // Fetch latest user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data);
        // Merge to preserve the token stored at login — /auth/me doesn't return token
        const existing = JSON.parse(localStorage.getItem('user') || '{}');
        localStorage.setItem('user', JSON.stringify({ ...existing, ...data }));
        window.dispatchEvent(new Event('userUpdated'));
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };
    fetchUserData();
  }, []);

  // Notifications Effect
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  const handleToggle = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const userInitials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'JS';

  // Navigation State
  const [activeSection, setActiveSection] = useState('general');

  const tabs = [
    {
      id: 'general',
      label: 'General',
      icon: User,
      desc: 'Profile & Appearance',
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      desc: 'Protection & Sessions',
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      desc: 'System Alerts & Updates',
    },
  ];

  if (isAdmin || user.role === 'super_admin' || isManager) {
    tabs.push({
      id: 'configuration',
      label: 'Configuration',
      icon: Sliders,
      desc: 'Global Parameter Rules',
    });
  }

  return (
    <div className="relative min-h-[calc(100vh-8rem)] pb-12 animate-in fade-in duration-1000">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <PageHeader
        title={isManager ? 'Branch Manager Settings' : 'Admin Settings'}
        description={
          isManager
            ? 'Manage your profile, notifications, and security.'
            : 'Manage your profile, notifications, security, and global configuration.'
        }
        className="mb-10"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="p-2 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] shadow-2xl shadow-black/5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSection === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={cn(
                    'w-full group flex items-center gap-4 p-4 rounded-[1.8rem] transition-all duration-500 relative overflow-hidden',
                    isActive
                      ? 'bg-gradient-to-br from-primary to-primary/80 text-white shadow-xl shadow-primary/20 scale-[1.02] z-10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/60 dark:hover:bg-slate-800/60',
                  )}
                >
                  <div
                    className={cn(
                      'p-3 rounded-2xl transition-all duration-500',
                      isActive
                        ? 'bg-white/20'
                        : 'bg-muted/50 group-hover:scale-110 group-hover:rotate-3',
                    )}
                  >
                    <Icon size={18} strokeWidth={isActive ? 3 : 2} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-xs uppercase tracking-widest leading-none mb-1">
                      {tab.label}
                    </p>
                    <p
                      className={cn(
                        'text-[10px] font-medium opacity-60',
                        isActive ? 'text-white' : 'text-muted-foreground',
                      )}
                    >
                      {tab.desc}
                    </p>
                  </div>
                  {isActive && (
                    <motion.div
                      layoutId="activeTabGlow"
                      className="absolute inset-0 bg-white/10 blur-xl opacity-50"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-700">
              <Sparkles size={100} />
            </div>
            <h4 className="font-black text-[10px] uppercase tracking-[0.3em] mb-3 opacity-80">
              Account Health
            </h4>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold opacity-80">Verification</span>
                <span className="px-2 py-0.5 rounded-md bg-white/20 font-black tracking-widest">
                  SECURE
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold opacity-80">Encryption</span>
                <span className="px-2 py-0.5 rounded-md bg-white/20 font-black tracking-widest">
                  AES-256
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/50 dark:border-slate-800/50 rounded-[3rem] p-8 sm:p-12 shadow-2xl shadow-black/5 min-h-[600px] relative overflow-hidden flex flex-col gap-6"
            >
              {/* General Section: Profile + Appearance */}
              {activeSection === 'general' && (
                <>
                  {/* Profile Section */}
                  <section className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden relative group">
                    <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="flex flex-col md:flex-row items-start justify-between gap-6 relative z-10">
                      <div className="space-y-1">
                        <h3 className="text-xl font-black tracking-tight">
                          Profile Information
                        </h3>
                        <p className="text-muted-foreground text-xs font-medium">
                          Update your account's public identity and credentials.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsProfileModalOpen(true)}
                        className="rounded-xl border-primary/20 hover:bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest"
                      >
                        Edit Profile
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-8 py-4 relative z-10">
                      <div className="relative group/avatar">
                        <div className="h-24 w-24 rounded-[2rem] bg-primary/10 flex items-center justify-center text-3xl font-black text-primary overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl group-hover/avatar:border-primary/20 transition-all cursor-pointer">
                          {user.profilePicture ? (
                            <img
                              src={user.profilePicture}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            userInitials
                          )}

                          {/* Hover Overlay */}
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3 opacity-0 group-hover/avatar:opacity-100 transition-all duration-300">
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() =>
                                document
                                  .getElementById('profile-upload')
                                  .click()
                              }
                              className="bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-xl transition-all"
                              title="Upload Picture"
                            >
                              {loading ? (
                                <Loader2
                                  size={16}
                                  className="text-white animate-spin"
                                />
                              ) : (
                                <Camera size={16} className="text-white" />
                              )}
                            </button>

                            {user.profilePicture && (
                              <button
                                type="button"
                                disabled={loading}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (loading) return;
                                  setLoading(true);
                                  try {
                                    const { data } = await api.delete(
                                      '/auth/delete-profile-picture',
                                    );
                                    if (data.success) {
                                      const updatedUser = {
                                        ...user,
                                        profilePicture: undefined,
                                      };
                                      setUser(updatedUser);
                                      localStorage.setItem(
                                        'user',
                                        JSON.stringify(updatedUser),
                                      );
                                      window.dispatchEvent(
                                        new Event('userUpdated'),
                                      );
                                      toast.success('Profile picture removed');
                                    }
                                  } catch (error) {
                                    toast.error(
                                      'Failed to delete profile picture',
                                    );
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                                className="bg-rose-500/40 hover:bg-rose-500/60 backdrop-blur-md p-2 rounded-xl transition-all"
                                title="Delete Picture"
                              >
                                <Trash2 size={16} className="text-white" />
                              </button>
                            )}
                          </div>
                        </div>

                        <input
                          type="file"
                          id="profile-upload"
                          className="hidden"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;

                            if (file.size > 2 * 1024 * 1024) {
                              toast.error('Image must be less than 2MB');
                              return;
                            }

                            const formData = new FormData();
                            formData.append('profilePicture', file);

                            setLoading(true);
                            try {
                              const { data } = await api.put(
                                '/auth/updateprofilepicture',
                                formData,
                                {
                                  headers: {
                                    'Content-Type': 'multipart/form-data',
                                  },
                                },
                              );

                              if (data.success) {
                                const updatedUser = {
                                  ...user,
                                  profilePicture: data.profilePicture,
                                };
                                setUser(updatedUser);
                                localStorage.setItem(
                                  'user',
                                  JSON.stringify(updatedUser),
                                );
                                // Dispatch event to update sidebar
                                window.dispatchEvent(new Event('userUpdated'));
                                toast.success('Profile picture updated');
                              }
                            } catch (error) {
                              console.error(error);
                              toast.error('Failed to update profile picture');
                            } finally {
                              setLoading(false);
                            }
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xl font-bold capitalize">
                          {capitalize(user.name || 'John Doe')}
                        </h4>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Mail size={14} />
                          {user.email || 'john.doe@example.com'}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                            {user.role || 'User'}
                          </span>
                          {isManager && (
                            <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                              manager
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Appearance Section */}
                  <section className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-75 overflow-hidden group">
                    <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="relative z-10">
                      <h3 className="text-xl font-black tracking-tight">
                        Appearance
                      </h3>
                      <p className="text-muted-foreground text-xs font-medium mt-1">
                        Visual system configuration and theme management.
                      </p>
                    </div>

                    <div className="space-y-8 relative z-10">
                      {/* Mode Toggle */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button
                          onClick={() => setTheme('light')}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            theme === 'light'
                              ? 'border-primary bg-primary/5'
                              : 'border-border/50 hover:border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="h-10 w-10 rounded-full bg-background border shadow-sm flex items-center justify-center">
                            <Sun size={20} />
                          </div>
                          <span className="font-medium text-sm">Light</span>
                        </button>
                        <button
                          onClick={() => setTheme('dark')}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            theme === 'dark'
                              ? 'border-primary bg-primary/5'
                              : 'border-border/50 hover:border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="h-10 w-10 rounded-full bg-slate-950 text-white border shadow-sm flex items-center justify-center">
                            <Moon size={20} />
                          </div>
                          <span className="font-medium text-sm">Dark</span>
                        </button>
                        <button
                          onClick={() => setTheme('system')}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            theme === 'system'
                              ? 'border-primary bg-primary/5'
                              : 'border-border/50 hover:border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-background to-slate-950 border shadow-sm flex items-center justify-center">
                            <Laptop size={20} className="text-primary" />
                          </div>
                          <span className="font-medium text-sm">System</span>
                        </button>
                      </div>

                      {/* Primary Color Selection */}
                      <div className="space-y-4 pt-4 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mr-1">
                            Primary Accent
                          </h4>
                          <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded uppercase tracking-widest">
                            Modern Palette
                          </span>
                        </div>

                        <div className="pt-2">
                          <ColorPalette
                            primaryColor={primaryColor}
                            setPrimaryColor={setPrimaryColor}
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Danger Zone — Admin only */}
                  {isAdmin && (
                    <section className="bg-rose-500/5 dark:bg-rose-500/10 backdrop-blur-xl border border-rose-500/20 rounded-[2.5rem] p-8 shadow-2xl shadow-rose-500/5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-150 overflow-hidden group">
                      <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-rose-500/20 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                      <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-6">
                        <div className="space-y-1">
                          <h3 className="text-xl font-black tracking-tight text-rose-500">
                            Danger Zone
                          </h3>
                          <p className="text-muted-foreground text-xs font-medium">
                            Irreversible actions that affect your entire
                            business ecosystem.
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsDeleteModalOpen(true)}
                          className="rounded-xl border border-rose-500/20 hover:bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest bg-white/20 dark:bg-black/20"
                        >
                          Delete Account Permanently
                        </Button>
                      </div>

                      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 relative z-10">
                        <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                          <Info size={14} />
                          WARNING: THIS ACTION WILL PERMANENTLY SCRUB ALL LOANS,
                          CUSTOMERS, AND FINANCIAL RECORDS.
                        </p>
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <section className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden group">
                  <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                  <div className="relative z-10">
                    <h3 className="text-xl font-black tracking-tight">
                      System Notifications
                    </h3>
                    <p className="text-muted-foreground text-xs font-medium mt-1">
                      Manage intelligent alerts and communication delivery.
                    </p>
                  </div>

                  <div className="space-y-4 relative z-10">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                          <Mail size={16} />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">
                            Email Notifications
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Receive digest summary emails
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.email}
                        onCheckedChange={() => handleToggle('email')}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                          <Smartphone size={16} />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">
                            Push Notifications
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Real-time alerts on your device
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.push}
                        onCheckedChange={() => handleToggle('push')}
                      />
                    </div>
                  </div>
                </section>
              )}

              {/* Security Section */}
              {activeSection === 'security' && (
                <section className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden group">
                  <div className="absolute -left-12 -top-12 w-48 h-48 bg-violet-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                  <div className="relative z-10">
                    <h3 className="text-xl font-black tracking-tight">
                      Platform Security
                    </h3>
                    <p className="text-muted-foreground text-xs font-medium mt-1">
                      Fortify your account and manage active sessions.
                    </p>
                  </div>

                  <div className="space-y-6 relative z-10">
                    <div className="flex items-center justify-between pb-4 border-b border-border/50">
                      <div className="flex items-center gap-3">
                        <Lock size={18} className="text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">Password</p>
                          <p className="text-xs text-muted-foreground">
                            Update your login password
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsPasswordModalOpen(true)}
                      >
                        Change Password
                      </Button>
                    </div>
                    {isAdmin && (
                      <div className="flex flex-col gap-6 pb-4 border-b border-border/50">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <ShieldCheck
                              size={18}
                              className="text-muted-foreground"
                            />
                            <div>
                              <p className="font-medium text-sm">
                                Business Security Code
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Identifies your organization in the system
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="font-mono text-lg font-black text-primary tracking-wider">
                              {user.securityCode || 'LOADING...'}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 px-3"
                              onClick={async () => {
                                await copyToClipboard(user.securityCode || '');
                                setCopiedSecurityCode(true);
                                toast.success(
                                  'Security code copied to clipboard',
                                );
                                setTimeout(
                                  () => setCopiedSecurityCode(false),
                                  2000,
                                );
                              }}
                            >
                              {copiedSecurityCode ? (
                                <Check size={16} className="text-emerald-500" />
                              ) : (
                                <Copy size={16} />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <UserPlus
                              size={18}
                              className="text-muted-foreground"
                            />
                            <div>
                              <p className="font-medium text-sm">
                                Member Registration Link
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Share this link to let members self-onboard
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="font-bold tracking-tight text-xs h-9 px-4"
                            onClick={async () => {
                              const url = `${window.location.origin}/join/${user.securityCode || ''}`;
                              await copyToClipboard(url);
                              toast.success('Registration link copied!');
                            }}
                          >
                            Copy Link <Copy size={14} className="ml-2" />
                          </Button>
                        </div>
                      </div>
                    )}
                    {/* ─── Two-Factor Authentication Panel ─── */}
                    <div className="border border-border/50 rounded-2xl p-5 bg-muted/20 space-y-4 pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <QrCode size={18} className="text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">
                              Two-Factor Authentication
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {is2FAEnabled
                                ? '2FA is currently active on your account.'
                                : 'Add an extra layer of security via TOTP app.'}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                            is2FAEnabled
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {is2FAEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>

                      {!is2FAEnabled && (
                        <div className="space-y-3">
                          {!qrCodeData ? (
                            <Button
                              variant="outline"
                              size="sm"
                              isLoading={twoFALoading}
                              onClick={async () => {
                                try {
                                  setTwoFALoading(true);
                                  const { data } =
                                    await api.post('/auth/2fa/generate');
                                  setQrCodeData(data.qrCode);
                                } catch (e) {
                                  toast.error(
                                    e.response?.data?.message ||
                                      'Failed to generate QR',
                                  );
                                } finally {
                                  setTwoFALoading(false);
                                }
                              }}
                            >
                              <QrCode size={14} className="mr-2" />
                              <span>Set Up 2FA</span>
                            </Button>
                          ) : (
                            <div className="space-y-3 animate-in fade-in">
                              <p className="text-xs text-muted-foreground">
                                Scan this QR code with Google Authenticator or
                                Authy, then enter the 6-digit code below to
                                confirm.
                              </p>
                              <img
                                src={qrCodeData}
                                alt="2FA QR Code"
                                className="w-40 h-40 rounded-xl border border-border/50 p-2 bg-white mx-auto"
                              />
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <KeyRound
                                    size={14}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                  />
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    placeholder="Enter 6-digit code"
                                    value={twoFACode}
                                    onChange={(e) =>
                                      setTwoFACode(
                                        e.target.value.replace(/\D/g, ''),
                                      )
                                    }
                                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-background border border-border/50 text-sm font-mono tracking-widest outline-none focus:border-primary/50"
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  isLoading={twoFALoading}
                                  disabled={twoFACode.length < 6}
                                  onClick={async () => {
                                    try {
                                      setTwoFALoading(true);
                                      await api.post('/auth/2fa/verify', {
                                        code: twoFACode,
                                      });
                                      setIs2FAEnabled(true);
                                      setQrCodeData(null);
                                      setTwoFACode('');
                                      toast.success(
                                        '2FA enabled! Your account is now secure.',
                                      );
                                    } catch (e) {
                                      toast.error(
                                        e.response?.data?.message ||
                                          'Verification failed',
                                      );
                                    } finally {
                                      setTwoFALoading(false);
                                    }
                                  }}
                                >
                                  <Check size={14} className="mr-1" />
                                  <span>Verify</span>
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {is2FAEnabled && (
                        <div className="space-y-2 animate-in fade-in">
                          <p className="text-xs text-muted-foreground">
                            Enter your password to disable Two-Factor
                            Authentication.
                          </p>
                          <div className="flex gap-2">
                            <PasswordInput
                              placeholder="Current password"
                              value={disable2FAPassword}
                              onChange={(e) =>
                                setDisable2FAPassword(e.target.value)
                              }
                              className="h-10 flex-1"
                            />
                            <Button
                              variant="destructive"
                              size="sm"
                              isLoading={twoFALoading}
                              disabled={!disable2FAPassword}
                              onClick={async () => {
                                try {
                                  setTwoFALoading(true);
                                  await api.post('/auth/2fa/disable', {
                                    password: disable2FAPassword,
                                  });
                                  setIs2FAEnabled(false);
                                  setDisable2FAPassword('');
                                  toast.success('2FA disabled.');
                                } catch (e) {
                                  toast.error(
                                    e.response?.data?.message ||
                                      'Failed to disable',
                                  );
                                } finally {
                                  setTwoFALoading(false);
                                }
                              }}
                            >
                              Disable
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <LogOut size={18} className="text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">Log out</p>
                          <p className="text-xs text-muted-foreground">
                            End your current session
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
                      >
                        Log Out
                      </Button>
                    </div>
                  </div>
                </section>
              )}

              {/* Configuration Section */}
              {activeSection === 'configuration' && (
                <ConfigurationSection user={user} />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        setUser={setUser}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      {/* Delete Account Modal */}
      <DeleteAccountConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};

const EditProfileModal = ({ isOpen, onClose, user, setUser }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
    businessName: user.businessName || '',
    currency: user.currency || 'Rs.',
    businessAbbreviation: user.businessAbbreviation || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        businessName: user.businessName || '',
        currency: user.currency || 'Rs.',
        businessAbbreviation: user.businessAbbreviation || '',
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      toast.error(emailValidation.message);
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.put('/auth/updatedetails', formData);
      if (data.success) {
        const updatedUser = { ...user, ...data.data };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        toast.success('Profile updated successfully');
        onClose();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md text-foreground bg-transparent capitalize"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md text-foreground bg-transparent"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Business Abbreviation</label>
            <input
              type="text"
              value={formData.businessAbbreviation}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  businessAbbreviation: e.target.value
                    .slice(0, 4)
                    .toUpperCase(),
                })
              }
              placeholder="e.g. MLO"
              maxLength={4}
              className="w-full px-3 py-2 border rounded-md text-foreground bg-transparent font-mono font-bold uppercase tracking-wider"
              required
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Max 4 characters. Used as prefix for new account numbers.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Preferred Currency</label>
            <select
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md text-foreground flex h-9 bg-transparent"
            >
              <option value="$">US Dollar ($)</option>
              <option value="€">Euro (€)</option>
              <option value="£">British Pound (£)</option>
              <option value="¥">Japanese Yen (¥)</option>
              <option value="Rs.">Pakistani Rupee </option>
              <option value="₹">Indian Rupee (₹)</option>
              <option value="৳">Bangladeshi Taka (৳)</option>
              <option value="₦">Nigerian Naira (₦)</option>
              <option value="KSh">Kenyan Shilling (KSh)</option>
              <option value="₱">Philippine Peso (₱)</option>
              <option value="R$">Brazilian Real (R$)</option>
              <option value="฿">Thai Baht (฿)</option>
              <option value="₫">Vietnamese Dong (₫)</option>
              <option value="₩">South Korean Won (₩)</option>
              <option value="Rp">Indonesian Rupiah (Rp)</option>
              <option value="RM">Malaysian Ringgit (RM)</option>
              <option value="A$">Australian Dollar (A$)</option>
              <option value="C$">Canadian Dollar (C$)</option>
              <option value="Fr">Swiss Franc (Fr)</option>
              <option value="AED">UAE Dirham (AED)</option>
              <option value="SAR">Saudi Riyal (SAR)</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50"
            >
              Cancel
            </button>
            <Button
              type="submit"
              isLoading={loading}
              variant="gradient"
              className="px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmNewPassword) {
      toast.error('New passwords do not match');
      return;
    }
    const { isValid, message } = validatePassword(formData.newPassword);
    if (!isValid) {
      toast.error(message);
      return;
    }
    setLoading(true);
    try {
      await api.put('/auth/updatepassword', {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });
      toast.success('Password updated successfully');
      onClose();
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Current Password</label>
            <PasswordInput
              value={formData.currentPassword}
              onChange={(e) =>
                setFormData({ ...formData, currentPassword: e.target.value })
              }
              className="w-full h-10"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">New Password</label>
            <PasswordInput
              value={formData.newPassword}
              onChange={(e) =>
                setFormData({ ...formData, newPassword: e.target.value })
              }
              minLength={8}
              className="w-full h-10"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Confirm New Password</label>
            <PasswordInput
              value={formData.confirmNewPassword}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  confirmNewPassword: e.target.value,
                })
              }
              className="w-full h-10"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted/50"
            >
              Cancel
            </button>
            <Button
              type="submit"
              isLoading={loading}
              variant="gradient"
              className="px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest"
            >
              Update Password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Configuration Section Component
const ConfigurationSection = ({ user }) => {
  const [settings, setSettings] = useState({
    defaultInterestRate: 5,
    defaultLoanTerm: 12,
    currency: 'Rs.',
    platformName: '',
    platformDescription: '',
    supportEmail: '',
    maintenanceMode: false,
    estimatedMaintenanceTime: '',
    smtpConfig: {
      host: '',
      port: 587,
      secure: false,
      auth: { user: '', pass: '' },
      fromEmail: '',
      fromName: '',
    },
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [triggeringACE, setTriggeringACE] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/system-settings');
      if (data) {
        setSettings({
          defaultInterestRate: data.defaultInterestRate || 5,
          defaultLoanTerm: data.defaultLoanTerm || 12,
          currency: data.currency || 'Rs.',
          platformName: data.platformName || '',
          platformDescription: data.platformDescription || '',
          supportEmail: data.supportEmail || '',
          maintenanceMode: data.maintenanceMode || false,
          estimatedMaintenanceTime: data.estimatedMaintenanceTime || '',
          smtpConfig: data.smtpConfig || {
            host: '',
            port: 587,
            secure: false,
            auth: { user: '', pass: '' },
            fromEmail: '',
            fromName: '',
          },
        });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Admins can update loan config, Super Admins can update everything
      const endpoint =
        user.role === 'super_admin'
          ? '/system-settings'
          : '/system-settings/loan-configuration';
      await api.put(endpoint, settings);
      // Also update the local user object currency for immediate effect
      try {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          const u = JSON.parse(userStr);
          u.currency = settings.currency;
          localStorage.setItem('user', JSON.stringify(u));
        }
      } catch (_) {}
      toast.success('System configuration updated successfully');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerACE = async () => {
    setTriggeringACE(true);
    try {
      const { data } = await api.post('/communication/trigger-scan');
      toast.success(
        data.message || 'Automated Communication scan triggered successfully',
      );
    } catch (error) {
      console.error('Failed to trigger ACE:', error);
      toast.error('Failed to trigger automated communication scan');
    } finally {
      setTriggeringACE(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden group">
      <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-primary/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="relative z-10">
        <h3 className="text-xl font-black tracking-tight">
          Loan Configuration
        </h3>
        <p className="text-muted-foreground text-xs font-medium mt-1">
          Define global parameters and default guardrails for the lending
          ecosystem.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 py-8">
          <ModernSlider
            label="Default Annual Interest Rate (%)"
            min={0}
            max={50}
            step={0.1}
            value={settings.defaultInterestRate}
            suffix="%"
            onChange={(val) =>
              setSettings({
                ...settings,
                defaultInterestRate: val,
              })
            }
          />
          <ModernSlider
            label="Default Loan Term (Months)"
            min={1}
            max={120}
            step={1}
            value={settings.defaultLoanTerm}
            suffix=" Mo"
            onChange={(val) =>
              setSettings({
                ...settings,
                defaultLoanTerm: val,
              })
            }
          />
          <p className="md:col-span-2 text-[10px] text-muted-foreground/60 mt-2 ml-1 italic font-medium">
            * These defaults are used to calculate estimated EMIs for all new
            loan requests system-wide.
          </p>
        </div>

        {/* Currency Setting */}
        <div className="space-y-3 bg-white/50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5">
          <div>
            <h4 className="text-sm font-black uppercase tracking-[0.15em] text-foreground">
              Default Currency
            </h4>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
              Used across all dashboards, reports, and loan summaries
              system-wide.
            </p>
          </div>
          <select
            value={settings.currency}
            onChange={(e) =>
              setSettings({ ...settings, currency: e.target.value })
            }
            className="w-full max-w-xs px-4 py-2.5 rounded-xl bg-background border border-border/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          >
            <option value="Rs.">Pakistani Rupee (Rs.)</option>
            <option value="$">US Dollar ($)</option>
            <option value="€">Euro (€)</option>
            <option value="£">British Pound (£)</option>
            <option value="¥">Japanese Yen (¥)</option>
            <option value="₹">Indian Rupee (₹)</option>
            <option value="৳">Bangladeshi Taka (৳)</option>
            <option value="₦">Nigerian Naira (₦)</option>
            <option value="KSh">Kenyan Shilling (KSh)</option>
            <option value="₱">Philippine Peso (₱)</option>
            <option value="R$">Brazilian Real (R$)</option>
            <option value="฿">Thai Baht (฿)</option>
            <option value="₩">South Korean Won (₩)</option>
            <option value="AED">UAE Dirham (AED)</option>
            <option value="SAR">Saudi Riyal (SAR)</option>
          </select>
        </div>

        {/* Super Admin Branding Section */}
        {user.role === 'super_admin' && (
          <div className="space-y-6 pt-4 border-t border-border/20">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 mb-2">
                <Sparkles size={14} />
                Platform Branding
              </h3>
              <p className="text-muted-foreground text-[11px] font-medium leading-relaxed">
                Customize the global appearance and metadata of the platform as
                seen by all users.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-200 dark:border-white/5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Platform Name
                </label>
                <input
                  type="text"
                  value={settings.platformName}
                  onChange={(e) =>
                    setSettings({ ...settings, platformName: e.target.value })
                  }
                  className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Support Email
                </label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) =>
                    setSettings({ ...settings, supportEmail: e.target.value })
                  }
                  className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Platform Description
                </label>
                <textarea
                  value={settings.platformDescription}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      platformDescription: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium resize-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Maintenance Section */}
        {user.role === 'super_admin' && (
          <div className="space-y-6 pt-4 border-t border-border/20">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-rose-500 flex items-center gap-2 mb-2">
                <AlertTriangle size={14} />
                System Maintenance
              </h3>
              <p className="text-muted-foreground text-[11px] font-medium leading-relaxed">
                Restrict access to the platform for all non-administrative users
                during scheduled updates.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-[2rem] bg-rose-500/5 border border-rose-500/10">
              <div className="flex-1 space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-black uppercase tracking-widest mb-1">
                      Maintenance Mode
                    </p>
                    <p className="text-[10px] text-muted-foreground font-medium">
                      Platform will be inaccessible to regular users
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={() =>
                      setSettings((prev) => ({
                        ...prev,
                        maintenanceMode: !prev.maintenanceMode,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Estimated Duration
                  </label>
                  <input
                    type="text"
                    value={settings.estimatedMaintenanceTime}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        estimatedMaintenanceTime: e.target.value,
                      })
                    }
                    placeholder="e.g. 2 hours"
                    className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SMTP Configuration Section */}
        {user.role === 'super_admin' && (
          <div className="space-y-6 pt-4 border-t border-border/20">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-500 flex items-center gap-2 mb-2">
                <Mail size={14} />
                SMTP Configuration
              </h3>
              <p className="text-muted-foreground text-[11px] font-medium leading-relaxed">
                Configure the outgoing mail server to enable automated email
                notifications.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-200 dark:border-white/5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  SMTP Host
                </label>
                <input
                  type="text"
                  placeholder="smtp.example.com"
                  value={settings.smtpConfig?.host || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      smtpConfig: {
                        ...settings.smtpConfig,
                        host: e.target.value,
                      },
                    })
                  }
                  className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-1.5 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Port
                  </label>
                  <input
                    type="number"
                    placeholder="587"
                    value={settings.smtpConfig?.port || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        smtpConfig: {
                          ...settings.smtpConfig,
                          port: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Secure (SSL/TLS)
                  </label>
                  <div className="h-[46px] px-5 bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl flex items-center justify-between">
                    <span className="text-sm font-semibold">
                      {settings.smtpConfig?.secure ? 'Yes' : 'No'}
                    </span>
                    <Switch
                      checked={settings.smtpConfig?.secure || false}
                      onCheckedChange={(checked) =>
                        setSettings({
                          ...settings,
                          smtpConfig: {
                            ...settings.smtpConfig,
                            secure: checked,
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 border-t border-border/20 pt-4 md:col-span-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">
                  Authentication
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      Username
                    </label>
                    <input
                      type="text"
                      placeholder="user@example.com"
                      value={settings.smtpConfig?.auth?.user || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          smtpConfig: {
                            ...settings.smtpConfig,
                            auth: {
                              ...settings.smtpConfig?.auth,
                              user: e.target.value,
                            },
                          },
                        })
                      }
                      className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      Password
                    </label>
                    <PasswordInput
                      placeholder="••••••••"
                      value={settings.smtpConfig?.auth?.pass || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          smtpConfig: {
                            ...settings.smtpConfig,
                            auth: {
                              ...settings.smtpConfig?.auth,
                              pass: e.target.value,
                            },
                          },
                        })
                      }
                      className="h-12"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 border-t border-border/20 pt-4 md:col-span-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">
                  Sender Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      From Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Loan Platform"
                      value={settings.smtpConfig?.fromName || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          smtpConfig: {
                            ...settings.smtpConfig,
                            fromName: e.target.value,
                          },
                        })
                      }
                      className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      From Email
                    </label>
                    <input
                      type="email"
                      placeholder="noreply@example.com"
                      value={settings.smtpConfig?.fromEmail || ''}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          smtpConfig: {
                            ...settings.smtpConfig,
                            fromEmail: e.target.value,
                          },
                        })
                      }
                      className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            isLoading={saving}
            variant="gradient"
            className="h-11 px-8 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
          >
            <Save size={14} className="mr-2" />
            Apply Global Changes
          </Button>
        </div>
      </form>

      <div className="pt-8 border-t border-border/20 space-y-6 relative z-10">
        <div>
          <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 mb-2">
            <Zap size={14} />
            Manual ACE Control
          </h3>
          <p className="text-muted-foreground text-[11px] font-medium leading-relaxed max-w-2xl">
            Immediately trigger a system-wide scan for upcoming and overdue loan
            reminders. Use this to catch up on communications if the automated
            engine was inactive.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-[2rem] bg-primary/5 border border-primary/10 group/ace hover:bg-primary/10 transition-colors duration-500">
          <div className="p-4 bg-primary/10 rounded-2xl group-hover/ace:scale-110 group-hover/ace:rotate-3 transition-transform duration-500">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-sm font-black uppercase tracking-widest mb-1">
              Trigger Automated Scan
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">
              The process runs in the background. Results will appear in loan
              communication logs.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTriggerACE}
            isLoading={triggeringACE}
            className="w-full sm:w-auto h-11 px-6 rounded-xl border-primary/20 hover:bg-primary text-primary hover:text-white font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
          >
            Execute Scan
          </Button>
        </div>
      </div>
    </section>
  );
};

// Simple Switch Component for this page
const Switch = ({ checked, onCheckedChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={onCheckedChange}
    className={`
      relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
      ${checked ? 'bg-primary' : 'bg-input dark:bg-slate-800'}
    `}
  >
    <span
      className={`
        inline-block h-4 w-4 transform rounded-full transition-transform
        ${checked ? 'translate-x-6 bg-primary-foreground' : 'translate-x-1 bg-primary'}
      `}
    />
  </button>
);

// Delete Account Confirmation Modal Component
const DeleteAccountConfirmModal = ({ isOpen, onClose }) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;

    setLoading(true);
    try {
      await api.delete('/auth/delete-account');
      toast.success('Account and all business data permanently deleted');

      // Cleanup and redirect
      localStorage.removeItem('user');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('userUpdated')); // Force sidebar refresh

      onClose();
      navigate('/');
    } catch (error) {
      console.error('Failed to delete account:', error);
      toast.error(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md rounded-[2.5rem] border border-rose-500/20 shadow-2xl shadow-rose-500/10">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
            <Info className="text-rose-500" size={24} />
          </div>
          <DialogTitle className="text-center text-xl font-black tracking-tight text-rose-500">
            Irreversible Deletion
          </DialogTitle>
          <p className="text-center text-xs text-muted-foreground font-medium px-4 pt-2 leading-relaxed">
            This will permanently remove your account, customers, loans, and all
            financial history. This action{' '}
            <span className="text-rose-500 font-bold uppercase underline">
              cannot be undone
            </span>
            .
          </p>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Confirm by typing <span className="text-rose-500">DELETE</span>
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full px-5 py-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all font-black uppercase tracking-widest text-center text-rose-600 placeholder:text-rose-500/30"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl border-slate-200 dark:border-slate-800 font-black text-[10px] uppercase tracking-widest"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              isLoading={loading}
              disabled={confirmText !== 'DELETE'}
              className="flex-[2] h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-500/20 font-black text-[10px] uppercase tracking-widest disabled:opacity-50 transition-all"
            >
              Permanently Delete Everything
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default Settings;
