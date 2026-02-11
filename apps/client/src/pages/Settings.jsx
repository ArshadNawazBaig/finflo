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
} from 'lucide-react';
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

  // Modal States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedSecurityCode, setCopiedSecurityCode] = useState(false);

  // Fetch latest user data on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data } = await api.get('/auth/me');
        setUser(data);
        localStorage.setItem('user', JSON.stringify(data));
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
    localStorage.removeItem('token');
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

  return (
    <div className="space-y-6 pb-10">
      <PageHeader title="Settings" />

      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-6">
        {/* Sidebar Navigation */}
        <div className="space-y-1">
          <button
            onClick={() => setActiveSection('general')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeSection === 'general'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <User size={18} />
            General
          </button>
          <button
            onClick={() => setActiveSection('security')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeSection === 'security'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Shield size={18} />
            Security
          </button>
          <button
            onClick={() => setActiveSection('notifications')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              activeSection === 'notifications'
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Bell size={18} />
            Notifications
          </button>
          {['admin', 'Admin'].includes(user.role) && (
            <button
              onClick={() => setActiveSection('configuration')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeSection === 'configuration'
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Sliders size={18} />
              Configuration
            </button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          {/* General Section: Profile + Appearance */}
          {activeSection === 'general' && (
            <>
              {/* Profile Section */}
              <section className="bg-card border border-border/50 rounded-xl p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold">Profile Information</h3>
                    <p className="text-muted-foreground text-sm">
                      Update your account's public information and email
                      address.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsProfileModalOpen(true)}
                  >
                    Edit Profile
                  </Button>
                </div>

                <div className="flex items-center gap-6 py-4">
                  <div className="relative group">
                    <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary overflow-hidden border-4 border-card shadow-sm group-hover:border-primary/20 transition-all cursor-pointer">
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
                      <div
                        className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() =>
                          document.getElementById('profile-upload').click()
                        }
                      >
                        <div className="bg-white/20 backdrop-blur-sm p-1.5 rounded-full">
                          {loading ? (
                            <Loader2
                              size={16}
                              className="text-white animate-spin"
                            />
                          ) : (
                            <Camera size={16} className="text-white" />
                          )}
                        </div>
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
                    <h4 className="text-xl font-bold">
                      {user.name || 'John Doe'}
                    </h4>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Mail size={14} />
                      {user.email || 'john.doe@example.com'}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                        {user.role || 'User'}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Appearance Section */}
              <section className="bg-card border border-border/50 rounded-xl p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300 delay-75">
                <div>
                  <h3 className="text-lg font-bold">Appearance</h3>
                  <p className="text-muted-foreground text-sm">
                    Customize the interface look and feel.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Mode Toggle */}
                  <div className="grid grid-cols-3 gap-4">
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
            <section className="bg-card border border-border/50 rounded-xl p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-bold">Notifications</h3>
                <p className="text-muted-foreground text-sm">
                  Manage how you receive updates and alerts.
                </p>
              </div>

              <div className="space-y-4">
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
            <section className="bg-card border border-border/50 rounded-xl p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-bold">Security</h3>
                <p className="text-muted-foreground text-sm">
                  Manage your password and session security.
                </p>
              </div>

              <div className="space-y-4">
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
                <div className="flex items-start justify-between pb-4 border-b border-border/50">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className="text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">
                        Business Security Code
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Share this code with your members for portal access
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
                      onClick={() => {
                        navigator.clipboard.writeText(user.securityCode || '');
                        setCopiedSecurityCode(true);
                        toast.success('Security code copied to clipboard');
                        setTimeout(() => setCopiedSecurityCode(false), 2000);
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
          {activeSection === 'configuration' && <ConfigurationSection />}
        </div>
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
    </div>
  );
};

const EditProfileModal = ({ isOpen, onClose, user, setUser }) => {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', email: user.email || '' });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/auth/updatedetails', formData);
      if (data.success) {
        const updatedUser = { ...user, ...data.data };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        toast.success('Profile updated successfully');
        onClose();
        // Force reload to update context if needed, or simple enough for now
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
              className="w-full px-3 py-2 border rounded-md"
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
              className="w-full px-3 py-2 border rounded-md"
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
            <input
              type="password"
              value={formData.currentPassword}
              onChange={(e) =>
                setFormData({ ...formData, currentPassword: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-md"
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
              className="w-full px-3 py-2 border rounded-md"
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
              className="w-full px-3 py-2 border rounded-md"
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

// Configuration Section Component
const ConfigurationSection = () => {
  const [settings, setSettings] = useState({
    defaultInterestRate: 5,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
      await api.put('/system-settings/loan-configuration', settings);
      toast.success('Loan configuration updated successfully');
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
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
    <section className="bg-card border border-border/50 rounded-xl p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-lg font-bold">Loan Configuration</h3>
        <p className="text-muted-foreground text-sm">
          Manage global defaults for new loans.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Default Annual Interest Rate (%)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={settings.defaultInterestRate}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  defaultInterestRate: parseFloat(e.target.value),
                })
              }
              className="w-full px-3 py-2 border rounded-md pr-8 bg-transparent"
              required
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
              %
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            This rate is used to calculate estimated EMIs for new loan requests.
          </p>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={saving}
            variant="gradient"
            className="px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save Configuration
          </Button>
        </div>
      </form>
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
      ${checked ? 'bg-primary' : 'bg-input'}
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

export default Settings;
