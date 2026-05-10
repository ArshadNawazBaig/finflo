import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useForm } from 'react-hook-form';
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
  Sliders,
  Smartphone,
  Loader2,
  Copy,
  Check,
  ShieldCheck,
  Camera,
  Upload,
  Zap,
  Info,
  Sparkles,
  Save,
  Trash2,
  QrCode,
  KeyRound,
  UserPlus,
  BookOpen,
  AlertTriangle,
  Landmark,
  Fingerprint,
  ArrowUpCircle,
  Star,
  MessageSquareQuote,
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
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import ColorPalette from '@/components/ui/ColorPalette';
import { useAtom } from 'jotai';
import { userAtom } from '@/atoms';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// ─── Review Section Component ──────────────────────────────────────────
const ReviewSection = () => {
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    reviewerName: '',
    reviewerRole: '',
    content: '',
    rating: 5,
  });

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const { data } = await api.get('/reviews/mine');
        if (data.success && data.data) {
          setReview(data.data);
          setReviewForm({
            reviewerName: data.data.reviewerName || '',
            reviewerRole: data.data.reviewerRole || '',
            content: data.data.content || '',
            rating: data.data.rating || 5,
          });
        }
      } catch (error) {
        // No review yet — that's fine
      } finally {
        setReviewLoading(false);
      }
    };
    fetchReview();
  }, []);

  const handleSaveReview = async () => {
    if (!reviewForm.reviewerName.trim() || !reviewForm.content.trim()) {
      toast.error('Please fill in your name and review');
      return;
    }
    if (reviewForm.content.length > 300) {
      toast.error('Review must be 300 characters or less');
      return;
    }
    setReviewSaving(true);
    try {
      const { data } = await api.post('/reviews', reviewForm);
      if (data.success) {
        setReview(data.data);
        toast.success('Review saved! It will appear on our landing page.');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save review');
    } finally {
      setReviewSaving(false);
    }
  };

  const handleDeleteReview = async () => {
    setReviewSaving(true);
    try {
      const { data } = await api.delete('/reviews');
      if (data.success) {
        setReview(null);
        setReviewForm({ reviewerName: '', reviewerRole: '', content: '', rating: 5 });
        toast.success('Review removed');
      }
    } catch (error) {
      toast.error('Failed to delete review');
    } finally {
      setReviewSaving(false);
    }
  };

  if (reviewLoading) {
    return (
      <section className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-20 w-full" />
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 delay-100 overflow-hidden relative group">
      <div className="absolute -left-12 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

      <div className="flex flex-col md:flex-row items-start justify-between gap-4 relative z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MessageSquareQuote size={20} className="text-amber-500" />
            <h3 className="text-xl font-black tracking-tight">
              Your Review
            </h3>
          </div>
          <p className="text-muted-foreground text-xs font-medium">
            Share your experience — it will be featured on our landing page.
          </p>
        </div>
        {review && (
          <button
            onClick={handleDeleteReview}
            disabled={reviewSaving}
            className="text-rose-500 hover:text-rose-600 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
          >
            <Trash2 size={14} />
            Remove Review
          </button>
        )}
      </div>

      <div className="relative z-10 space-y-5">
        {/* Star Rating */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Rating
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setReviewForm((prev) => ({ ...prev, rating: star }))}
                className="p-0.5 hover:scale-110 transition-transform"
              >
                <Star
                  size={24}
                  className={`transition-colors ${
                    star <= reviewForm.rating
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-slate-200 dark:text-slate-700'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Name & Role */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Your Name
            </label>
            <input
              type="text"
              value={reviewForm.reviewerName}
              onChange={(e) => setReviewForm((prev) => ({ ...prev, reviewerName: e.target.value }))}
              placeholder="e.g. Ahmed Khan"
              className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background/50 text-sm font-medium placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Your Role
            </label>
            <input
              type="text"
              value={reviewForm.reviewerRole}
              onChange={(e) => setReviewForm((prev) => ({ ...prev, reviewerRole: e.target.value }))}
              placeholder="e.g. CEO, Founder"
              className="w-full px-4 py-2.5 rounded-xl border border-border/50 bg-background/50 text-sm font-medium placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
            />
          </div>
        </div>

        {/* Review Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Your Review
            </label>
            <span className={`text-[10px] font-bold ${
              reviewForm.content.length > 300 ? 'text-rose-500' : 'text-muted-foreground/60'
            }`}>
              {reviewForm.content.length}/300
            </span>
          </div>
          <textarea
            value={reviewForm.content}
            onChange={(e) => setReviewForm((prev) => ({ ...prev, content: e.target.value }))}
            placeholder="Share what you love about FinFlo..."
            rows={3}
            maxLength={300}
            className="w-full px-4 py-3 rounded-xl border border-border/50 bg-background/50 text-sm font-medium placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all resize-none"
          />
        </div>

        {/* Submit */}
        <Button
          onClick={handleSaveReview}
          disabled={reviewSaving || !reviewForm.reviewerName.trim() || !reviewForm.content.trim()}
          className="rounded-xl text-[10px] font-black uppercase tracking-widest px-6"
        >
          {reviewSaving ? (
            <Loader2 size={14} className="animate-spin mr-2" />
          ) : (
            <Save size={14} className="mr-2" />
          )}
          {review ? 'Update Review' : 'Submit Review'}
        </Button>
      </div>
    </section>
  );
};

const Settings = () => {
  const { theme, setTheme, primaryColor, setPrimaryColor } = useTheme(); // Use Global Theme
  const navigate = useNavigate();

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

  const [user, setUser] = useAtom(userAtom);

  const isManager = user.isManager && user.role === 'staff';
  const isAdmin = ['admin', 'Admin', 'super_admin', 'staff'].includes(
    user.role,
  );

  // Modal States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);
  const [stampLoading, setStampLoading] = useState(false);
  const [signatureLoading, setSignatureLoading] = useState(false);
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
        // Merge to preserve the token stored at login
        setUser((prev) => ({ ...prev, ...data }));
      } catch (error) {
        console.error('Failed to fetch user data:', error);
      }
    };
    fetchUserData();
  }, [setUser]);

  // Notifications Effect
  useEffect(() => {
    localStorage.setItem('notifications', JSON.stringify(notifications));
  }, [notifications]);

  const handleToggle = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLogout = () => {
    setUser(null);
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
              className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl border border-white/50 dark:border-slate-800/50 rounded-[3rem] p-0 sm:p-12 shadow-2xl shadow-black/5 min-h-[600px] relative overflow-hidden flex flex-col gap-6"
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
                              referrerPolicy="no-referrer"
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
                                      setUser((prev) => ({
                                        ...prev,
                                        profilePicture: undefined,
                                      }));
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
                                setUser((prev) => ({
                                  ...prev,
                                  profilePicture: data.profilePicture,
                                }));
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

                  {/* Business Branding Section */}
                  {isAdmin && (
                    <section className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-50 overflow-hidden relative group">
                      <div className="absolute -right-12 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                      <div className="flex flex-col md:flex-row items-start justify-between gap-6 relative z-10">
                        <div className="space-y-1">
                          <h3 className="text-xl font-black tracking-tight">
                            Business Branding
                          </h3>
                          <p className="text-muted-foreground text-xs font-medium">
                            Customize your organization's identity for emails
                            and documents.
                          </p>
                        </div>
                        {user.role !== 'super_admin' &&
                          user.plan === 'Free' && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-600 rounded-2xl border border-amber-500/20 animate-pulse">
                              <Zap size={14} className="fill-amber-500" />
                              <span className="text-[10px] font-black uppercase tracking-widest">
                                Upgrade to Unlock
                              </span>
                            </div>
                          )}
                      </div>

                      <div className="relative">
                        {user.role !== 'super_admin' &&
                          (user.plan === 'Free' || user.plan === 'Basic') && (
                            <div className="absolute inset-0 z-20 backdrop-blur-[2px] bg-white/10 dark:bg-black/10 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 border border-white/20">
                              <div className="p-4 rounded-full bg-white/80 dark:bg-slate-800/80 shadow-2xl">
                                <Lock size={32} className="text-primary" />
                              </div>
                              <div className="text-center space-y-1">
                                <p className="font-black text-sm uppercase tracking-widest">
                                  Basic or Pro Feature
                                </p>
                                <p className="text-[10px] font-medium text-muted-foreground max-w-[200px]">
                                  Business branding is only available for our
                                  premium partners.
                                </p>
                              </div>
                              <Button
                                onClick={() => navigate('/pricing')}
                                variant="gradient"
                                size="lg"
                                className="rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20"
                              >
                                Upgrade Plan
                              </Button>
                            </div>
                          )}
                        <div
                          className={cn(
                            'flex flex-col sm:flex-row items-center gap-8 py-4 relative z-10',
                            user.role !== 'super_admin' &&
                              (user.plan === 'Free' || user.plan === 'Basic') &&
                              'opacity-20 grayscale-[0.1]',
                          )}
                        >
                          <div className="relative group/logo">
                            <div className="h-24 w-48 rounded-[2rem] bg-indigo-500/5 flex items-center justify-center text-3xl font-black text-primary overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl group-hover/logo:border-primary/20 transition-all cursor-pointer">
                              {logoLoading ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="animate-spin text-primary" />
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Processing...
                                  </span>
                                </div>
                              ) : user.businessLogo ? (
                                <img
                                  src={user.businessLogo}
                                  alt="Business Logo"
                                  className="w-full h-full object-contain p-2"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="flex flex-col items-center gap-1 opacity-40">
                                  <Sparkles size={24} />
                                  <span className="text-[10px] uppercase tracking-widest">
                                    Upload Logo
                                  </span>
                                </div>
                              )}

                              {/* Hover Overlay */}
                              <div className="absolute inset-0 bg-black/60 flex items-center justify-center gap-3 opacity-0 group-hover/logo:opacity-100 transition-all duration-300">
                                <button
                                  type="button"
                                  disabled={loading}
                                  onClick={() =>
                                    document
                                      .getElementById('business-logo-upload')
                                      .click()
                                  }
                                  className="bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-xl transition-all"
                                  title="Upload Logo"
                                >
                                  {logoLoading ? (
                                    <Loader2
                                      size={16}
                                      className="text-white animate-spin"
                                    />
                                  ) : (
                                    <Upload size={16} className="text-white" />
                                  )}
                                </button>

                                {user.businessLogo && (
                                  <button
                                    type="button"
                                    disabled={logoLoading}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (logoLoading) return;
                                      setLogoLoading(true);
                                      try {
                                        const { data } = await api.delete(
                                          '/auth/delete-business-logo',
                                        );
                                        if (data.success) {
                                          setUser((prev) => ({
                                            ...prev,
                                            businessLogo: undefined,
                                          }));
                                          toast.success(
                                            'Business logo removed',
                                          );
                                        }
                                      } catch (error) {
                                        toast.error(
                                          'Failed to delete business logo',
                                        );
                                      } finally {
                                        setLogoLoading(false);
                                      }
                                    }}
                                    className={`bg-rose-500/40 hover:bg-rose-500/60 backdrop-blur-md p-2 rounded-xl transition-all ${
                                      logoLoading
                                        ? 'opacity-50 cursor-not-allowed'
                                        : ''
                                    }`}
                                    title="Delete Logo"
                                  >
                                    {logoLoading ? (
                                      <Loader2
                                        size={16}
                                        className="text-white animate-spin"
                                      />
                                    ) : (
                                      <Trash2
                                        size={16}
                                        className="text-white"
                                      />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            <input
                              type="file"
                              id="business-logo-upload"
                              className="hidden"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;

                                if (file.size > 2 * 1024 * 1024) {
                                  toast.error('Logo must be less than 2MB');
                                  return;
                                }

                                const formData = new FormData();
                                formData.append('businessLogo', file);

                                setLogoLoading(true);
                                try {
                                  const { data } = await api.put(
                                    '/auth/updatebusinesslogo',
                                    formData,
                                    {
                                      headers: {
                                        'Content-Type': 'multipart/form-data',
                                      },
                                    },
                                  );

                                  if (data.success) {
                                    setUser((prev) => ({
                                      ...prev,
                                      businessLogo: data.businessLogo,
                                    }));
                                    toast.success('Business logo updated');
                                  }
                                } catch (error) {
                                  console.error(error);
                                  toast.error('Failed to update business logo');
                                } finally {
                                  setLogoLoading(false);
                                }
                              }}
                            />
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-xl font-bold capitalize">
                              {user.businessName || 'Business Name'}
                            </h4>
                            <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                              <Sparkles size={14} className="text-primary" />
                              Email Branding Active
                            </div>
                            <p className="text-[10px] text-muted-foreground max-w-xs mt-2 italic leading-relaxed">
                              Adding a business logo will prioritize it over the
                              default FinFlo branding in all outgoing emails and
                              downloadable statements.
                            </p>
                          </div>
                        </div>

                        {/* Business Stamp and CEO Signature */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-border/30 relative z-10">
                          {/* Business Stamp */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground underline decoration-primary/30 decoration-2 underline-offset-8">
                                Business Stamp
                              </h4>
                              {user.businessStamp && (
                                <button
                                  disabled={stampLoading}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (stampLoading) return;
                                    try {
                                      setStampLoading(true);
                                      const { data } = await api.delete(
                                        '/auth/delete-business-stamp',
                                      );
                                      if (data.success) {
                                        setUser((prev) => ({
                                          ...prev,
                                          businessStamp: undefined,
                                        }));
                                        toast.success('Business stamp removed');
                                      }
                                    } catch (error) {
                                      toast.error('Failed to remove stamp');
                                    } finally {
                                      setStampLoading(false);
                                    }
                                  }}
                                  className={`text-rose-500 hover:text-rose-600 transition-colors ${
                                    stampLoading
                                      ? 'opacity-50 cursor-not-allowed'
                                      : ''
                                  }`}
                                  title="Delete Stamp"
                                >
                                  {stampLoading ? (
                                    <Loader2
                                      size={16}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2 size={16} />
                                  )}
                                </button>
                              )}
                            </div>
                            <div
                              onClick={() => {
                                if (stampLoading) return;
                                document
                                  .getElementById('business-stamp-upload')
                                  .click();
                              }}
                              className={`relative group/stamp h-32 rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex items-center justify-center bg-muted/5 ${
                                user.businessStamp
                                  ? 'border-primary/20 hover:border-primary/40'
                                  : 'border-border/50 hover:border-primary/30'
                              } ${stampLoading ? 'opacity-50 cursor-wait' : ''}`}
                            >
                              {stampLoading ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="animate-spin text-primary" />
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Processing...
                                  </span>
                                </div>
                              ) : user.businessStamp ? (
                                <>
                                  <img
                                    src={user.businessStamp}
                                    alt="Business Stamp"
                                    className="h-full w-full object-contain p-2"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/stamp:opacity-100 transition-opacity flex items-center justify-center">
                                    <ArrowUpCircle className="text-white" />
                                  </div>
                                </>
                              ) : (
                                <div className="text-center space-y-2">
                                  <div className="p-3 rounded-xl bg-muted/20 inline-block">
                                    <ShieldCheck className="text-muted-foreground/60" />
                                  </div>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Upload Stamp
                                  </p>
                                </div>
                              )}
                            </div>
                            <input
                              type="file"
                              id="business-stamp-upload"
                              className="hidden"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                if (file.size > 2 * 1024 * 1024) {
                                  toast.error('Stamp must be less than 2MB');
                                  return;
                                }
                                const formData = new FormData();
                                formData.append('businessStamp', file);
                                setStampLoading(true);
                                try {
                                  const { data } = await api.put(
                                    '/auth/updatebusinessstamp',
                                    formData,
                                    {
                                      headers: {
                                        'Content-Type': 'multipart/form-data',
                                      },
                                    },
                                  );
                                  if (data.success) {
                                    setUser((prev) => ({
                                      ...prev,
                                      businessStamp: data.businessStamp,
                                    }));
                                    toast.success('Business stamp updated');
                                  }
                                } catch (error) {
                                  toast.error('Failed to update stamp');
                                } finally {
                                  setStampLoading(false);
                                }
                              }}
                            />
                            <p className="text-[9px] text-muted-foreground leading-relaxed">
                              Verified business stamp for official documents.
                            </p>
                          </div>

                          {/* CEO Signature */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground underline decoration-primary/30 decoration-2 underline-offset-8">
                                CEO Signature
                              </h4>
                              {user.ceoSignature && (
                                <button
                                  disabled={signatureLoading}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (signatureLoading) return;
                                    try {
                                      setSignatureLoading(true);
                                      const { data } = await api.delete(
                                        '/auth/delete-ceo-signature',
                                      );
                                      if (data.success) {
                                        setUser((prev) => ({
                                          ...prev,
                                          ceoSignature: undefined,
                                        }));
                                        toast.success('CEO signature removed');
                                      }
                                    } catch (error) {
                                      toast.error('Failed to remove signature');
                                    } finally {
                                      setSignatureLoading(false);
                                    }
                                  }}
                                  className={`text-rose-500 hover:text-rose-600 transition-colors ${
                                    signatureLoading
                                      ? 'opacity-50 cursor-not-allowed'
                                      : ''
                                  }`}
                                  title="Delete Signature"
                                >
                                  {signatureLoading ? (
                                    <Loader2
                                      size={16}
                                      className="animate-spin"
                                    />
                                  ) : (
                                    <Trash2 size={16} />
                                  )}
                                </button>
                              )}
                            </div>
                            <div
                              onClick={() => {
                                if (signatureLoading) return;
                                document
                                  .getElementById('ceo-signature-upload')
                                  .click();
                              }}
                              className={`relative group/signature h-32 rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex items-center justify-center bg-muted/5 ${
                                user.ceoSignature
                                  ? 'border-primary/20 hover:border-primary/40'
                                  : 'border-border/50 hover:border-primary/30'
                              } ${signatureLoading ? 'opacity-50 cursor-wait' : ''}`}
                            >
                              {signatureLoading ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="animate-spin text-primary" />
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                    Processing...
                                  </span>
                                </div>
                              ) : user.ceoSignature ? (
                                <>
                                  <img
                                    src={user.ceoSignature}
                                    alt="CEO Signature"
                                    className="h-full w-full object-contain p-2"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/signature:opacity-100 transition-opacity flex items-center justify-center">
                                    <ArrowUpCircle className="text-white" />
                                  </div>
                                </>
                              ) : (
                                <div className="text-center space-y-2">
                                  <div className="p-3 rounded-xl bg-muted/20 inline-block">
                                    <Fingerprint className="text-muted-foreground/60" />
                                  </div>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    Upload Signature
                                  </p>
                                </div>
                              )}
                            </div>
                            <input
                              type="file"
                              id="ceo-signature-upload"
                              className="hidden"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                if (file.size > 2 * 1024 * 1024) {
                                  toast.error(
                                    'Signature must be less than 2MB',
                                  );
                                  return;
                                }
                                const formData = new FormData();
                                formData.append('ceoSignature', file);
                                setSignatureLoading(true);
                                try {
                                  const { data } = await api.put(
                                    '/auth/updateceosignature',
                                    formData,
                                    {
                                      headers: {
                                        'Content-Type': 'multipart/form-data',
                                      },
                                    },
                                  );
                                  if (data.success) {
                                    setUser((prev) => ({
                                      ...prev,
                                      ceoSignature: data.ceoSignature,
                                    }));
                                    toast.success('CEO signature updated');
                                  }
                                } catch (error) {
                                  toast.error('Failed to update signature');
                                } finally {
                                  setSignatureLoading(false);
                                }
                              }}
                            />
                            <p className="text-[9px] text-muted-foreground leading-relaxed">
                              Authorized signature for disbursements and
                              reports.
                            </p>
                          </div>
                        </div>

                        {/* Business Address */}
                        <div className="pt-6 border-t border-border/30 space-y-3 relative z-10">
                          <div className="space-y-1">
                            <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
                              Business Address
                            </h4>
                            <p className="text-[10px] text-muted-foreground">
                              This address appears on all downloadable
                              statements and receipts.
                            </p>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <input
                              type="text"
                              value={user.businessAddress || ''}
                              onChange={(e) =>
                                setUser((prev) => ({
                                  ...prev,
                                  businessAddress: e.target.value,
                                }))
                              }
                              placeholder="e.g. 25 Estate Ave, Industrial Area, Karachi, Pakistan"
                              className="flex-1 h-11 px-4 rounded-xl bg-muted/20 border border-border focus:border-primary/50 focus:bg-background transition-all outline-none text-sm font-medium placeholder:text-muted-foreground/40"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-xl border-primary/20 hover:bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest h-11 px-6"
                              onClick={async () => {
                                try {
                                  setLoading(true);
                                  await api.put('/auth/updatedetails', {
                                    businessAddress: user.businessAddress,
                                  });
                                  toast.success('Business address updated');
                                } catch (error) {
                                  toast.error('Failed to update address');
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              isLoading={loading}
                            >
                              Save Address
                            </Button>
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

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

                  {/* Your Review Section — Admin only */}
                  {isAdmin && <ReviewSection />}

                  {/* Danger Zone — Admin only */}
                  {isAdmin && (
                    <section className="bg-rose-500/5 dark:bg-rose-500/10 backdrop-blur-xl border border-rose-500/20 rounded-[2.5rem] p-8 shadow-2xl shadow-rose-500/5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 delay-150 overflow-hidden group mb-40 sm:mb-0">
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
                <section className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden group mb-40 sm:mb-0">
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
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setError,
  } = useForm({
    defaultValues: {
      name: user.name || '',
      email: user.email || '',
      businessName: user.businessName || '',
      currency: user.currency || 'Rs.',
      businessAbbreviation: user.businessAbbreviation || '',
      savingProfitRate: user.savingProfitRate || 0,
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        email: user.email || '',
        businessName: user.businessName || '',
        currency: user.currency || 'Rs.',
        businessAbbreviation: user.businessAbbreviation || '',
        savingProfitRate: user.savingProfitRate || 0,
      });
    }
  }, [user, reset]);

  const onSubmit = async (formData) => {
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      setError('email', { message: emailValidation.message });
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.put('/auth/updatedetails', formData);
      if (data.success) {
        const existing = JSON.parse(localStorage.getItem('user') || '{}') || {};
        const updatedUser = { ...existing, ...data.data };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        window.dispatchEvent(new Event('userUpdated'));
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
      <DialogContent className="sm:max-w-[550px] max-h-[95vh] !p-0 !gap-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 border-b bg-background z-10">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <User className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">
                  Edit Profile
                </DialogTitle>
                <DialogDescription className="text-sm font-medium">
                  Update your account's public identity and credentials.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <form
            id="edit-profile-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Full Name *
              </label>
              <input
                type="text"
                placeholder="Enter name"
                className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all capitalize"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && (
                <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Business Name *
              </label>
              <input
                type="text"
                placeholder="Enter business name"
                className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all capitalize"
                {...register('businessName', {
                  required: 'Business name is required',
                })}
              />
              {errors.businessName && (
                <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.businessName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Email Address *
              </label>
              <input
                type="email"
                placeholder="admin@example.com"
                className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Invalid email format',
                  },
                })}
              />
              {errors.email && (
                <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Business Abbreviation *
              </label>
              <input
                type="text"
                placeholder="e.g. MLO"
                maxLength={4}
                className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono uppercase tracking-wider"
                {...register('businessAbbreviation', {
                  required: 'Business abbreviation is required',
                  maxLength: { value: 4, message: 'Max 4 characters' },
                  onChange: (e) => {
                    e.target.value = e.target.value.slice(0, 4).toUpperCase();
                  },
                })}
              />
              <p className="px-1 text-[10px] text-muted-foreground font-medium">
                Max 4 characters. Used as prefix for new account numbers.
              </p>
              {errors.businessAbbreviation && (
                <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.businessAbbreviation.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Preferred Currency
              </label>
              <select
                className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none"
                {...register('currency')}
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

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Saving Profit Rate (% Annual)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g. 12.5"
                className="w-full px-4 py-3 rounded-2xl border border-border/50 bg-background/50 text-sm font-black focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                {...register('savingProfitRate', {
                  min: { value: 0, message: 'Rate cannot be negative' },
                  max: { value: 100, message: 'Rate cannot exceed 100%' },
                  setValueAs: (v) => (v === '' ? 0 : parseFloat(v)),
                })}
              />
              <p className="px-1 text-[10px] text-muted-foreground font-medium">
                Annual profit rate applied daily to all members' saving
                accounts.
              </p>
              {errors.savingProfitRate && (
                <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.savingProfitRate.message}
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 border-t bg-background z-10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
          >
            Cancel
          </button>
          <Button
            form="edit-profile-form"
            type="submit"
            isLoading={loading}
            variant="gradient"
            className="px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3"
          >
            <User size={16} />
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ChangePasswordModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
    setError,
  } = useForm();

  const newPassword = watch('newPassword');

  const onSubmit = async (formData) => {
    const { isValid, message } = validatePassword(formData.newPassword);
    if (!isValid) {
      setError('newPassword', { message });
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
      reset();
    } catch (error) {
      setError('root', {
        message: error.response?.data?.message || 'Failed to update password',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[95vh] !p-0 !gap-0 flex flex-col overflow-hidden">
        {/* Fixed Header */}
        <div className="p-6 border-b bg-background z-10">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-primary/10 text-primary">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black">
                  Security Update
                </DialogTitle>
                <DialogDescription className="text-sm font-medium">
                  Update your credentials to keep your account secure.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          <form
            id="change-password-form"
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6"
          >
            {errors.root && (
              <div className="bg-destructive/10 text-destructive p-4 rounded-2xl text-xs font-bold uppercase tracking-wider border border-destructive/20 mb-6 italic">
                {errors.root.message}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Current Password *
              </label>
              <PasswordInput
                className="w-full h-12 px-5 rounded-2xl"
                {...register('currentPassword', {
                  required: 'Current password is required',
                })}
              />
              {errors.currentPassword && (
                <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                New Password *
              </label>
              <PasswordInput
                className="w-full h-12 px-5 rounded-2xl"
                placeholder="Enter new password"
                {...register('newPassword', {
                  required: 'New password is required',
                  minLength: {
                    value: 8,
                    message: 'Password must be at least 8 characters',
                  },
                })}
              />
              {errors.newPassword && (
                <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">
                Confirm New Password *
              </label>
              <PasswordInput
                className="w-full h-12 px-5 rounded-2xl"
                {...register('confirmNewPassword', {
                  required: 'Please confirm your password',
                  validate: (value) =>
                    value === newPassword || 'Passwords do not match',
                })}
              />
              {errors.confirmNewPassword && (
                <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                  {errors.confirmNewPassword.message}
                </p>
              )}
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="p-6 border-t bg-background z-10 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-8 py-3.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-muted"
          >
            Cancel
          </button>
          <Button
            form="change-password-form"
            type="submit"
            isLoading={loading}
            variant="gradient"
            className="px-10 py-3.5 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center gap-3"
          >
            <Shield size={16} />
            Update Password
          </Button>
        </div>
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
    checkbookFees: { 25: 200, 50: 350, 100: 500 },
    lateFeeEnabled: true,
    lateFeeType: 'fixed',
    lateFeeRate: 500,
    lateFeeGracePeriodDays: 3,
    termDepositRates: [
      { duration: 6, rate: 8 },
      { duration: 12, rate: 10 },
      { duration: 24, rate: 12 },
    ],
    termDepositEarlyBreakPenalty: 50,
    loanDefaultThresholdMonths: 3,
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
      // Fetch per-business config (late fee, term deposit, checkbook from User model)
      // and global config (interest rate, loan term from SystemSettings)
      const { data } = await api.get('/system-settings/business-config');
      if (data) {
        setSettings({
          defaultInterestRate: data.defaultInterestRate || 0,
          defaultLoanTerm: data.defaultLoanTerm || 12,
          currency: data.currency || 'Rs.',
          platformName: data.platformName || '',
          platformDescription: data.platformDescription || '',
          supportEmail: data.supportEmail || '',
          maintenanceMode: data.maintenanceMode || false,
          estimatedMaintenanceTime: data.estimatedMaintenanceTime || '',
          checkbookFees: data.checkbookFees ?? { 25: 0, 50: 0, 100: 0 },
          lateFeeEnabled: data.lateFeeEnabled ?? false,
          lateFeeType: data.lateFeeType || 'fixed',
          lateFeeRate: data.lateFeeRate ?? 0,
          lateFeeGracePeriodDays: data.lateFeeGracePeriodDays ?? 0,
          termDepositRates: data.termDepositRates || [],
          termDepositEarlyBreakPenalty: data.termDepositEarlyBreakPenalty ?? 0,
          loanDefaultThresholdMonths: data.loanDefaultThresholdMonths ?? 3,
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

      // For super admins, also fetch global system settings for platform branding/SMTP
      if (user.role === 'super_admin') {
        try {
          const { data: globalData } = await api.get('/system-settings');
          if (globalData) {
            setSettings((prev) => ({
              ...prev,
              platformName: globalData.platformName || '',
              platformDescription: globalData.platformDescription || '',
              supportEmail: globalData.supportEmail || '',
              maintenanceMode: globalData.maintenanceMode || false,
              estimatedMaintenanceTime:
                globalData.estimatedMaintenanceTime || '',
              smtpConfig: globalData.smtpConfig || prev.smtpConfig,
            }));
          }
        } catch (_) {}
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
          setUser({ ...u }); // Update parent state if possible, though ConfigurationSection is nested
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
      <section className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 animate-pulse mb-40 sm:mb-0 space-y-8">
        <div className="space-y-2 mb-8">
          <Skeleton className="h-6 w-48 rounded" />
          <Skeleton className="h-3 w-64 rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 py-8">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
        <div className="space-y-6 pt-4 border-t border-border/20">
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-3 w-48 rounded" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white/50 dark:bg-slate-800/50 p-8 rounded-[2rem] border border-slate-200 dark:border-white/5">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 dark:border-slate-800/40 rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden group mb-40 sm:mb-0">
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

        {/* Checkbook Configuration Section */}
        <div className="space-y-6 pt-4 border-t border-border/20">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2 mb-2">
              <BookOpen size={14} />
              Checkbook Configuration
            </h3>
            <p className="text-muted-foreground text-[11px] font-medium leading-relaxed">
              Set the fee charged to members per checkbook based on the number
              of leaves. Fee is automatically deducted from the member's current
              account.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white/50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-200 dark:border-white/5 py-8">
            {[25, 50, 100].map((leaves) => (
              <div key={leaves} className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  {leaves} Leaves Fee
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                    {settings.currency || 'Rs.'}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={settings.checkbookFees?.[leaves] ?? 0}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        checkbookFees: {
                          ...settings.checkbookFees,
                          [leaves]: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-full pl-12 pr-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-primary focus:ring-1 focus:ring-primary transition-all text-sm font-medium"
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
            <p className="md:col-span-3 text-[10px] text-muted-foreground/60 italic font-medium mt-2 ml-1">
              * These fees are deducted from the member's current account balance
              when a checkbook is issued. Set to 0 for free checkbooks.
            </p>
          </div>
        </div>

        {/* Late Fee / Penalty Configuration Section */}
        <div className="space-y-6 pt-4 border-t border-border/20">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-rose-500 flex items-center gap-2 mb-2">
              <AlertTriangle size={14} />
              Late Fee Configuration
            </h3>
            <p className="text-muted-foreground text-[11px] font-medium leading-relaxed">
              Configure automatic penalties applied to loans after the full loan
              tenure expires. Late fees are only applied once the loan period
              ends and the borrower has an outstanding balance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-rose-500/5 p-6 rounded-[2rem] border border-rose-500/10 py-8">
            <div className="md:col-span-2 flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <div>
                <p className="text-sm font-black uppercase tracking-widest mb-1">
                  Enable Late Fees
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  Automatically apply penalties to overdue loan installments
                </p>
              </div>
              <Switch
                checked={settings.lateFeeEnabled}
                onCheckedChange={() =>
                  setSettings((prev) => ({
                    ...prev,
                    lateFeeEnabled: !prev.lateFeeEnabled,
                  }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Fee Type
              </label>
              <div className="flex gap-2 p-1 bg-white/50 dark:bg-slate-800/50 rounded-2xl">
                <button
                  type="button"
                  onClick={() =>
                    setSettings({ ...settings, lateFeeType: 'fixed' })
                  }
                  className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    settings.lateFeeType === 'fixed'
                      ? 'bg-rose-500 text-white shadow-lg'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  Fixed Amount
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setSettings({ ...settings, lateFeeType: 'percentage' })
                  }
                  className={`flex-1 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    settings.lateFeeType === 'percentage'
                      ? 'bg-rose-500 text-white shadow-lg'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  % of EMI
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                {settings.lateFeeType === 'percentage'
                  ? 'Fee Rate (%)'
                  : 'Fee Amount'}
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                  {settings.lateFeeType === 'percentage'
                    ? '%'
                    : settings.currency || 'Rs.'}
                </span>
                <input
                  type="number"
                  min="0"
                  step={settings.lateFeeType === 'percentage' ? '0.5' : '1'}
                  value={settings.lateFeeRate}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      lateFeeRate: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full pl-12 pr-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Grace Period (Days)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                step="1"
                value={settings.lateFeeGracePeriodDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    lateFeeGracePeriodDays: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-sm font-medium"
                placeholder="3"
              />
            </div>
            <div className="flex items-end">
              <p className="text-[10px] text-muted-foreground/60 italic font-medium pb-3">
                * After the full loan tenure ends, members will have this many
                days before late fees start accruing on the outstanding balance.
              </p>
            </div>

            <div className="md:col-span-2 pt-4 border-t border-rose-500/10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Loan Default Threshold (Months After Tenure)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    step="1"
                    value={settings.loanDefaultThresholdMonths}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        loanDefaultThresholdMonths:
                          parseInt(e.target.value) || 3,
                      })
                    }
                    className="w-full px-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-sm font-medium"
                    placeholder="3"
                  />
                </div>
                <div className="flex items-end">
                  <p className="text-[10px] text-muted-foreground/60 italic font-medium pb-3">
                    * If a loan remains unpaid for this many months after the
                    tenure ends, it will be automatically marked as{' '}
                    <span className="text-rose-500 font-black">defaulted</span>.
                    The member's account will be frozen and their trust rating
                    will drop significantly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Term Deposit Configuration Section */}
        <div className="space-y-6 pt-4 border-t border-border/20">
          <div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-2 mb-2">
              <Landmark size={14} />
              Term Deposit Configuration
            </h3>
            <p className="text-muted-foreground text-[11px] font-medium leading-relaxed">
              Configure profit rate tiers for fixed-duration term deposits and
              the penalty applied for early withdrawal.
            </p>
          </div>

          <div className="space-y-4 bg-emerald-500/5 p-6 rounded-[2rem] border border-emerald-500/10">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Rate Tiers
              </label>
              {(settings.termDepositRates || []).map((tier, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      Duration (Months)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tier.duration}
                      onChange={(e) => {
                        const updated = [...settings.termDepositRates];
                        updated[idx].duration = parseInt(e.target.value) || 1;
                        setSettings({ ...settings, termDepositRates: updated });
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
                      Rate (% p.a.)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={tier.rate}
                      onChange={(e) => {
                        const updated = [...settings.termDepositRates];
                        updated[idx].rate = parseFloat(e.target.value) || 0;
                        setSettings({ ...settings, termDepositRates: updated });
                      }}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = settings.termDepositRates.filter(
                        (_, i) => i !== idx,
                      );
                      setSettings({ ...settings, termDepositRates: updated });
                    }}
                    className="mt-5 p-2 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  setSettings({
                    ...settings,
                    termDepositRates: [
                      ...(settings.termDepositRates || []),
                      { duration: 6, rate: 8 },
                    ],
                  });
                }}
                className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1"
              >
                + Add Tier
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-emerald-500/10">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Early Break Penalty (% of Profit)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                    %
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={settings.termDepositEarlyBreakPenalty}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        termDepositEarlyBreakPenalty:
                          parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full pl-10 pr-5 py-3 rounded-2xl bg-white/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-sm font-medium"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <p className="text-[10px] text-muted-foreground/60 italic font-medium pb-3">
                  * When a member breaks a term deposit early, this percentage
                  of accrued profit is deducted as a penalty.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            isLoading={saving}
            variant="gradient"
            className="h-11 px-8 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-95 transition-all"
          >
            <Save size={14} className="mr-2" />
            Save Configuration
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
    <ConfirmActionModal
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={handleDelete}
      loading={loading}
      title="Irreversible Deletion"
      description="This action will permanently remove your account and all associated business data. This action cannot be undone."
      confirmText="Confirm Deletion"
      variant="danger"
      disabled={confirmText !== 'DELETE'}
    >
      <div className="space-y-4 pt-4">
        <p className="text-center text-xs text-muted-foreground font-medium leading-relaxed bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10">
          This will permanently remove your portal access and activity history.
        </p>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-center block">
            Type <span className="text-rose-500">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-5 py-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 focus:border-rose-500 transition-all text-center font-black uppercase tracking-widest text-rose-600 placeholder:text-rose-500/30"
            placeholder="DELETE"
          />
        </div>
      </div>
    </ConfirmActionModal>
  );
};

export default Settings;
