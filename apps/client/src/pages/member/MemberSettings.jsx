import { useState, useEffect, useRef } from 'react';
import PasswordInput from '@/components/ui/PasswordInput';
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
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Check,
  Copy,
  Trash2,
  QrCode,
  KeyRound,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, capitalize, formatCNIC, validateEmail } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import ColorPalette from '@/components/ui/ColorPalette';

const MemberSettings = () => {
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme();
  const [member, setMember] = useState(() =>
    JSON.parse(localStorage.getItem('member') || '{}'),
  );
  const [loading, setLoading] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const fileInputRef = useRef(null);

  // Modal States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Navigation State
  const [activeSection, setActiveSection] = useState('general');

  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(member.isTwoFactorEnabled);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');

  useEffect(() => {
    const fetchMemberData = async () => {
      try {
        const memberToken = localStorage.getItem('member');
        if (!memberToken) return;
        const { data } = await api.get('/member-auth/me', {
          headers: { /* Auth header handled by browser cookies */ },
        });
        setMember(data);
        localStorage.setItem('member', JSON.stringify(data));
      } catch (error) {
        console.error('Failed to fetch member data:', error);
      }
    };
    fetchMemberData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('member');
    localStorage.removeItem('member');
    window.location.href = '/member/login';
  };

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

  const initials =
    member.name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'M';

  return (
    <div className="relative min-h-[calc(100vh-8rem)] pb-12 animate-in fade-in duration-1000">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse delay-1000" />
      </div>

      <PageHeader
        title="Settings"
        description="Personalize your portal experience and manage your security."
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
                <span className="font-bold opacity-80">Status</span>
                <span className="px-2 py-0.5 rounded-md bg-white/20 font-black tracking-widest">
                  {member.status?.toUpperCase() || 'ACTIVE'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold opacity-80">Portal Access</span>
                <span className="px-2 py-0.5 rounded-md bg-white/20 font-black tracking-widest text-[8px]">
                  VERIFIED
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
              {activeSection === 'general' && (
                <>
                  <ProfileSection
                    member={member}
                    initials={initials}
                    onEdit={() => setIsProfileModalOpen(true)}
                    uploading={uploadingPicture}
                    setUploading={setUploadingPicture}
                    onUpload={() => fileInputRef.current?.click()}
                    fileInputRef={fileInputRef}
                    setMember={setMember}
                  />
                  <AppearanceSection
                    theme={theme}
                    setTheme={setTheme}
                    primaryColor={primaryColor}
                    setPrimaryColor={setPrimaryColor}
                  />
                  <DangerZoneSection
                    onDelete={() => setIsDeleteModalOpen(true)}
                  />
                </>
              )}
              {activeSection === 'security' && (
                <SecuritySection
                  onChangePassword={() => setIsPasswordModalOpen(true)}
                  onLogout={handleLogout}
                  is2FAEnabled={is2FAEnabled}
                  setIs2FAEnabled={setIs2FAEnabled}
                  qrCodeData={qrCodeData}
                  setQrCodeData={setQrCodeData}
                  twoFACode={twoFACode}
                  setTwoFACode={setTwoFACode}
                  twoFALoading={twoFALoading}
                  setTwoFALoading={setTwoFALoading}
                  disable2FAPassword={disable2FAPassword}
                  setDisable2FAPassword={setDisable2FAPassword}
                />
              )}
              {activeSection === 'notifications' && <NotificationSection />}
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
  initials,
  onEdit,
  uploading,
  setUploading,
  onUpload,
  fileInputRef,
  setMember,
}) => {
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      const memberToken = localStorage.getItem('member');
      const { data } = await api.put(
        '/member-auth/updateprofilepicture',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            /* Auth header handled by browser cookies */
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
      setUploading(false);
    }
  };

  return (
    <section className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden relative group">
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-primary/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="flex flex-col md:flex-row items-start justify-between gap-6 relative z-10">
        <div className="space-y-1">
          <h3 className="text-xl font-black tracking-tight">
            Profile Information
          </h3>
          <p className="text-muted-foreground text-xs font-medium">
            Manage your personal details and portal identity.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
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
              initials
            )}
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3 opacity-0 group-hover/avatar:opacity-100 transition-all duration-300">
              <button
                type="button"
                disabled={uploading}
                onClick={onUpload}
                className="bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-xl transition-all"
                title="Upload Picture"
              >
                {uploading ? (
                  <Loader2 size={16} className="text-white animate-spin" />
                ) : (
                  <Camera size={16} className="text-white" />
                )}
              </button>

              {member.profilePicture && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (uploading) return;
                    setUploading(true);
                    try {
                      const memberToken = localStorage.getItem('member');
                      const { data } = await api.delete(
                        '/member-auth/deleteprofilepicture',
                        {
                          headers: {
                            /* Auth header handled by browser cookies */
                          },
                        },
                      );
                      if (data.success) {
                        const updatedMember = {
                          ...member,
                          profilePicture: undefined,
                        };
                        setMember(updatedMember);
                        localStorage.setItem(
                          'member',
                          JSON.stringify(updatedMember),
                        );
                        window.dispatchEvent(new Event('memberUpdated'));
                        toast.success('Profile picture removed');
                      }
                    } catch (error) {
                      toast.error('Failed to remove profile picture');
                    } finally {
                      setUploading(false);
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
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>

        <div className="space-y-1 text-center sm:text-left">
          <h4 className="text-xl font-bold capitalize">{member.name}</h4>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-muted-foreground text-sm">
            <Mail size={14} />
            {member.email}
          </div>
          <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">
              {member.role || 'MEMBER'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

const AppearanceSection = ({
  theme,
  setTheme,
  primaryColor,
  setPrimaryColor,
}) => (
  <section className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-75 overflow-hidden group">
    <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

    <div className="relative z-10">
      <h3 className="text-xl font-black tracking-tight">Appearance</h3>
      <p className="text-muted-foreground text-xs font-medium mt-1">
        Customize your portal's look and feel.
      </p>
    </div>

    <div className="space-y-8 relative z-10">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { id: 'light', label: 'Light', icon: Sun, bg: 'bg-background' },
          {
            id: 'dark',
            label: 'Dark',
            icon: Moon,
            bg: 'bg-slate-950 text-white',
          },
          {
            id: 'system',
            label: 'System',
            icon: Laptop,
            bg: 'bg-gradient-to-r from-background to-slate-950',
          },
        ].map((mode) => (
          <button
            key={mode.id}
            onClick={() => setTheme(mode.id)}
            className={cn(
              'flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all',
              theme === mode.id
                ? 'border-primary bg-primary/5'
                : 'border-border/50 hover:bg-muted/50',
            )}
          >
            <div
              className={cn(
                'h-10 w-10 rounded-full border shadow-sm flex items-center justify-center',
                mode.bg,
              )}
            >
              <mode.icon
                size={20}
                className={mode.id === 'system' ? 'text-primary' : ''}
              />
            </div>
            <span className="font-bold text-[10px] uppercase tracking-widest">
              {mode.label}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1">
            Primary Accent
          </h4>
          <span className="text-[8px] font-black text-primary px-2 py-0.5 bg-primary/10 rounded uppercase tracking-widest">
            Modern Palette
          </span>
        </div>
        <ColorPalette
          primaryColor={primaryColor}
          setPrimaryColor={setPrimaryColor}
        />
      </div>
    </div>
  </section>
);

const SecuritySection = ({
  onChangePassword,
  onLogout,
  is2FAEnabled,
  setIs2FAEnabled,
  qrCodeData,
  setQrCodeData,
  twoFACode,
  setTwoFACode,
  twoFALoading,
  setTwoFALoading,
  disable2FAPassword,
  setDisable2FAPassword,
}) => (
  <section className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden group">
    <div className="absolute -left-12 -top-12 w-48 h-48 bg-violet-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

    <div className="relative z-10">
      <h3 className="text-xl font-black tracking-tight">Portal Security</h3>
      <p className="text-muted-foreground text-xs font-medium mt-1">
        Secure your account and sessions.
      </p>
    </div>

    <div className="space-y-6 relative z-10">
      <div className="flex items-center justify-between pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-xl">
            <Lock size={18} className="text-muted-foreground" />
          </div>
          <div>
            <p className="font-bold text-sm">Password</p>
            <p className="text-[10px] text-muted-foreground font-medium">
              Update your security credential
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onChangePassword}
          className="rounded-xl text-[10px] font-black uppercase tracking-widest"
        >
          Update
        </Button>
      </div>

      {/* 2FA Panel */}
      <div className="border border-border/50 rounded-2xl p-5 bg-muted/20 space-y-4 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <QrCode size={18} className="text-muted-foreground" />
            <div>
              <p className="font-bold text-sm">Two-Factor Authentication</p>
              <p className="text-[10px] text-muted-foreground font-medium">
                {is2FAEnabled
                  ? '2FA is currently active on your account.'
                  : 'Add an extra layer of security via TOTP app.'}
              </p>
            </div>
          </div>
          <span
            className={cn(
              'text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full',
              is2FAEnabled
                ? 'bg-emerald-500/10 text-emerald-600'
                : 'bg-muted text-muted-foreground',
            )}
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
                disabled={twoFALoading}
                onClick={async () => {
                  try {
                    setTwoFALoading(true);
                    const memberToken = localStorage.getItem('member');
                    const { data } = await api.post(
                      '/member-auth/2fa/generate',
                      {},
                      {
                        headers: { /* Auth header handled by browser cookies */ },
                      },
                    );
                    setQrCodeData(data.qrCode);
                  } catch (e) {
                    toast.error(
                      e.response?.data?.message || 'Failed to generate QR',
                    );
                  } finally {
                    setTwoFALoading(false);
                  }
                }}
                className="rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                {twoFALoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <QrCode size={14} />
                )}
                <span className="ml-2">Set Up 2FA</span>
              </Button>
            ) : (
              <div className="space-y-3 animate-in fade-in">
                <p className="text-[10px] text-muted-foreground font-medium">
                  Scan this QR code with Google Authenticator or Authy, then
                  enter the 6-digit code below to confirm.
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
                      maxLength={6}
                      placeholder="000000"
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value)}
                      className="w-full h-10 pl-9 pr-4 rounded-xl border border-border/50 bg-background outline-none focus:ring-2 focus:ring-primary/20 text-xs font-mono tracking-[0.5em]"
                    />
                  </div>
                  <Button
                    size="sm"
                    isLoading={twoFALoading}
                    disabled={twoFACode.length !== 6}
                    onClick={async () => {
                      try {
                        setTwoFALoading(true);
                        const memberToken = localStorage.getItem('member');
                        const { data } = await api.post(
                          '/member-auth/2fa/verify',
                          { code: twoFACode },
                          {
                            headers: { /* Auth header handled by browser cookies */ },
                          },
                        );
                        if (data.success) {
                          setIs2FAEnabled(true);
                          setQrCodeData(null);
                          setTwoFACode('');
                          toast.success('2FA enabled successfully!');
                          // Update local storage member data
                          const member = JSON.parse(
                            localStorage.getItem('member') || '{}',
                          );
                          member.isTwoFactorEnabled = true;
                          localStorage.setItem(
                            'member',
                            JSON.stringify(member),
                          );
                        }
                      } catch (e) {
                        toast.error(
                          e.response?.data?.message || 'Invalid code',
                        );
                      } finally {
                        setTwoFALoading(false);
                      }
                    }}
                    className="rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Verify
                  </Button>
                </div>
                <button
                  onClick={() => {
                    setQrCodeData(null);
                    setTwoFACode('');
                  }}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline w-full text-center"
                >
                  Cancel Setup
                </button>
              </div>
            )}
          </div>
        )}

        {is2FAEnabled && (
          <div className="pt-2 space-y-3">
            <p className="text-[10px] text-muted-foreground font-medium">
              To disable 2FA, please enter your password for confirmation.
            </p>
            <div className="flex gap-2">
              <PasswordInput
                placeholder="Enter password"
                value={disable2FAPassword}
                onChange={(e) => setDisable2FAPassword(e.target.value)}
                className="h-10 flex-1"
              />
              <Button
                size="sm"
                variant="destructive"
                isLoading={twoFALoading}
                disabled={!disable2FAPassword}
                onClick={async () => {
                  if (
                    !window.confirm(
                      'Are you sure you want to disable Two-Factor Authentication?',
                    )
                  )
                    return;
                  try {
                    setTwoFALoading(true);
                    const memberToken = localStorage.getItem('member');
                    const { data } = await api.post(
                      '/member-auth/2fa/disable',
                      { password: disable2FAPassword },
                      {
                        headers: { /* Auth header handled by browser cookies */ },
                      },
                    );
                    if (data.success) {
                      setIs2FAEnabled(false);
                      setDisable2FAPassword('');
                      toast.success('2FA disabled successfully');
                      // Update local storage member data
                      const member = JSON.parse(
                        localStorage.getItem('member') || '{}',
                      );
                      member.isTwoFactorEnabled = false;
                      localStorage.setItem('member', JSON.stringify(member));
                    }
                  } catch (e) {
                    toast.error(
                      e.response?.data?.message || 'Failed to disable 2FA',
                    );
                  } finally {
                    setTwoFALoading(false);
                  }
                }}
                className="rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                Disable
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 rounded-xl">
            <LogOut size={18} className="text-rose-500" />
          </div>
          <div>
            <p className="font-bold text-sm">Termination</p>
            <p className="text-[10px] text-muted-foreground font-medium">
              Close current active session
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onLogout}
          className="rounded-xl text-rose-500 border-rose-500/20 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-widest"
        >
          Log Out
        </Button>
      </div>
    </div>
  </section>
);

