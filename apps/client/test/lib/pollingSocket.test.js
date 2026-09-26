import { createPollingSocket } from '../../src/lib/pollingSocket';

describe('HTTP realtime transport', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('delivers events and resumes from its last cursor', async () => {
    const api = { get: vi.fn()
      .mockResolvedValueOnce({ data: { events: [], cursor: 10, presence: [] } })
      .mockResolvedValueOnce({ data: { events: [{ event: 'notification:new', data: { title: 'hello' } }], cursor: 11, presence: [] } }),
    };
    const socket = createPollingSocket(api);
    const onEvent = vi.fn();
    socket.on('notification:new', onEvent);
    await vi.advanceTimersByTimeAsync(0);
    expect(socket.connected).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);
    expect(api.get.mock.calls[1][1].params.after).toBe(10);
    expect(onEvent).toHaveBeenCalledWith({ title: 'hello' });
    socket.disconnect();
    await vi.advanceTimersByTimeAsync(20000);
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('backs off after failure and emits reconnect events', async () => {
    const api = { get: vi.fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue({ data: { events: [], cursor: 1, presence: [] } }),
    };
    const socket = createPollingSocket(api);
    const connected = vi.fn();
    socket.on('connect', connected);
    await vi.advanceTimersByTimeAsync(0);
    expect(socket.connected).toBe(false);
    await vi.advanceTimersByTimeAsync(10000);
    expect(connected).toHaveBeenCalledTimes(1);
    socket.disconnect();
  });

  it('does not deliver a late response after disconnect', async () => {
    let resolve;
    const api = { get: vi.fn(() => new Promise((r) => { resolve = r; })) };
    const socket = createPollingSocket(api);
    const connected = vi.fn();
    socket.on('connect', connected);
    await vi.advanceTimersByTimeAsync(0);
    socket.disconnect();
    resolve({ data: { events: [], cursor: 1, presence: [] } });
    await vi.advanceTimersByTimeAsync(0);
    expect(connected).not.toHaveBeenCalled();
    expect(socket.connected).toBe(false);
  });
});
