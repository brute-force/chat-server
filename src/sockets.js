const { generateMessage, asyncReplaceYouTubeLinks } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom, removeUserFromRoom } = require('./utils/users');
const SocketError = require('./utils/SocketError');

module.exports = (io) => {
  // handle the chat events
  io.on('connection', (socket) => {
    socket.on('message', async (message, callback) => {
      const user = getUser(socket.id);

      if (user) {
        // catch some youtubes and send it to everyone
        var regexTubes = /https:\/\/(www\.)?(youtube.com|youtu.be)\/(watch\?v=)?.{11}((\?|&)t=\d+)?/g;
        var tubes = message.match(regexTubes);

        if (tubes && tubes.length > 0) {
          // replace youtube link w/ embeddable link
          let tube = tubes[0].replace(/(youtu\.be\/)(.{11})/, 'youtube.com/embed/$2').replace(/watch\?v=/, 'embed/');
          tube = tube.replace(/(&|\?)t=/, '?start=');
          io.to(user.room).emit('youtube', generateMessage(user.username, tube));

          message = await asyncReplaceYouTubeLinks(message);
        }

        io.to(user.room).emit('message', generateMessage(user.username, message));
        callback(null, 'message sent');
      } else {
        callback(new SocketError('oops! you got kicked, son!'));
      }
    });

    // send user location
    socket.on('location', (coords, callback) => {
      const user = getUser(socket.id);

      if (user) {
        io.to(user.room).emit('location', generateMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`));

        callback(null, 'location shared');
      } else {
        callback(new SocketError('oops! you got kicked, son!'));
      }
    });

    socket.on('join', ({ room, username }, callback) => {
      try {
        const user = addUser({ id: socket.id, username, room });
        socket.join(user.room);

        // tell everyone user joined room
        const msgJoined = `${user.username} joined ${room}.`;
        console.log(msgJoined);
        socket.emit('message', generateMessage('admin', `welcome to ${room}, ${user.username}.`));
        socket.broadcast.to(user.room).emit('message', generateMessage('admin', msgJoined));

        // update room user list
        io.to(user.room).emit('roomData', {
          room: user.room,
          users: getUsersInRoom(user.room)
        });

        callback(null, user);
      } catch (err) {
        callback(new SocketError(err.message));
      }
    });

    // remove user on disonnect
    socket.on('disconnect', () => {
      const user = removeUser(socket.id);

      if (user) {
        try {
          socket.leave(user.room);
          socket.disconnect();

          // tell everyone user left room
          const msgLeft = `${user.username} left ${user.room}.`;
          console.log(msgLeft);
          io.to(user.room).emit('message', generateMessage('admin', msgLeft));

          // update room user list
          io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
          });
        } catch (err) {
          console.log(`error disconnecting ${user.username} from ${user.room}: ${err.message}`);
        }
      } else {
        if (io.sockets.connected[socket.id]) {
          console.log(`unidentified user connection found. ${socket.id} disconnecting.`);
          // io.sockets.connected[socket.id].disconnect();
          socket.disconnect();

          if (io.sockets.connected[socket.id]) {
            console.log(`${socket.id} not disconnected.`);
          } else {
            console.log(`${socket.id} disconnected.`);
          }
        } else {
          console.log(`unidentified user connection not found. ${socket.id} already disconnected.`);
        }
      }
    });

    // kick a user
    socket.on('kick', ({ username, room }, callback) => {
      const kicker = getUser(socket.id);

      if (kicker.username === username) {
        callback(new SocketError(`cannot kick yourself from ${room}.`));
      } else {
        const user = removeUserFromRoom(username, room);

        if (user) {
          // tell everyone user got kicked :(
          const msgKicked = `${kicker.username} kicked ${user.username} from ${user.room}.`;
          console.log(msgKicked);
          io.to(user.room).emit('message', generateMessage('admin', msgKicked));

          // update room user list
          io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
          });

          callback(null, user);
        } else {
          callback(new SocketError(`${username} not found in ${room}.`));
        }
      }
    });
  });
};