const NotificationSection = () => {
  const [notifs, setNotifs] = useState({ email: true, push: false });
  return (
    <section className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden group">
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-blue-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="relative z-10">
        <h3 className="text-xl font-black tracking-tight">Push & Alerts</h3>
        <p className="text-muted-foreground text-xs font-medium mt-1">
          Manage system notifications and delivery.
        </p>
      </div>

      <div className="space-y-4 relative z-10">
        {[
          {
            id: 'email',
            label: 'Email Alerts',
            desc: 'Receive deposit and profit summaries',
            icon: Mail,
            color: 'text-blue-600',
            bg: 'bg-blue-100 dark:bg-blue-900/30',
          },
          {
            id: 'push',
            label: 'Security Alerts',
            desc: 'Real-time login and activity alerts',
            icon: Smartphone,
            color: 'text-purple-600',
            bg: 'bg-purple-100 dark:bg-purple-900/30',
          },
        ].map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 rounded-2xl border border-border/50"
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center',
                  item.bg,
                  item.color,
                )}
              >
                <item.icon size={18} />
              </div>
              <div>
                <h4 className="font-bold text-sm leading-none mb-1">
                  {item.label}
                </h4>
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
    </section>
  );
};

const DangerZoneSection = ({ onDelete }) => (
  <section className="bg-rose-500/5 dark:bg-rose-500/10 backdrop-blur-xl border border-rose-500/20 rounded-[2.5rem] p-8 shadow-2xl shadow-rose-500/5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-150 overflow-hidden group">
    <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-rose-500/20 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

    <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-6">
      <div className="space-y-1">
        <h3 className="text-xl font-black tracking-tight text-rose-500">
          Danger Zone
        </h3>
        <p className="text-muted-foreground text-xs font-medium">
          Irreversible actions that affect your portal access.
        </p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDelete}
        className="rounded-xl border border-rose-500/20 hover:bg-rose-500/10 text-rose-500 text-[10px] font-black uppercase tracking-widest bg-white/20 dark:bg-black/20"
      >
        Delete Account Permanently
      </Button>
    </div>

    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 relative z-10">
      <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
        <AlertTriangle size={14} />
        WARNING: THIS ACTION WILL PERMANENTLY REMOVE YOUR PORTAL ACCESS AND
        DATA.
      </p>
    </div>
  </section>
);

