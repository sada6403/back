const { Server } = require('socket.io');

let io;

const init = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH"]
        }
    });

    io.on('connection', (socket) => {
        console.log(`New socket connection: ${socket.id}`);

        socket.on('disconnect', () => {
            console.log(`Socket disconnected: ${socket.id}`);
        });
    });

    console.log('Socket.io Initialized');
    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io not initialized!');
    }
    return io;
};

// Event types constants to avoid typos
const EVENTS = {
    MEMBER_ADDED: 'member:added',
    MEMBER_UPDATED: 'member:updated',
    MEMBER_DELETED: 'member:deleted'
};

const broadcast = (event, data) => {
    if (io) {
        io.emit(event, data);
        console.log(`[Socket] Broadcast event: ${event}`);
    }
};

module.exports = { init, getIO, broadcast, EVENTS };
