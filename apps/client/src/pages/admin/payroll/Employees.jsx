import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Link2, Building2 } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import TableSearch from '@/components/ui/TableSearch';
import PillSelect from '@/components/ui/PillSelect';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import Pagination from '@/components/ui/Pagination';
import AddEmployeeModal from '@/components/payroll/AddEmployeeModal';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { formatCurrency, capitalize, getInitials } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'on-leave', label: 'On Leave' },
  { value: 'probation', label: 'Probation' },
  { value: 'terminated', label: 'Terminated' },
];

const Employees = () => {
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('all');
  const [department, setDepartment] = useState('all');
  const [departments, setDepartments] = useState([]);

  const fetchDepartments = useCallback(async () => {
    try {
      const { data } = await api.get('/payroll/departments?limit=200');
      setDepartments((data.data || []).map((d) => d.name));
    } catch {
      // Non-fatal — the filter just falls back to whatever names are loaded.
    }
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(limit),
      });
      if (searchTerm) params.set('search', searchTerm);
      if (status !== 'all') params.set('status', status);
      if (department !== 'all') params.set('department', department);

      const { data } = await api.get(`/employees?${params.toString()}`);
      setEmployees(data.data || []);
      setTotalEntries(data.totalEntries || 0);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit, searchTerm, status, department]);

  useEffect(() => {
    const t = setTimeout(fetchEmployees, searchTerm ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchEmployees, searchTerm]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const columns = [
    {
      key: 'name',
      header: 'Employee',
      render: (row) => (
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {getInitials(row.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
              {capitalize(row.name)}
            </p>
            <p className="text-xs text-muted-foreground">
              {row.employeeId || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: (row) => row.department || '—',
    },
    {
      key: 'designation',
      header: 'Designation',
      render: (row) => row.designation || '—',
    },
    {
      key: 'basicSalary',
      header: 'Basic Salary',
      align: 'right',
      render: (row) => (
        <span className="font-semibold tabular-nums">
          {formatCurrency(row.basicSalary)}
        </span>
      ),
    },
    {
      key: 'linkedCustomer',
      header: 'Linked',
      render: (row) =>
        row.linkedCustomer ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            <Link2 className="h-3 w-3" />
            Linked
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} />,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Employees"
        description="Manage payroll employees, salary structures, and linked records."
        action={
          <Button
            onClick={() => setIsModalOpen(true)}
            className="rounded-full font-bold"
          >
            <Plus className="mr-2 h-4 w-4" strokeWidth={2.5} />
            Add Employee
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-[2rem] border border-slate-100 bg-white p-5 dark:border-white/[0.06] dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between">
        <TableSearch
          value={searchTerm}
          onChange={(value) => {
            setSearchTerm(value);
            setCurrentPage(1);
          }}
          placeholder="Search employees..."
        />
        <div className="flex items-center gap-2">
          <PillSelect
            value={status}
            onValueChange={(v) => {
              setStatus(v);
              setCurrentPage(1);
            }}
            options={STATUS_OPTIONS}
            placeholder="All Statuses"
            className="w-44"
          />
          <PillSelect
            value={department}
            onValueChange={(v) => {
              setDepartment(v);
              setCurrentPage(1);
            }}
            icon={<Building2 size={14} />}
            placeholder="All Departments"
            className="w-48"
            options={[
              { value: 'all', label: 'All Departments' },
              ...departments.map((d) => ({ value: d, label: d })),
            ]}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white dark:border-white/[0.06] dark:bg-white/[0.02]">
        <DataTable
          columns={columns}
          data={employees}
          loading={loading}
          onRowClick={(row) => navigate(`/payroll/employees/${row._id}`)}
          emptyState={{
            icon: Users,
            title: 'No Employees Found',
            description: searchTerm
              ? 'No employees match your search.'
              : 'Add your first employee to start running payroll.',
          }}
        />

        {!loading && totalEntries > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalEntries={totalEntries}
            limit={limit}
            onPageChange={setCurrentPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      <AddEmployeeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setCurrentPage(1);
          fetchEmployees();
          fetchDepartments();
        }}
      />
    </div>
  );
};

export default Employees;
