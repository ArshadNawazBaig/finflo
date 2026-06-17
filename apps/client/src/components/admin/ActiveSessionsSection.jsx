/* eslint-disable react/prop-types -- project convention: no propTypes */
import { useState, useEffect, useCallback } from 'react';
import {
  MonitorSmartphone,
  Smartphone,
  Monitor,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/axios';
import { toast } from 'sonner';

// Active device/session manager — the visible surface of the revocable-session
// layer. Lists the caller's live sessions (GET /auth/sessions), lets them sign a
// device out (DELETE /auth/sessions/:id) or sign out everywhere else
// (POST /auth/logout-all { keepCurrent: true }). The current device is flagged by
// the server and can't be revoked from here (use the Log out row for that).

const isMobileDevice = (device = '') =>
  /android|ios|iphone|ipad|mobile/i.test(device);

const relativeTime = (date) => {
  if (!date) return 'unknown';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return 'unknown';
  }
};

const SessionRow = ({ session, onRevoke, revoking }) => {
  const Icon = isMobileDevice(session.device) ? Smartphone : Monitor;
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/40 bg-background/40">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-muted/60 text-muted-foreground flex items-center justify-center">
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">
              {session.device || 'Unknown device'}
            </p>
            {session.current && (
              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 flex-shrink-0">
                This device
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {session.ip ? `${session.ip} · ` : ''}Active{' '}
            {relativeTime(session.lastUsedAt || session.createdAt)}
          </p>
        </div>
      </div>
      {!session.current && (
        <Button
          variant="ghost"
          size="sm"
          isLoading={revoking}
          onClick={() => onRevoke(session.id)}
          className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-widest flex-shrink-0"
        >
          Sign out
        </Button>
      )}
    </div>
  );
};

// basePath is '/auth' for business users (default) or '/member-auth' for members
// — the session-management endpoints are mounted under both.
const ActiveSessionsSection = ({ basePath = '/auth' }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [revokingAll, setRevokingAll] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const { data } = await api.get(`${basePath}/sessions`);
      setSessions(Array.isArray(data?.sessions) ? data.sessions : []);
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to load active sessions',
      );
    } finally {
      setLoading(false);
    }
  }, [basePath]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevoke = async (id) => {
    setRevokingId(id);
    try {
      await api.delete(`${basePath}/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success('Device signed out');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to sign out device');
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeAll = async () => {
    setRevokingAll(true);
    try {
      const { data } = await api.post(`${basePath}/logout-all`, {
        keepCurrent: true,
      });
      setSessions((prev) => prev.filter((s) => s.current));
      toast.success(
        data?.revoked
          ? `Signed out of ${data.revoked} other device${data.revoked === 1 ? '' : 's'}`
          : 'Signed out of all other devices',
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message || 'Failed to sign out other devices',
      );
    } finally {
      setRevokingAll(false);
    }
  };

  const otherCount = sessions.filter((s) => !s.current).length;

  return (
    <div className="border border-border/50 rounded-2xl p-5 bg-muted/20 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <MonitorSmartphone size={18} className="text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">Active Sessions</p>
            <p className="text-xs text-muted-foreground">
              Devices currently signed in to your account.
            </p>
          </div>
        </div>
        {otherCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            isLoading={revokingAll}
            onClick={handleRevokeAll}
            className="text-[10px] font-black uppercase tracking-widest flex-shrink-0"
          >
            <LogOut size={13} className="mr-1.5" />
            Log out others
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-xl border border-border/40"
            >
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
          <ShieldCheck size={22} className="text-muted-foreground/50" />
          <p className="text-xs text-muted-foreground">
            No other active sessions.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              revoking={revokingId === session.id}
              onRevoke={handleRevoke}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveSessionsSection;
