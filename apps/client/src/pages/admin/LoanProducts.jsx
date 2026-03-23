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
            variant="gradient"
            className="px-6 py-2.5 rounded-full flex items-center justify-center gap-2 text-[11px] font-black uppercase tracking-widest w-full sm:w-auto"
            isLoading={loading && products.length === 0}
          >
            <Plus size={16} />
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
      <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-sm rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-8 pb-4 border-b border-border/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-black tracking-tight">
                Product Catalog
              </CardTitle>
              <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-widest mt-1">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Product Name
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Interest Rate
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Duration
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Type
                  </th>
                  <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Status
                  </th>
                  {isAdmin && (
                    <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((product) => (
                    <tr
                      key={product._id}
                      className="group hover:bg-muted/20 transition-all duration-300"
                    >
                      <td className="px-8 py-5">
                        <div className="text-sm font-black capitalize tracking-tight group-hover:text-primary transition-colors">
                          {product.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-medium mt-0.5 max-w-[200px] truncate">
                          {product.description || 'No description'}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-1.5 text-emerald-500">
                          <TrendingUp size={14} />
                          <span className="text-sm font-black">
                            {product.interestRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Clock size={14} />
                          <span className="text-sm font-bold">
                            {product.duration} Months
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-500 px-2.5 py-1 rounded-full">
                          {product.interestType}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${product.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}
                        >
                          {product.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 rounded-lg border-border/50 hover:bg-primary/5 hover:text-primary"
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
                              className="h-8 w-8 rounded-lg border-border/50 hover:bg-rose-500/5 hover:text-rose-500"
                              onClick={() => setDeleteProduct(product)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={isAdmin ? 6 : 5}
                      className="px-8 py-12 text-center"
                    >
                      <div className="flex flex-col items-center justify-center opacity-30">
                        <AlertCircle size={48} className="mb-4" />
                        <p className="text-xs font-black uppercase tracking-widest">
                          No loan products found
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
