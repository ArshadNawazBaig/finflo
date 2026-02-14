import { useState, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
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
  Loader2,
  Camera,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, capitalize } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import ColorPalette from '@/components/ui/ColorPalette';

const MemberSettings = () => {
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme();

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('memberNotifications');
    return saved
      ? JSON.parse(saved)
      : {
          email: true,
          push: false,
        };
  });

  const [member, setMember] = useState(() =>
    JSON.parse(localStorage.getItem('member') || '{}'),
  );

  // Modal States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch latest member data on mount
  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        const memberToken = localStorage.getItem('memberToken');
        const { data } = await api.get('/member-auth/me', {
          headers: { Authorization: `Bearer ${memberToken}` },
        });
        setMember(data);
        localStorage.setItem('member', JSON.stringify(data));
      } catch (error) {
        console.error('Failed to fetch member data:', error);
      }
    };
    fetchMemberData();
  }, []);

  // Notifications Effect
  useEffect(() => {
    localStorage.setItem('memberNotifications', JSON.stringify(notifications));
  }, [notifications]);

  const handleToggle = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
    localStorage.removeItem('memberToken');
    localStorage.removeItem('member');
    window.location.href = '/member/login';
  };

  const memberInitials = member.name
    ? member.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'MB';

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

  return (
    <div className="relative min-h-[calc(100vh-8rem)] pb-12 animate-in fade-in duration-1000">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <PageHeader
        title="Member Settings"
        description="Manage your profile, notifications, security, and preferences."
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
              Account Status
            </h4>
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold opacity-80">Verification</span>
                <span className="px-2 py-0.5 rounded-md bg-white/20 font-black tracking-widest">
                  VERIFIED
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
              className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/50 dark:border-slate-800/50 rounded-[3rem] p-8 sm:p-12 shadow-2xl shadow-black/5 min-h-[600px] relative overflow-hidden"
            >
              {/* General Section: Profile + Appearance */}
              {activeSection === 'general' && (
                <>
                  {/* Profile Section */}
                  <section className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden relative group mb-8">
                    <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="flex flex-col md:flex-row items-start justify-between gap-6 relative z-10">
                      <div className="space-y-1">
                        <h3 className="text-xl font-black tracking-tight">
                          Profile Information
                        </h3>
                        <p className="text-muted-foreground text-xs font-medium">
                          Update your account's public identity.
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
                          {member.profilePicture ? (
                            <img
                              src={member.profilePicture}
                              alt="Profile"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            memberInitials
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-xl font-bold capitalize">
                          {capitalize(member.name || 'Member')}
                        </h4>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Mail size={14} />
                          {member.email || 'member@example.com'}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                            Member
                          </span>
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
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        member={member}
        setMember={setMember}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
};

const EditProfileModal = ({ isOpen, onClose, member, setMember }) => {
  const [formData, setFormData] = useState({
    name: member.name || '',
    email: member.email || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setFormData({ name: member.name || '', email: member.email || '' });
    }
  }, [member]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const memberToken = localStorage.getItem('memberToken');
      const { data } = await api.put('/member-auth/updatedetails', formData, {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      if (data.success) {
        const updatedMember = { ...member, ...data.data };
        localStorage.setItem('member', JSON.stringify(updatedMember));
        setMember(updatedMember);
        toast.success('Profile updated successfully');
        onClose();
        window.location.reload();
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
              className="w-full px-3 py-2 border rounded-md text-foreground bg-transparent"
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
              disabled={loading}
              variant="gradient"
              className="px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
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
    setLoading(true);
    try {
      const memberToken = localStorage.getItem('memberToken');
      await api.put(
        '/member-auth/updatepassword',
        {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        },
        {
          headers: { Authorization: `Bearer ${memberToken}` },
        },
      );
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
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) =>
                setFormData({ ...formData, currentPassword: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md text-foreground bg-transparent"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">New Password</label>
            <input
              type="password"
              value={formData.newPassword}
              onChange={(e) =>
                setFormData({ ...formData, newPassword: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md text-foreground bg-transparent"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Confirm New Password</label>
            <input
              type="password"
              value={formData.confirmNewPassword}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  confirmNewPassword: e.target.value,
                })
              }
              className="w-full px-3 py-2 border rounded-md text-foreground bg-transparent"
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
              disabled={loading}
              variant="gradient"
              className="px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Simple Switch component (if not already available)
const Switch = ({ checked, onCheckedChange }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        checked ? 'bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
};

export default MemberSettings;
