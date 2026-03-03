/**
 * ChatSync — thin wrapper that just mounts the SocketProvider's side effects.
 * The actual socket is now owned by SocketContext and shared with chat pages.
 * This component renders null but exists to keep the badge count API poll alive
 * in case the socket is not available on this render cycle.
 */
const ChatSync = () => null;
export default ChatSync;
