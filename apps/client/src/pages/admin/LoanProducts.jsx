import { useState, useEffect } from 'react';
import {
  Plus,
  BookOpen,
  TrendingUp,
  Clock,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import StatsCard from '@/components/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TableSearch from '@/components/ui/TableSearch';
import { TablePageSkeleton } from '@/components/ui/PageSkeletons';
import api from '@/lib/axios';
import { toast } from 'sonner';
import LoanProductModal from '@/components/loans/LoanProductModal';
import ConfirmActionModal from '@/components/ui/ConfirmActionModal';

const LoanProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/loan-products');
      setProducts(data);
    } catch (error) {
      console.error('Failed to fetch loan products:', error);
      toast.error('Failed to load loan products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleDelete = async () => {
    if (!deleteProduct) return;
    setIsDeleting(true);
    try {
      await api.delete(`/loan-products/${deleteProduct._id}`);
      toast.success('Loan product deleted successfully');
      fetchProducts();
      setDeleteProduct(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    } finally {
      setIsDeleting(false);
    }
  };

  const isAdmin =
    (JSON.parse(localStorage.getItem('user') || '{}') || {}).role === 'admin';

  if (loading && products.length === 0) {
    return <TablePageSkeleton />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={
          <>
            Loan <span className="text-primary">Products</span>
          </>
        }
        description="Define and manage standardized loan templates for your branch."
      >
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingProduct(null);
              setIsModalOpen(true);
            }}
            className="group inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 text-white px-6 py-3 h-auto rounded-full font-bold text-[13px] shadow-[0_10px_30px_-10px_rgba(99,102,241,0.5)] hover:-translate-y-0.5 transition-all duration-300 w-full sm:w-auto"
            isLoading={loading && products.length === 0}
          >
            <Plus size={14} strokeWidth={2.5} />
            Create Product
          </Button>
        )}
      </PageHeader>

      {/* Stats Summary */}
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          title="Active Products"
          amount={products.filter((p) => p.isActive).length}
          icon={<CheckCircle2 size={20} />}
          color="bg-primary shadow-primary/20"
        />
        <StatsCard
          title="Total Templates"
          amount={products.length}
          icon={<BookOpen size={20} />}
          color="bg-indigo-500 shadow-indigo-500/20"
        />
        <StatsCard
          title="Inactive"
          amount={products.filter((p) => !p.isActive).length}
          icon={<XCircle size={20} />}
          color="bg-rose-500 shadow-rose-500/20"
        />
      </div>

      {/* Products Table */}
      <Card className="border border-slate-100 dark:border-white/[0.06] bg-white dark:bg-white/[0.02] shadow-none rounded-[2rem] overflow-hidden">
        <CardHeader className="p-6 sm:p-8 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                Catalog
              </p>
              <CardTitle className="text-xl font-extrabold tracking-[-0.025em] text-slate-900 dark:text-white">
                Product Catalog
              </CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Standardized terms for consistent loan issuance
              </p>
            </div>
            <TableSearch
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search products..."
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3">
            {/* Desktop Header */}
            <div className="hidden lg:grid grid-cols-12 gap-4 px-6 sm:px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="col-span-3">Product Name</div>
              <div className="col-span-2">Interest Rate</div>
              <div className="col-span-2">Duration</div>
              <div className="col-span-2">Type</div>
              <div className="col-span-2">Status</div>
              {isAdmin && <div className="col-span-1 text-right">Actions</div>}
            </div>

            <div className="space-y-3 lg:space-y-0 lg:divide-y lg:divide-slate-100 lg:dark:divide-white/[0.06] px-4 pb-4 lg:px-0 lg:pb-0 pt-4 lg:pt-0">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <div
                    key={product._id}
                    className="group flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-4 p-5 lg:px-6 lg:py-4 rounded-2xl lg:rounded-none bg-slate-50/40 dark:bg-white/[0.02] lg:bg-transparent border border-slate-100 dark:border-white/[0.06] lg:border-transparent hover:bg-slate-50/60 dark:hover:bg-white/[0.03] transition-all duration-300"
                  >
                    {/* Mobile Header: Name & Status */}
                    <div className="flex lg:hidden items-center justify-between border-b border-slate-100 dark:border-white/[0.06] pb-3 mb-2">
                      <div className="text-sm font-black capitalize tracking-tight text-primary">
                        {product.name}
                      </div>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${product.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Desktop Name */}
                    <div className="hidden lg:flex flex-col col-span-3 justify-center">
                      <div className="text-sm font-black capitalize tracking-tight group-hover:text-primary transition-colors">
                        {product.name}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-medium mt-0.5 max-w-[200px] truncate">
                        {product.description || 'No description'}
                      </div>
                    </div>

                    {/* Mobile Description */}
                    <div className="lg:hidden text-xs text-muted-foreground font-medium mb-2">
                      {product.description || 'No description'}
                    </div>

                    {/* Interest Rate */}
                    <div className="flex items-center justify-between lg:justify-start col-span-2">
                      <span className="lg:hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Interest Rate
                      </span>
                      <div className="flex items-center gap-1.5 text-emerald-500">
                        <TrendingUp size={14} />
                        <span className="text-sm font-black">
                          {product.interestRate}%
                        </span>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="flex items-center justify-between lg:justify-start col-span-2">
                      <span className="lg:hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Duration
                      </span>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock size={14} />
                        <span className="text-sm font-bold">
                          {product.duration} Months
                        </span>
                      </div>
                    </div>

                    {/* Type */}
                    <div className="flex items-center justify-between lg:justify-start col-span-2">
                      <span className="lg:hidden text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        Type
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-full">
                        {product.interestType}
                      </span>
                    </div>

                    {/* Desktop Status */}
                    <div className="hidden lg:flex items-center col-span-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${product.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Actions */}
                    {isAdmin && (
                      <div className="flex items-center justify-end lg:justify-end col-span-1 mt-3 lg:mt-0 pt-3 lg:pt-0 border-t border-slate-100 dark:border-white/[0.06] lg:border-transparent">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full border-slate-100 dark:border-white/[0.06] hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                            onClick={() => {
                              setEditingProduct(product);
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full border-slate-100 dark:border-white/[0.06] hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30"
                            onClick={() => setDeleteProduct(product)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-12 text-center flex flex-col items-center justify-center opacity-30">
                  <AlertCircle size={48} className="mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">
                    No loan products found
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmActionModal
        isOpen={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onConfirm={handleDelete}
        loading={isDeleting}
        title="Delete Product"
        description={
          <>
            Are you sure you want to delete the product{' '}
            <span className="font-bold text-foreground">
              "{deleteProduct?.name}"
            </span>
            ? This action cannot be undone.
          </>
        }
        confirmText="Delete Product"
        variant="danger"
      />

      <LoanProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchProducts}
        product={editingProduct}
      />
    </div>
  );
};

export default LoanProducts;
