import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  MapPin,
  Phone,
  Store,
  Palette,
  Check,
  MoreVertical,
  Edit,
  Power,
  PowerOff,
  Trash2,
  UserCog,
  Loader2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/PageHeader';
import CardsSkeleton from '@/components/skeletons/CardsSkeleton';
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
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isManager = user.isManager && user.role === 'staff';

  // Manager auto-redirect: managers see only their branch detail page
  useEffect(() => {
    if (isManager && user.branchId) {
      navigate(`/branches/${user.branchId}`, { replace: true });
    }
  }, [isManager, user.branchId, navigate]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    contactNumber: '',
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

  const handleSave = async () => {
    try {
      setSaving(true);
      const data = new FormData();
      data.append('name', formData.name);
      data.append('address', formData.address);
      data.append('contactNumber', formData.contactNumber);
      data.append('managerId', formData.managerId);
      data.append('branding', JSON.stringify(formData.branding));
      if (formData.isActive !== undefined)
        data.append('isActive', formData.isActive);

      if (logoFile) {
        data.append('logo', logoFile);
      }

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      };

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
    setFormData({
      name: branch.name,
      address: branch.address,
      contactNumber: branch.contactNumber,
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
      await api.put(`/branches/${branch._id}`, {
        isActive: !branch.isActive,
      });
      toast.success(
        `Branch ${branch.isActive ? 'deactivated' : 'activated'} successfully`,
      );
      fetchBranches();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteBranch = async () => {
    if (!deleteBranchId) return;
    try {
      await api.delete(`/branches/${deleteBranchId}`);
      toast.success('Branch deleted successfully');
      setDeleteBranchId(null);
      fetchBranches();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete branch');
    }
  };

  const resetForm = () => {
    setCurrentBranch(null);
    setLogoPreview(null);
    setLogoFile(null);
    setFormData({
      name: '',
      address: '',
      contactNumber: '',
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
          className="rounded-full px-6 font-bold"
        >
          <Plus size={18} className="mr-2" />
          Add Branch
        </Button>
      </PageHeader>

      <div className="flex items-center gap-4 bg-background/50 backdrop-blur-sm p-1 rounded-2xl border border-border/50 max-w-md">
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
        <CardsSkeleton />
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
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent rounded-[2.5rem] -m-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <Card
                  onClick={() => handleOpenDetails(branch)}
                  className="relative overflow-hidden border-border/40 hover:border-primary/40 transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-primary/5 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2rem] cursor-pointer"
                >
                  <CardContent className="p-0">
                    {/* Branding Preview Header */}
                    <div
                      className="h-32 relative flex items-end p-6"
                      style={{
                        background: `linear-gradient(135deg, ${
                          branch.branding?.primaryColor || 'hsl(var(--primary))'
                        } 0%, ${
                          branch.branding?.secondaryColor ||
                          'hsl(var(--primary)/.8)'
                        } 100%)`,
                      }}
                    >
                      <div className="absolute inset-0 bg-black/10 mix-blend-overlay" />
                      <div className="absolute top-4 right-4 z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => e.stopPropagation()}
                              className="h-9 w-9 text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/20 transition-all duration-300"
                            >
                              <MoreVertical size={18} />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="w-48 rounded-[1.2rem] border-border/40 p-1.5"
                          >
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(branch);
                              }}
                              className="rounded-xl py-2.5 font-bold focus:bg-primary/5 focus:text-primary transition-colors cursor-pointer"
                            >
                              <Edit size={14} className="mr-3" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStatus(branch);
                              }}
                              className="rounded-xl py-2.5 font-bold focus:bg-primary/5 focus:text-primary transition-colors cursor-pointer"
                            >
                              {branch.isActive ? (
                                <>
                                  <PowerOff
                                    size={14}
                                    className="mr-3 text-red-500"
                                  />{' '}
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Power
                                    size={14}
                                    className="mr-3 text-emerald-500"
                                  />{' '}
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <div className="h-px bg-border/40 my-1 mx-2" />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteBranchId(branch._id);
                              }}
                              className="rounded-xl py-2.5 font-bold text-red-500 focus:bg-red-50 focus:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} className="mr-3" /> Delete
                              Branch
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center gap-4 translate-y-12 relative">
                        <div className="w-20 h-20 rounded-[1.5rem] bg-white dark:bg-slate-950 border-[6px] border-white dark:border-slate-900 shadow-2xl overflow-hidden flex items-center justify-center group-hover:scale-105 transition-transform duration-500">
                          {branch.branding?.logoUrl ? (
                            <img
                              src={branch.branding.logoUrl}
                              alt="Logo"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Store
                              className="text-primary opacity-20"
                              size={36}
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-14 px-8 pb-8">
                      <div className="flex justify-between items-start mb-5">
                        <div className="space-y-1">
                          <h3 className="font-black text-xl tracking-tight leading-tight group-hover:text-primary transition-colors">
                            {branch.name}
                          </h3>
                          <Badge
                            variant="subtle"
                            className="text-[10px] font-black uppercase tracking-widest bg-muted/50 border-none px-2"
                          >
                            {branch.branding?.companyName || branch.name}
                          </Badge>
                        </div>
                        <span
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all duration-500 ${
                            branch.isActive
                              ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20'
                              : 'bg-red-500/5 text-red-500 border-red-500/20'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                              branch.isActive ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          {branch.isActive ? 'Live' : 'Offline'}
                        </span>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="flex items-start gap-4 p-3 rounded-2xl bg-muted/30 border border-transparent hover:border-border/40 hover:bg-muted/50 transition-all duration-300">
                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-border/40">
                            <MapPin size={14} className="text-primary" />
                          </div>
                          <span className="text-sm font-medium text-muted-foreground/80 line-clamp-2 leading-relaxed">
                            {branch.address}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 p-3 rounded-2xl bg-muted/30 border border-transparent hover:border-border/40 hover:bg-muted/50 transition-all duration-300">
                          <div className="bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border border-border/40">
                            <Phone size={14} className="text-primary" />
                          </div>
                          <span className="text-sm font-bold text-foreground/80">
                            {branch.contactNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentBranch ? 'Edit Branch' : 'Add New Branch'}
            </DialogTitle>
            <DialogDescription>
              Configure branch details and white-label branding.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="space-y-4">
              <h4 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Store size={14} /> Basic Details
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Branch Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. Downtown Branch"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Number</Label>
                  <Input
                    value={formData.contactNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactNumber: e.target.value,
                      })
                    }
                    placeholder="+92 300 1234567"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Full street address"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCog size={14} className="text-primary" />
                    <Label className="text-sm font-bold">Branch Manager</Label>
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
                            <span className="font-bold text-sm">
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
                    <div className="flex-1 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Upload Image
                      </p>
                      <p className="text-xs text-muted-foreground/60 leading-relaxed">
                        PNG, JPG or WEBP. Max size 5MB. This logo will be used
                        on invoices and portal branding.
                      </p>
                      <Input
                        value={formData.branding.logoUrl}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            branding: {
                              ...formData.branding,
                              logoUrl: e.target.value,
                            },
                          })
                        }
                        placeholder="Or paste direct image URL..."
                        className="h-9 text-xs"
                      />
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
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="font-bold min-w-[120px]"
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check size={16} className="mr-2" />
              )}
              {currentBranch ? 'Update Branch' : 'Save Branch'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteBranchId}
        onOpenChange={() => setDeleteBranchId(null)}
      >
        <AlertDialogContent className="rounded-[2rem] border-border/40 backdrop-blur-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black">
              Remove Branch
            </AlertDialogTitle>
            <AlertDialogDescription className="font-medium text-muted-foreground/80">
              Are you sure you want to remove this branch? This action cannot be
              undone and all associated data for this specific location will be
              archived.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="rounded-full font-bold border-border/40 px-6">
              Hold On
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBranch}
              className="bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-xl shadow-red-500/20 hover:scale-[1.02] transform transition-all duration-300 rounded-full font-black uppercase tracking-widest text-[11px] px-8"
            >
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Branches;
