/**
 * socketInstance.js
 * A simple singleton to store and retrieve the Socket.io `io` instance.
 * This allows any module (e.g., notificationHelper) to emit events
 * without creating circular dependencies with index.js.
 */

let _io = null;

const setIO = (io) => {
  _io = io;
};

const getIO = () => _io;

module.exports = { setIO, getIO };
