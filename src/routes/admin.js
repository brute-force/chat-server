const router = require('express').Router();
const { getUsersInRoom, removeUserFromRoom } = require('../utils/users');
const { generateMessage } = require('../utils/messages');

// should protect this route w/ an admin user
const returnRouter = (io) => {
  // get all the users in room
  router.get('/getUsers/:room', (req, res) => {
    res.json(getUsersInRoom(req.params.room));
  });

  // kick a user from a room and disconnect
  router.get('/removeUser/:username/:room', (req, res) => {
    const user = removeUserFromRoom(req.params.username, req.params.room);

    if (user) {
      if (io.sockets.connected[user.id]) {
        try {
          console.log(`attempting to remove ${user.username} ${user.id} from ${user.room}.`);
          io.sockets.connected[user.id].disconnect();

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

    res.json(user || { message: `${req.params.username} not found in ${req.params.room}.` });
  });

  return router;
};

module.exports = returnRouter;
