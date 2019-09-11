const router = require('express').Router();
const { getUser, getUsersInRoom, removeUserFromRoom } = require('../utils/users');
const { generateMessage } = require('../utils/messages');

// should protect this route w/ an admin user
const returnRouter = (io) => {
  // protect these routes w/ a set admin user
  router.all('/*', (req, res, next) => {
    if (req.user.user_id !== process.env.USER_ADMIN) {
      res.json({ message: 'not an admin', isAuthenticated: req.isAuthenticated() });
    } else {
      next();
    }
  });

  // get all the users in room
  router.get('/getRooms', (req, res) => {
    const original = io.sockets.adapter.rooms;
    const rooms = [];

    Object.keys(io.sockets.adapter.rooms).map((key) => {
      const name = key;
      const sockets = Object.keys(original[name].sockets);

      const room = {
        name,
        users: []
      };

      sockets.forEach((socket) => {
        room.users.push({ id: socket, username: getUser(socket) });
      });

      rooms.push(room);
    });

    res.json(rooms);
  });

  // get all the users in room
  router.get('/getUsersInRoom/:room', (req, res) => {
    res.json(getUsersInRoom(req.params.room));
  });

  // kick a user from a room and disconnect
  router.get('/removeUser/:username/:room', (req, res) => {
    const user = removeUserFromRoom(req.params.username, req.params.room);

    if (user) {
      const socketsConnected = io.of('/').connected;
      const socketToKick = socketsConnected[user.id];

      if (socketToKick) {
        try {
          console.log(`attempting to remove ${user.username} ${user.id} from ${user.room}.`);
          socketToKick.leave(req.params.room);
          // io.sockets.connected[user.id].disconnect();

          // tell everyone user removed from room
          const msgRemoved = `${user.username} removed from ${user.room}.`;
          console.log(msgRemoved);
          io.to(user.room).emit('message', generateMessage('admin', msgRemoved));

          // update room user list
          io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
          });
        } catch (err) {
          console.log(`error removing ${user.username} from ${user.room}: ${err.message}`);
        }
      } else {
        console.log(`${user.username} removed from ${user.room}. no sockets open.`);
      }
    }

    res.json(user || {
      message: `${req.params.username} not found in ${req.params.room}.`,
      room: {
        name: req.params.room,
        users: getUsersInRoom(req.params.room)
      }
    });
  });

  return router;
};

module.exports = returnRouter;
