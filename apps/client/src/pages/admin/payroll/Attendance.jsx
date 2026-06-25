import { useState, useEffect, useCallback } from 'react';
import { CalendarCheck, Save, Users } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import PillSelect from '@/components/ui/PillSelect';
import DataTable from '@/components/ui/DataTable';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import api from '@/lib/axios';
import { toast } from 'sonner';
import { capitalize } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'absent', label: 'Absent' },
  { value: 'late', label: 'Late' },
  { value: 'half-day', label: 'Half Day' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'leave', label: 'Leave' },
];

const todayStr = () => new Date().toISOString().slice(0, 10);

const Attendance = () => {
  const [date, setDate] = useState(todayStr());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [empRes, attRes] = await Promise.all([
        api.get('/employees?status=active&limit=100'),
        api.get('/attendance', { params: { from: date, to: date, limit: 100 } }),
      ]);

      const employees = empRes.data.data || [];
      const records = attRes.data.data || [];
      const byEmployee = new Map(
        records.map((r) => [r.employee?._id, r]),
      );

      setRows(
        employees.map((emp) => {
          const record = byEmployee.get(emp._id);
          return {
            _id: emp._id,
            employeeId: emp.employeeId,
            name: emp.name,
            status: record?.status || 'present',
            overtime: record?.overtime ?? '',
          };
        }),
      );
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateRow = (id, key, value) =>
    setRows((prev) =>
      prev.map((row) => (row._id === id ? { ...row, [key]: value } : row)),
    );

  const handleSave = async () => {
    if (rows.length === 0) return;
    try {
      setSaving(true);
      const res = await api.post('/attendance/bulk', {
        date,
        records: rows.map((row) => ({
          employeeId: row._id,
          status: row.status,
        })),
      });
      toast.success(res.data?.message || 'Attendance saved');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Employee',
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
            {capitalize(row.name) || '—'}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.employeeId || '—'}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <PillSelect
          value={row.status}
          onValueChange={(v) => updateRow(row._id, 'status', v)}
          options={STATUS_OPTIONS}
          className="w-40"
        />
      ),
    },
    {
      key: 'overtime',
      header: 'Overtime (hrs)',
      align: 'right',
      render: (row) => (
        <Input
          type="number"
          min="0"
          step="0.5"
          value={row.overtime}
          onChange={(e) => updateRow(row._id, 'overtime', e.target.value)}
          placeholder="0"
          className="ml-auto h-9 w-24 rounded-full text-right tabular-nums"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title="Attendance"
        description="Mark daily attendance for active employees."
        action={
          <Button
            onClick={handleSave}
            className="rounded-full font-bold"
            isLoading={saving}
            disabled={loading || rows.length === 0}
          >
            <Save className="mr-2 h-4 w-4" strokeWidth={2.5} />
            {saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        }
      />

      <div className="flex flex-col gap-3 rounded-[2rem] border border-slate-100 bg-white p-5 dark:border-white/[0.06] dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarCheck className="h-4 w-4 text-slate-400" />
          <DatePicker
            value={date}
            onChange={(v) => v && setDate(v)}
            maxDate={new Date()}
            allowClear={false}
            className="w-48"
          />
        </div>
        {!loading && rows.length > 0 && (
          <span className="text-sm font-medium text-muted-foreground">
            {rows.length} active {rows.length === 1 ? 'employee' : 'employees'}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white dark:border-white/[0.06] dark:bg-white/[0.02]">
        <DataTable
          columns={columns}
          data={rows}
          loading={loading}
          emptyState={{
            icon: Users,
            title: 'No Active Employees',
            description:
              'Add active employees to start marking their attendance.',
          }}
        />
      </div>
    </div>
  );
};

export default Attendance;