const EditProfileModal = ({ isOpen, onClose, member, setMember }) => {
  const [formData, setFormData] = useState({
    name: member.name || '',
    email: member.email || '',
    cnic: member.cnic || '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        email: member.email || '',
        cnic: member.cnic || '',
      });
    }
  }, [member]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      toast.error(emailValidation.message);
      return;
    }
    setLoading(true);
    try {
      const memberToken = localStorage.getItem('member');
      const { data } = await api.put('/member-auth/updatedetails', formData, {
        headers: { /* Auth header handled by browser cookies */ },
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
      <DialogContent className="max-w-md rounded-[2.5rem] border-white/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight">
            Edit Profile
          </DialogTitle>
          <DialogDescription>
            Update your personal information including your name, email, and
            CNIC.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              CNIC Number (Required)
            </label>
            <input
              type="text"
              value={formData.cnic}
              onChange={(e) =>
                setFormData({ ...formData, cnic: formatCNIC(e.target.value) })
              }
              className="w-full h-12 px-5 rounded-2xl border border-border/50 bg-muted/20 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
              required
              placeholder="00000-0000000-0"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Full Name (Optional)
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full h-12 px-5 rounded-2xl border border-border/50 bg-muted/20 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Enter your name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full h-12 px-5 rounded-2xl border border-border/50 bg-muted/20 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Enter your email"
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
              isLoading={loading}
              className="px-8 h-10 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
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
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmNewPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (formData.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      const memberToken = localStorage.getItem('member');
      await api.put(
        '/member-auth/updatepassword',
        {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        },
        {
          headers: { /* Auth header handled by browser cookies */ },
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
      <DialogContent className="max-w-md rounded-[2.5rem] border-white/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight">
            Security Update
          </DialogTitle>
          <DialogDescription>
            Enter your current password and your new password to update your
            account security.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) =>
                  setFormData({ ...formData, currentPassword: e.target.value })
                }
                className="w-full h-12 px-5 rounded-2xl border border-border/50 bg-muted/20 outline-none focus:ring-2 focus:ring-primary/20"
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
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, newPassword: e.target.value })
                  }
                  minLength={8}
                  className="w-full h-12 px-5 rounded-2xl border border-border/50 bg-muted/20 outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  placeholder="Enter new password"
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
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Confirm New Password
              </label>
              <PasswordInput
                value={formData.confirmNewPassword}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    confirmNewPassword: e.target.value,
                  })
                }
                className="w-full h-12 px-5 rounded-2xl"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <Button
              type="submit"
              isLoading={loading}
              className="px-8 h-10 rounded-full text-[10px] font-black uppercase tracking-widest"
            >
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
    if (confirmText !== 'DELETE') return;
    setLoading(true);
    try {
      const memberToken = localStorage.getItem('member');
      await api.delete('/member-auth/deleteaccount', {
        headers: { /* Auth header handled by browser cookies */ },
      });
      toast.success('Account deleted successfully');
      localStorage.removeItem('member');
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
      <DialogContent className="max-w-md rounded-[2.5rem] border border-rose-500/20 shadow-2xl">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="text-rose-500" size={24} />
          </div>
          <DialogTitle className="text-center text-xl font-black tracking-tight text-rose-500">
            Irreversible Deletion
          </DialogTitle>
          <DialogDescription className="text-center text-[10px] text-muted-foreground font-medium px-4 pt-2">
            This will permanently remove your portal access and activity
            history. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-center block">
              Type <span className="text-rose-500">DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-5 py-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 focus:border-rose-500 text-center font-black uppercase tracking-widest text-rose-600"
              placeholder="DELETE"
            />
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              isLoading={loading}
              disabled={confirmText !== 'DELETE'}
              className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 shadow-lg shadow-rose-500/20 font-black text-[10px] uppercase tracking-widest"
            >
              Confirm Deletion
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Switch = ({ checked, onCheckedChange }) => (
  <button
    role="switch"
    aria-checked={checked}
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
      checked ? 'bg-primary' : 'bg-muted dark:bg-slate-800',
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
