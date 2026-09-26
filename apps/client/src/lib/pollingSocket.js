// Keep the event contract used by chat, notifications and session revocation.
export const createPollingSocket = (api, { interval = 5000 } = {}) => {
  const listeners = new Map();
  let cursor;
  let stopped = false;
  let timer;
  let failureCount = 0;
  let presence = new Map();
  const controller = new AbortController();
  const dispatch = (event, data) => {
    for (const fn of listeners.get(event) || []) fn(data);
  };
  const socket = {
    connected: false,
    id: 'http-polling',
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
      return socket;
    },
    off(event, fn) {
      if (fn) listeners.get(event)?.delete(fn);
      else listeners.delete(event);
      return socket;
    },
    emit(event, { conversationId } = {}) {
      const statuses = {
        typing: { isTyping: true }, 'stop-typing': { isTyping: false },
        recording: { isRecording: true }, 'stop-recording': { isRecording: false },
      };
      if (!stopped && conversationId && statuses[event]) {
        api.post(`/chat/conversations/${encodeURIComponent(conversationId)}/status`, statuses[event]).catch(() => {});
      }
      return socket;
    },
    disconnect() {
      stopped = true;
      clearTimeout(timer);
      controller.abort();
      document.removeEventListener('visibilitychange', wake);
      socket.connected = false;
      listeners.clear();
    },
  };
  let polling = false;
  const poll = async () => {
    if (stopped || polling) return;
    if (document.hidden) { timer = setTimeout(poll, 15000); return; }
    polling = true;
    let delay = interval;
    try {
      const { data } = await api.get('/realtime', { params: { after: cursor }, signal: controller.signal });
      if (stopped) return;
      cursor = data.cursor;
      failureCount = 0;
      if (!socket.connected) { socket.connected = true; dispatch('connect'); }
      for (const { event, data: payload } of data.events) dispatch(event, payload);
      const next = new Map(data.presence.map((p) => [p.userId, p]));
      for (const [id, p] of next) if (!presence.has(id)) dispatch('user:online', p);
      for (const [id, p] of presence) if (!next.has(id)) dispatch('user:offline', p);
      presence = next;
      dispatch('user:presence_list', data.presence);
      if (data.hasMore) delay = 0;
    } catch {
      if (socket.connected) { socket.connected = false; dispatch('disconnect', 'poll failed'); }
      failureCount += 1;
      delay = Math.min(30000, interval * 2 ** failureCount);
    } finally {
      polling = false;
      if (!stopped) timer = setTimeout(poll, delay);
    }
  };
  const wake = () => {
    if (!document.hidden) { clearTimeout(timer); poll(); }
  };
  document.addEventListener('visibilitychange', wake);
  timer = setTimeout(poll, 0);
  return socket;
};
