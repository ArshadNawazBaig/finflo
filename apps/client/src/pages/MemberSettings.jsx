import { useState, useEffect, useRef } from 'react';
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
  Layout,
  AlertTriangle,
  Eye,
  EyeOff,
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
  const [member, setMember] = useState(() =>
    JSON.parse(localStorage.getItem('member') || '{}'),
  );
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const fileInputRef = useRef(null);

  // Modal States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        const memberToken = localStorage.getItem('memberToken');
        if (!memberToken) return;
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

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('profilePicture', file);

    setUploadingPicture(true);
    try {
      const memberToken = localStorage.getItem('memberToken');
      const { data } = await api.put(
        '/member-auth/updateprofilepicture',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${memberToken}`,
          },
        },
      );

      if (data.success) {
        const updatedMember = {
          ...member,
          profilePicture: data.profilePicture,
        };
        setMember(updatedMember);
        localStorage.setItem('member', JSON.stringify(updatedMember));
        toast.success('Profile picture updated');
        window.dispatchEvent(new Event('memberUpdated'));
      }
    } catch (error) {
      toast.error('Failed to upload picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'appearance', label: 'Appearance', icon: Layout },
    { id: 'notifications', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 pb-20">
      <PageHeader
        title="Settings"
        description="Personalize your portal experience and manage your security."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1 space-y-4">
          <div className="p-2 bg-card/50 backdrop-blur-xl border border-border/50 rounded-[2.5rem] shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full group flex items-center gap-4 p-4 rounded-[1.8rem] transition-all duration-300',
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  <Icon size={18} />
                  <span className="font-bold text-xs uppercase tracking-widest">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {activeTab === 'profile' && (
                <ProfileSection
                  member={member}
                  onEdit={() => setIsProfileModalOpen(true)}
                  onChangePassword={() => setIsPasswordModalOpen(true)}
                  onUpload={() => fileInputRef.current?.click()}
                  uploading={uploadingPicture}
                  fileInputRef={fileInputRef}
                  onFileChange={handleProfilePictureUpload}
                />
              )}
              {activeTab === 'appearance' && (
                <AppearanceSection
                  theme={theme}
                  setTheme={setTheme}
                  primaryColor={primaryColor}
                  setPrimaryColor={setPrimaryColor}
                />
              )}
              {activeTab === 'notifications' && <NotificationSection />}

              {activeTab === 'profile' && (
                <DangerZoneSection
                  onDelete={() => setIsDeleteModalOpen(true)}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <EditProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        member={member}
        setMember={setMember}
      />
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  );
};

const ProfileSection = ({
  member,
  onEdit,
  onChangePassword,
  onUpload,
  uploading,
  fileInputRef,
  onFileChange,
}) => {
  const initials =
    member.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'M';

  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border/50 shadow-sm space-y-8">
      <div className="flex flex-col sm:flex-row items-center gap-8">
        <div className="relative group/avatar">
          <div className="h-24 w-24 rounded-[2rem] bg-primary/10 flex items-center justify-center text-3xl font-black text-primary overflow-hidden border-4 border-card shadow-lg transition-all">
            {member.profilePicture ? (
              <img
                src={member.profilePicture}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              initials
            )}
            <button
              onClick={onUpload}
              disabled={uploading}
              className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity"
            >
              {uploading ? (
                <Loader2 className="animate-spin text-white" />
              ) : (
                <Camera size={20} className="text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              onChange={onFileChange}
            />
          </div>
        </div>
        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-2xl font-black tracking-tight capitalize">
            {member.name}
          </h3>
          <p className="text-muted-foreground font-medium mb-4">
            {member.email}
          </p>
          <div className="flex flex-wrap items-center gap-3 justify-center sm:justify-start">
            <Button
              onClick={onEdit}
              variant="outline"
              size="sm"
              className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest"
            >
              Edit Details
            </Button>
            <Button
              onClick={onChangePassword}
              variant="outline"
              size="sm"
              className="rounded-xl px-4 text-[10px] font-black uppercase tracking-widest"
            >
              Change Password
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AppearanceSection = ({
  theme,
  setTheme,
  primaryColor,
  setPrimaryColor,
}) => (
  <div className="bg-card p-8 rounded-[2.5rem] border border-border/50 shadow-sm space-y-8">
    <div>
      <h3 className="text-xl font-black tracking-tight mb-2">
        Theme Preferences
      </h3>
      <p className="text-muted-foreground text-sm">
        Choose how you want the portal to look.
      </p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[
        { id: 'light', label: 'Light', icon: Sun },
        { id: 'dark', label: 'Dark', icon: Moon },
        { id: 'system', label: 'System', icon: Laptop },
      ].map((mode) => (
        <button
          key={mode.id}
          onClick={() => setTheme(mode.id)}
          className={cn(
            'flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all',
            theme === mode.id
              ? 'border-primary bg-primary/5'
              : 'border-border/50 hover:bg-muted/50',
          )}
        >
          <mode.icon size={24} />
          <span className="font-bold text-xs uppercase tracking-widest">
            {mode.label}
          </span>
        </button>
      ))}
    </div>
    <div className="pt-6 border-t border-border/50">
      <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">
        Color Accent
      </h4>
      <ColorPalette
        primaryColor={primaryColor}
        setPrimaryColor={setPrimaryColor}
      />
    </div>
  </div>
);

const NotificationSection = () => {
  const [notifs, setNotifs] = useState({ email: true, push: false });
  return (
    <div className="bg-card p-8 rounded-[2.5rem] border border-border/50 shadow-sm space-y-6">
      <h3 className="text-xl font-black tracking-tight">
        Email & Security Alerts
      </h3>
      <div className="space-y-4">
        {[
          {
            id: 'email',
            label: 'Email Notifications',
            desc: 'Receive deposit and profit alerts via email',
            icon: Mail,
          },
          {
            id: 'push',
            label: 'Security Alerts',
            desc: 'Real-time alerts for login and security events',
            icon: Shield,
          },
        ].map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 rounded-2xl border border-border/50"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-muted rounded-xl text-primary">
                <item.icon size={20} />
              </div>
              <div>
                <p className="font-bold text-sm tracking-tight">{item.label}</p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {item.desc}
                </p>
              </div>
            </div>
            <Switch
              checked={notifs[item.id]}
              onCheckedChange={(val) =>
                setNotifs({ ...notifs, [item.id]: val })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const DangerZoneSection = ({ onDelete }) => (
  <div className="bg-rose-500/5 border border-rose-500/20 p-8 rounded-[2.5rem] space-y-4">
    <div className="flex items-center justify-between gap-4">
      <div>
        <h3 className="text-xl font-black tracking-tight text-rose-500">
          Danger Zone
        </h3>
        <p className="text-muted-foreground text-xs font-medium">
          Irrecoverable actions concerning your account.
        </p>
      </div>
      <Button
        onClick={onDelete}
        variant="outline"
        className="text-rose-500 border-rose-500/20 hover:bg-rose-500/10 rounded-xl font-black uppercase tracking-widest text-[10px]"
      >
        Delete Account
      </Button>
    </div>
  </div>
);

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
        window.dispatchEvent(new Event('memberUpdated'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight">
            Edit Profile
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full h-12 px-4 rounded-xl border border-border/50 bg-muted/20 focus:bg-background transition-all outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full h-12 px-4 rounded-xl border border-border/50 bg-muted/20 focus:bg-background transition-all outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={loading}
              className="px-8 h-10 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

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
        { headers: { Authorization: `Bearer ${memberToken}` } },
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tight">
            Security Update
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) =>
                  setFormData({ ...formData, currentPassword: e.target.value })
                }
                className="w-full h-12 px-4 rounded-xl border border-border/50 bg-muted/20 outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
                  }
                  className="w-full h-12 px-4 rounded-xl border border-border/50 bg-muted/20 outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">
                Confirm New Password
              </label>
              <input
                type={showNew ? 'text' : 'password'}
                value={formData.confirmNewPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmNewPassword: e.target.value,
                  })
                }
                className="w-full h-12 px-4 rounded-xl border border-border/50 bg-muted/20 outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              disabled={loading}
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

const DeleteAccountModal = ({ isOpen, onClose }) => {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') {
      toast.error('Please type DELETE to confirm');
      return;
    }

    setLoading(true);
    try {
      const memberToken = localStorage.getItem('memberToken');
      await api.delete('/member-auth/deleteaccount', {
        headers: { Authorization: `Bearer ${memberToken}` },
      });
      toast.success('Account deleted successfully');
      localStorage.removeItem('memberToken');
      localStorage.removeItem('member');
      window.location.href = '/member/login';
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-500">
            <AlertTriangle size={20} />
            Delete Account
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <p className="text-sm font-bold text-rose-600 dark:text-rose-400">
              This action cannot be undone. This will permanently delete your
              account and remove all your data.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">
              Type <span className="font-black text-rose-500">DELETE</span> to
              confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-rose-500/20 rounded-md text-foreground bg-transparent mt-2"
              placeholder="DELETE"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <Button
              onClick={handleDelete}
              disabled={loading || confirmText !== 'DELETE'}
              className="px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest bg-rose-500 hover:bg-rose-600 text-white"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete Account
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Switch = ({ checked, onCheckedChange }) => (
  <button
    type="button"
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
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

export default MemberSettings;
