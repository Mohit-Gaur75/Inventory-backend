const { Server } = require("socket.io");
const jwt        = require("jsonwebtoken");
const User       = require("./models/User");

const onlineUsers = new Map(); 
let _io = null;

const getIO = () => {
  if (!_io) throw new Error("Socket.IO has not been initialized yet");
  return _io;
};

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:3000",
        process.env.CLIENT_URL,
      ].filter(Boolean),
      credentials: true,
    },
    pingTimeout: 60000,
  });

  _io = io; 

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user    = await User.findById(decoded.id).select("-password");
      if (!user)    return next(new Error("User not found"));
      if (user.isBanned) return next(new Error("Account banned"));

      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    console.log(`🔌 Socket connected: ${socket.user.name}`);

    onlineUsers.set(userId, socket.id);
    socket.join(`user:${userId}`);

    socket.broadcast.emit("user:online", { userId });

    socket.on("shop:subscribe", (shopId) => {
      if (shopId) {
        socket.join(`shop:${shopId}`);
        console.log(`📦 ${socket.user.name} subscribed to shop:${shopId}`);
      }
    });

    socket.on("shop:unsubscribe", (shopId) => {
      if (shopId) {
        socket.leave(`shop:${shopId}`);
        console.log(`📦 ${socket.user.name} unsubscribed from shop:${shopId}`);
      }
    });

    socket.on("stock:update", ({ productId, stock, shopId }) => {
      io.to(`shop:${shopId}`).emit("stock:updated", { productId, stock, shopId });
    });

    socket.on("price:update", ({ productId, price, shopId }) => {
      io.to(`shop:${shopId}`).emit("price:updated", { productId, price, shopId });
    });

    socket.on("shop:open", ({ shopId }) => {
      io.emit("shop:statusChanged", { shopId, isOpen: true, computedIsOpen: true });
    });

    socket.on("shop:close", ({ shopId }) => {
      io.emit("shop:statusChanged", { shopId, isOpen: false, computedIsOpen: false });
    });

    socket.on("cart:sync", (cartItems) => {
      socket.to(`user:${userId}`).emit("cart:synced", cartItems);
    });

    socket.on("disconnect", () => {
      console.log(`❌ Disconnected: ${socket.user.name}`);
      onlineUsers.delete(userId);
      io.emit("user:offline", { userId });
    });
  });

  return io;
};

module.exports = { initSocket, getIO, onlineUsers };
