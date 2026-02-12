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
} from 'lucide-react';
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
import CardsSkeleton from '@/components/CardsSkeleton';
import api from '@/lib/axios';
import { toast } from 'sonner';

const Branches = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentBranch, setCurrentBranch] = useState(null);

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
  });

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

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleSave = async () => {
    try {
      if (currentBranch) {
        await api.put(`/branches/${currentBranch._id}`, formData);
        toast.success('Branch updated successfully');
      } else {
        await api.post('/branches', formData);
        toast.success('Branch created successfully');
      }
      setIsDialogOpen(false);
      resetForm();
      fetchBranches();
    } catch (error) {
      console.error(error);
      toast.error(
        currentBranch ? 'Failed to update branch' : 'Failed to create branch',
      );
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

  const resetForm = () => {
    setCurrentBranch(null);
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
    });
  };

  const filteredBranches = branches.filter((branch) =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
          {filteredBranches.map((branch) => (
            <Card
              key={branch._id}
              className="group overflow-hidden border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-lg bg-card/50 backdrop-blur-sm"
            >
              <CardContent className="p-0">
                {/* Branding Preview Header */}
                <div
                  className="h-24 relative flex items-end p-4"
                  style={{
                    background: `linear-gradient(135deg, ${
                      branch.branding?.primaryColor || '#000000'
                    } 0%, ${
                      branch.branding?.secondaryColor || '#333333'
                    } 100%)`,
                  }}
                >
                  <div className="absolute top-4 right-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white hover:bg-white/20 rounded-full"
                        >
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(branch)}>
                          <Edit size={14} className="mr-2" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(branch)}>
                          {branch.isActive ? (
                            <>
                              <PowerOff size={14} className="mr-2" /> Deactivate
                            </>
                          ) : (
                            <>
                              <Power size={14} className="mr-2" /> Activate
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-3 translate-y-8">
                    <div className="w-16 h-16 rounded-2xl bg-background border-4 border-background shadow-lg overflow-hidden flex items-center justify-center">
                      {branch.branding?.logoUrl ? (
                        <img
                          src={branch.branding.logoUrl}
                          alt="Logo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Store className="text-muted-foreground/30" size={32} />
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-10 px-6 pb-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-black text-lg leading-tight">
                        {branch.name}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium mt-1">
                        {branch.branding?.companyName || branch.name}
                      </p>
                    </div>
                    <Badge
                      variant={branch.isActive ? 'default' : 'secondary'}
                      className="capitalize"
                    >
                      {branch.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-sm text-muted-foreground">
                      <MapPin size={16} className="shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{branch.address}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Phone size={16} className="shrink-0" />
                      <span>{branch.contactNumber}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
                <div className="col-span-2 space-y-2">
                  <Label>Logo URL</Label>
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
                    placeholder="https://..."
                  />
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
            <Button onClick={handleSave} className="font-bold">
              <Check size={16} className="mr-2" />
              Save Branch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Branches;
