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
  Smartphone,
  X,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const Settings = () => {
  const { theme, setTheme } = useTheme(); // Use Global Theme

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
                  <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                    {userInitials}
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
                <CustomerPortalPIN />
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

// Customer Portal PIN Component
const CustomerPortalPIN = () => {
  const [pin, setPin] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    fetchPin();
  }, []);

  const fetchPin = async () => {
    try {
      const { data } = await api.get('/auth/customer-portal-pin');
      setPin(data.pin);
    } catch (error) {
      console.error('Failed to fetch PIN:', error);
    }
  };

  const generatePin = async () => {
    try {
      setLoading(true);
      const { data } = await api.post('/auth/customer-portal-pin');
      setPin(data.pin);
      toast.success('Customer portal PIN generated successfully');
    } catch (error) {
      toast.error('Failed to generate PIN');
    } finally {
      setLoading(false);
    }
  };

  const copyPin = () => {
    if (pin) {
      navigator.clipboard.writeText(pin);
      toast.success('PIN copied to clipboard');
    }
  };

  return (
    <div className="pb-4 border-b border-border/50">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Lock size={18} className="text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">Customer Portal PIN</p>
            <p className="text-xs text-muted-foreground">
              6-digit PIN for customers to view their loans
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={generatePin}
          disabled={loading}
        >
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          {pin ? 'Regenerate' : 'Generate'} PIN
        </Button>
      </div>

      {pin && (
        <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Current PIN:
              </span>
              <code className="px-3 py-1.5 rounded-md bg-background border border-border font-mono text-lg font-bold tracking-widest">
                {showPin ? pin : '••••••'}
              </code>
              <button
                onClick={() => setShowPin(!showPin)}
                className="p-1.5 hover:bg-background rounded-md transition-colors"
              >
                {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <button
              onClick={copyPin}
              className="text-xs font-bold text-primary hover:text-primary/80 transition-colors"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this PIN with your customers to access the{' '}
            <a
              href="/loan-lookup"
              target="_blank"
              className="text-primary hover:underline"
            >
              loan lookup portal
            </a>
          </p>
        </div>
      )}
    </div>
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
