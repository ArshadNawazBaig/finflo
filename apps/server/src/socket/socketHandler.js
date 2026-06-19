const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const Member = require('../models/Member');
const User = require('../models/User');
const { setIO } = require('../utils/socketInstance');

const onlineUsers = new Map();

const initSocket = (httpServer, clientUrl) => {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'http://localhost:3000',
        'capacitor://localhost',
        'http://localhost',
        clientUrl,
        'https://loan-master-client.vercel.app',
        'https://finflo-production.up.railway.app',
        'https://app.finflo.org',
        'https://finflo.org',
      ],
      credentials: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    },
    allowEIO3: true,
  });

  setIO(io);

  // Auth middleware
  io.use(async (socket, next) => {
    try {
      let token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token && socket.handshake.headers?.cookie) {
        const cookieToken = socket.handshake.headers.cookie
          .split('; ')
          .find((c) => c.startsWith('token='))
          ?.split('=')[1];
        if (cookieToken) token = cookieToken;
      }

      if (!token) {
        socket.isObserver = true;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const member = await Member.findById(decoded.id).select('_id name user');
      if (member) {
        socket.userId = member._id.toString();
        socket.businessId = member.user.toString();
        socket.userModel = 'Member';
      } else {
        const user = await User.findById(decoded.id).select(
          '_id name role effectiveOwnerId branchId'
        );
        if (!user) return next(new Error('User not found'));
        socket.userId = user._id.toString();
        socket.userModel = 'User';
        socket.userRole = user.role;
        socket.effectiveOwnerId = (user.effectiveOwnerId || user._id).toString();
      }
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    handleConnection(io, socket);
  });

  return io;
};

const handleConnection = (io, socket) => {
  if (socket.isObserver) {
    socket.on('join:pending_member', async ({ memberId }) => {
      try {
        if (!memberId) return;
        const member = await Member.findById(memberId).select(
          '_id approvalStatus rejectionReason',
        );
        if (!member) return;

        if (member.approvalStatus === 'pending') {
          // Still pending — join the room to receive the live decision.
          socket.join(`pending_member_${memberId}`);
        } else if (['approved', 'rejected'].includes(member.approvalStatus)) {
          // A decision was already made (e.g. the member returned via a saved
          // status link). Replay it straight to this socket so the waiting
          // screen updates immediately instead of showing a stale "pending".
          socket.emit('member:approval_result', {
            status: member.approvalStatus,
            memberId: member._id,
            rejectionReason: member.rejectionReason,
            message:
              member.approvalStatus === 'approved'
                ? 'Your account has been approved! You can now log in.'
                : 'Your registration was not approved at this time.',
          });
        }
      } catch (err) {
        console.error('[Socket] join:pending_member error:', err.message);
      }
    });
    return;
  }

  socket.join(`user_${socket.userId}`);
  
  if (!onlineUsers.has(socket.userId)) {
    onlineUsers.set(socket.userId, { userModel: socket.userModel, count: 1 });
    socket.broadcast.emit('user:online', {
      userId: socket.userId,
      userModel: socket.userModel,
    });
  } else {
    onlineUsers.get(socket.userId).count++;
  }

  socket.emit(
    'user:presence_list',
    Array.from(onlineUsers.entries()).map(([id, data]) => ({
      userId: id,
      userModel: data.userModel,
    }))
  );

  const businessRoomId = socket.businessId || socket.effectiveOwnerId;
  if (businessRoomId) {
    socket.join(`business_${businessRoomId}`);
  }

  // Event handlers
  socket.on('typing', ({ conversationId, receiverId }) => {
    socket.to(`user_${receiverId}`).emit('user:typing', { conversationId, userId: socket.userId });
  });

  socket.on('stop-typing', ({ conversationId, receiverId }) => {
    socket.to(`user_${receiverId}`).emit('user:stop-typing', { conversationId, userId: socket.userId });
  });

  socket.on('recording', ({ conversationId, receiverId }) => {
    socket.to(`user_${receiverId}`).emit('user:recording', { conversationId, userId: socket.userId });
  });

  socket.on('stop-recording', ({ conversationId, receiverId }) => {
    socket.to(`user_${receiverId}`).emit('user:stop-recording', { conversationId, userId: socket.userId });
  });

  socket.on('disconnect', () => {
    const entry = onlineUsers.get(socket.userId);
    if (entry) {
      entry.count--;
      if (entry.count <= 0) {
        onlineUsers.delete(socket.userId);
        io.emit('user:offline', { userId: socket.userId, userModel: socket.userModel });
      }
    }
  });
};

module.exports = { initSocket };
