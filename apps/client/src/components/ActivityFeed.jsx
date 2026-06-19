import { useState, useEffect } from 'react';
import { Clock, Activity, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/lib/axios';
import { Button } from '@/components/ui/button';

const ActivityFeed = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get('/activity-logs', { params: { limit: 5 } });
      if (res.data && res.data.logs) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error('Failed to load activity logs', err);
      setError('Unable to load recent activity.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="divide-y divide-border/50">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4 w-full">
              <div className="w-10 h-10 rounded-full bg-muted/30 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-3/4 bg-muted/30 animate-pulse rounded" />
                <div className="h-3 w-1/4 bg-muted/30 animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 sm:p-10 text-center flex flex-col items-center">
        <AlertCircle className="w-8 h-8 text-destructive/50 mb-3" />
        <p className="text-muted-foreground text-sm font-medium">{error}</p>
        <Button
          variant="ghost"
          onClick={fetchLogs}
          className="mt-4 text-xs font-bold text-primary hover:underline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="p-6 sm:p-10 text-center flex flex-col items-center">
        <Activity className="w-8 h-8 text-muted-foreground/30 mb-3" />
        <p className="text-muted-foreground text-sm font-medium">
          No recent activity detected.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {logs.map((log) => (
        <div
          key={log._id}
          className="group flex items-center justify-between p-4 sm:p-5 hover:bg-primary/5 transition-colors duration-300"
        >
          <div className="flex items-start gap-4">
            <div className="mt-1">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-border/50 shadow-sm group-hover:scale-110 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold leading-tight text-foreground/90">
                {log.action.replace(/_/g, ' ').toUpperCase()}
              </p>
              <p className="text-xs font-medium text-muted-foreground">
                {log.details}
              </p>
              <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest mt-1">
                {format(new Date(log.createdAt), 'MMM d, yyyy • h:mm a')}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityFeed;
