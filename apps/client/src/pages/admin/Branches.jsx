import { useState, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { userAtom } from '@/atoms';
import { useForm } from 'react-hook-form';
import {
  Plus,
  Search,
  MapPin,
  Phone,
  Store,
  Palette,
  Check,
  Edit,
  Power,
  PowerOff,
  Trash2,
  UserCog,
  Loader2,
  Star,
} from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/PageHeader';
import { CardsPageSkeleton } from '@/components/ui/PageSkeletons';
import BranchCardSkeleton from '@/components/skeletons/BranchCardSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import api from '@/lib/axios';
import { toast } from 'sonner';

const Branches = () => {
  const navigate = useNavigate();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState(null);
  const [deleteBranchId, setDeleteBranchId] = useState(null);
  const [staff, setStaff] = useState([]);

  // Get user for role-based rendering
  const user = useAtomValue(userAtom);
  const isManager = user.isManager && user.role === 'staff';

  // Manager auto-redirect: managers see only their branch detail page
  useEffect(() => {
    if (isManager && user.branchId) {
      navigate(`/branches/${user.branchId}`, { replace: true });
    }
  }, [isManager, user.branchId, navigate]);

  // RHF for required text fields
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { name: '', address: '', contactNumber: '' },
  });

  // Non-form ancillary state
  const [formData, setFormData] = useState({
    branding: {
      companyName: '',
      logoUrl: '',
      primaryColor: '#000000',
      secondaryColor: '#ffffff',
    },
    managerId: '',
  });
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [defaultingId, setDefaultingId] = useState(null);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/branches');
      setBranches(data);
    } catch (error) {
      console.error('Failed to fetch branches', error);
      toast.error('Failed to load branches');
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data } = await api.get('/staff?limit=100');
      setStaff(data.data || []);
    } catch (error) {
      console.error('Failed to fetch staff', error);
    }
  };

  useEffect(() => {
    fetchBranches();
    fetchStaff();
  }, []);

  const handleSave = async (rhfData) => {
    try {
      setSaving(true);
      const data = new FormData();
      data.append('name', rhfData.name);
      data.append('address', rhfData.address);
      data.append('contactNumber', rhfData.contactNumber);
      data.append('managerId', formData.managerId);
      data.append('branding', JSON.stringify(formData.branding));

      if (logoFile) {
        data.append('logo', logoFile);
      }

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };

      if (currentBranch) {
        await api.put(`/branches/${currentBranch._id}`, data, config);
        toast.success('Branch updated successfully');
      } else {
        await api.post('/branches', data, config);
        toast.success('Branch created successfully');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchBranches();
    } catch (error) {
      console.error(error);
      const serverMessage = error.response?.data?.message;
      if (currentBranch) {
        toast.error(serverMessage || 'Failed to update branch');
      } else if (error.response?.data?.upgradeRequired) {
        toast.error(
          serverMessage ||
            'Branch limit reached. Upgrade your plan to add more branches.',
          {
            duration: 6000,
            action: {
              label: 'Upgrade',
              onClick: () => (window.location.href = '/billing'),
            },
          },
        );
      } else {
        toast.error(serverMessage || 'Failed to create branch');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (branch) => {
    setCurrentBranch(branch);
    reset({
      name: branch.name,
      address: branch.address,
      contactNumber: branch.contactNumber,
    });
    setFormData({
      branding: {
        companyName: branch.branding?.companyName || '',
        logoUrl: branch.branding?.logoUrl || '',
        primaryColor: branch.branding?.primaryColor || '#000000',
        secondaryColor: branch.branding?.secondaryColor || '#ffffff',
      },
      managerId: branch.manager?._id || '',
    });
    setIsDialogOpen(true);
  };

  const toggleStatus = async (branch) => {
    try {
      setTogglingId(branch._id);
      await api.put(`/branches/${branch._id}`, {
        isActive: !branch.isActive,
      });
      toast.success(
        `Branch ${branch.isActive ? 'deactivated' : 'activated'} successfully`,
      );
      fetchBranches();
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  // Mark a branch as the tenant default. New members (admin-created without an
  // explicit branch, and self/Google-registered) are attributed here.
  const setDefault = async (branch) => {
    if (branch.isDefault) return;
    try {
      setDefaultingId(branch._id);
      await api.put(`/branches/${branch._id}/default`);
      toast.success(`"${branch.name}" is now the default branch`);
      fetchBranches();
    } catch (error) {
      toast.error('Failed to set default branch');
    } finally {
      setDefaultingId(null);
    }
  };

  const handleDeleteBranch = async () => {
    if (!deleteBranchId) return;
    try {
      setIsDeleting(true);
      await api.delete(`/branches/${deleteBranchId}`);
      toast.success('Branch deleted successfully');
      setDeleteBranchId(null);
      fetchBranches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete branch');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setCurrentBranch(null);
    setLogoPreview(null);
    setLogoFile(null);
    reset({ name: '', address: '', contactNumber: '' });
    setFormData({
      branding: {
        companyName: '',
        logoUrl: '',
        primaryColor: '#000000',
        secondaryColor: '#ffffff',
      },
      managerId: '',
    });
  };

  const filteredBranches = branches.filter((branch) =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleOpenDetails = (branch) => {
    navigate(`/branches/${branch._id}`);
  };

  if (loading && branches.length === 0 && !searchQuery) {
    return <CardsPageSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Branch Management"
        description="Manage your branches and their unique branding."
      >
        <Button
          onClick={() => {
            resetForm();
            setIsDialogOpen(true);
          }}
          className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto"
          data-onboarding-id="add-branch-button"
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Branch
        </Button>
      </PageHeader>

      <div className="flex items-center gap-4 bg-white dark:bg-white/[0.02] p-1 rounded-full border border-slate-100 dark:border-white/[0.06] max-w-md">
        <div className="pl-3 text-muted-foreground">
          <Search size={18} />
        </div>
        <Input
          placeholder="Search branches..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      {loading ? (
        <BranchCardSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredBranches.map((branch, index) => (
              <motion.div
                key={branch._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="group relative"
              >
                <div
                  onClick={() => handleOpenDetails(branch)}
                  className="rounded-[2rem] border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] overflow-hidden hover:shadow-[0_20px_60px_-25px_rgba(15,23,42,0.15)] transition-all duration-300 group cursor-pointer"
                >
                  {/* Banner header */}
                  <div
                    className="h-24 relative"
                    style={{
                      background: `linear-gradient(135deg, ${
                        branch.branding?.primaryColor ||
                        'hsl(var(--primary))'
                      } 0%, ${
                        branch.branding?.secondaryColor ||
                        'hsl(var(--primary)/.8)'
                      } 100%)`,
                    }}
                  >
                    <div className="absolute inset-0 bg-black/5 mix-blend-overlay" />
                    <div
                      className="absolute bottom-0 left-6 translate-y-1/2"
                      aria-label={`View ${branch.name}`}
                    >
                      <div className="h-16 w-16 rounded-full border-4 border-white dark:border-[#020617] bg-white dark:bg-[#020617] text-primary flex items-center justify-center text-lg font-extrabold tracking-tight shadow-sm overflow-hidden">
                        {branch.branding?.logoUrl ? (
                          <img
                            src={branch.branding.logoUrl}
                            alt={branch.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Store size={22} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="pt-12 px-6 pb-5 space-y-4">
                    {/* Name + label + status */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mb-1 flex items-center gap-1.5">
                          <Store size={10} className="text-primary" />
                          {branch.branding?.companyName || 'Branch'}
                        </p>
                        <h3 className="text-base font-extrabold tracking-[-0.02em] text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors capitalize">
                          {branch.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {branch.isDefault && (
                          <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-primary/10 text-primary flex items-center gap-1">
                            <Star size={9} className="fill-current" />
                            Default
                          </span>
                        )}
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest',
                            branch.isActive
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-500 dark:text-rose-400',
                          )}
                        >
                          {branch.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>

                    {/* Info rows */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
                          <MapPin />
                        </div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                          {branch.address}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50/40 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06]">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:w-3.5 [&_svg]:h-3.5">
                          <Phone />
                        </div>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                          {branch.contactNumber}
                        </span>
                      </div>
                    </div>

                    {/* Action row */}
                    <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
                      <Tooltip
                        content={
                          branch.isDefault
                            ? 'Default branch'
                            : 'Set as default branch'
                        }
                        position="top"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={branch.isDefault}
                          onClick={(e) => {
                            e.stopPropagation();
                            setDefault(branch);
                          }}
                          isLoading={defaultingId === branch._id}
                          className={cn(
                            'p-2 h-9 w-9 rounded-full transition-all active:scale-90',
                            branch.isDefault
                              ? 'text-primary cursor-default'
                              : 'text-slate-400 hover:bg-primary/10 hover:text-primary',
                          )}
                        >
                          <Star
                            size={16}
                            className={branch.isDefault ? 'fill-current' : ''}
                          />
                        </Button>
                      </Tooltip>

                      <Tooltip content="Edit Branch" position="top">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(branch);
                          }}
                          className="p-2 h-9 w-9 rounded-full hover:bg-primary/10 text-slate-400 hover:text-primary transition-all active:scale-90"
                        >
                          <Edit size={16} />
                        </Button>
                      </Tooltip>

                      <Tooltip
                        content={branch.isActive ? 'Deactivate' : 'Activate'}
                        position="top"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStatus(branch);
                          }}
                          isLoading={togglingId === branch._id}
                          className={cn(
                            'p-2 h-9 w-9 rounded-full transition-all active:scale-90 text-slate-400',
                            branch.isActive
                              ? 'hover:bg-amber-500/10 hover:text-amber-600'
                              : 'hover:bg-emerald-500/10 hover:text-emerald-600',
                          )}
                        >
                          {branch.isActive ? (
                            <PowerOff size={16} />
                          ) : (
                            <Power size={16} />
                          )}
                        </Button>
                      </Tooltip>

                      <Tooltip content="Delete" position="top">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteBranchId(branch._id);
                          }}
                          className="p-2 h-9 w-9 rounded-full hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-all active:scale-90"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {!loading && filteredBranches.length === 0 && (
        <EmptyState
          icon={Store}
          title={searchQuery ? 'No Branches Found' : 'No Branches Yet'}
          description={
            searchQuery
              ? `We couldn't find any branches matching "${searchQuery}".`
              : "You haven't added any branches yet. Start by creating your first business location."
          }
          className="border-none bg-transparent py-20"
        />
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] !p-0 flex flex-col overflow-hidden">
          {/* Fixed Header */}
          <div className="p-6 border-b z-10">
            <DialogHeader>
              <DialogTitle>
                {currentBranch ? 'Edit Branch' : 'Add New Branch'}
              </DialogTitle>
              <DialogDescription>
                Configure branch details and white-label branding.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <form
              id="branch-form"
              onSubmit={handleSubmit(handleSave)}
              className="grid gap-6"
            >
              <div className="space-y-4">
                <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Store size={14} /> Basic Details
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Branch Name</Label>
                    <Input
                      placeholder="e.g. Downtown Branch"
                      {...register('name', {
                        required: 'Branch name is required',
                      })}
                    />
                    {errors.name && (
                      <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Number</Label>
                    <Input
                      placeholder="+92 300 1234567"
                      {...register('contactNumber', {
                        required: 'Contact number is required',
                      })}
                    />
                    {errors.contactNumber && (
                      <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                        {errors.contactNumber.message}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Address</Label>
                    <Input
                      placeholder="Full street address"
                      {...register('address', {
                        required: 'Address is required',
                      })}
                    />
                    {errors.address && (
                      <p className="text-destructive text-[10px] font-bold pl-1 animate-in fade-in slide-in-from-top-1">
                        {errors.address.message}
                      </p>
                    )}
                  </div>
                  <div className="col-span-2 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCog size={14} className="text-primary" />
                      <Label className="text-sm font-bold">
                        Branch Manager
                      </Label>
                    </div>
                    <Select
                      value={formData.managerId || 'none'}
                      onValueChange={(val) =>
                        setFormData({
                          ...formData,
                          managerId: val === 'none' ? '' : val,
                        })
                      }
                    >
                      <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border/40">
                        <SelectValue placeholder="Assign a Manager (Optional)" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-border/40">
                        <SelectItem value="none" className="rounded-lg">
                          No Manager Assigned
                        </SelectItem>
                        {staff.map((member) => (
                          <SelectItem
                            key={member._id}
                            value={member._id}
                            className="rounded-lg"
                          >
                            <div className="flex flex-col py-0.5">
                              <span className="font-bold text-sm capitalize">
                                {member.name}
                              </span>
                              <span className="text-[10px] uppercase text-muted-foreground tracking-widest font-black">
                                {member.email}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/50">
                <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Palette size={14} /> Branding & White-Labeling
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label>Display Name (Company Name)</Label>
                    <Input
                      value={formData.branding.companyName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          branding: {
                            ...formData.branding,
                            companyName: e.target.value,
                          },
                        })
                      }
                      placeholder="Name shown on invoices/reports"
                    />
                  </div>
                  <div className="col-span-2 space-y-4">
                    <Label>Branch Logo</Label>
                    <div className="flex items-center gap-6">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-2xl bg-muted/40 border border-border/50 flex items-center justify-center overflow-hidden shadow-inner group-hover:border-primary/40 transition-all duration-500">
                          {logoPreview || formData.branding.logoUrl ? (
                            <img
                              src={logoPreview || formData.branding.logoUrl}
                              alt="Logo preview"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Store
                              className="text-muted-foreground/30"
                              size={32}
                            />
                          )}
                          <label
                            htmlFor="logo-upload"
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all duration-300"
                          >
                            <div className="bg-white/20 backdrop-blur-md p-2 rounded-xl scale-90 group-hover:scale-100 transition-transform">
                              <Plus size={20} className="text-white" />
                            </div>
                          </label>
                        </div>
                        <input
                          id="logo-upload"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              setLogoFile(file);
                              setLogoPreview(URL.createObjectURL(file));
                            }
                          }}
                        />
                      </div>
                      <div className="flex-1 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Branch Logo
                        </p>
                        <p className="text-xs text-muted-foreground/60 leading-relaxed">
                          PNG, JPG or WEBP. Max 5MB. Used on invoices and portal
                          branding.
                        </p>
                        <label
                          htmlFor="logo-upload"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-primary/40 transition-all duration-300 cursor-pointer text-xs font-bold text-muted-foreground hover:text-foreground select-none"
                        >
                          <Plus size={14} />
                          {logoPreview || formData.branding.logoUrl
                            ? 'Replace Logo'
                            : 'Upload Logo'}
                        </label>
                        {(logoPreview || formData.branding.logoUrl) && (
                          <button
                            type="button"
                            onClick={() => {
                              setLogoPreview(null);
                              setLogoFile(null);
                              setFormData({
                                ...formData,
                                branding: {
                                  ...formData.branding,
                                  logoUrl: '',
                                },
                              });
                            }}
                            className="ml-2 text-[10px] font-black uppercase tracking-wider text-destructive/70 hover:text-destructive transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.branding.primaryColor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            branding: {
                              ...formData.branding,
                              primaryColor: e.target.value,
                            },
                          })
                        }
                        className="w-12 p-1 h-10"
                      />
                      <Input
                        value={formData.branding.primaryColor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            branding: {
                              ...formData.branding,
                              primaryColor: e.target.value,
                            },
                          })
                        }
                        className="font-mono uppercase"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={formData.branding.secondaryColor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            branding: {
                              ...formData.branding,
                              secondaryColor: e.target.value,
                            },
                          })
                        }
                        className="w-12 p-1 h-10"
                      />
                      <Input
                        value={formData.branding.secondaryColor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            branding: {
                              ...formData.branding,
                              secondaryColor: e.target.value,
                            },
                          })
                        }
                        className="font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Fixed Footer */}
          <div className="p-6 border-t  z-10 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-full px-6 font-bold"
            >
              Cancel
            </Button>
            <Button
              form="branch-form"
              type="submit"
              disabled={saving}
              className="rounded-full px-8 font-bold min-w-[120px]"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check size={16} className="mr-2" />
              )}
              {currentBranch ? 'Update Branch' : 'Save Branch'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmActionModal
        isOpen={!!deleteBranchId}
        onClose={() => setDeleteBranchId(null)}
        onConfirm={handleDeleteBranch}
        loading={isDeleting}
        title="Delete Branch"
        description="Are you sure you want to delete this branch? This action cannot be undone and all associated data for this specific location will be archived."
        confirmText="Confirm Deletion"
        variant="danger"
      />
    </div>
  );
};

export default Branches;
