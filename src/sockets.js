const { generateMessage, asyncReplaceYouTubeLinks } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom, removeUserFromRoom, getRooms } = require('./utils/users');
const SocketError = require('./utils/SocketError');
const UserNotFoundError = require('./utils/UserNotFoundError');

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
        callback(new UserNotFoundError('oops! you got kicked, son!'));
      }
    });

    // send user location
    socket.on('location', (coords, callback) => {
      const user = getUser(socket.id);

      if (user) {
        const location = `https://google.com/maps?q=${coords.latitude},${coords.longitude}`;
        io.to(user.room).emit('location', generateMessage(user.username, location));

        callback(null, 'location shared');
      } else {
        callback(new UserNotFoundError('oops! you got kicked, son!'));
      }
    });

    socket.on('join', ({ room, username }, callback) => {
      try {
        const email = socket.request.session.passport.user;

        if (!username) {
          const userToRemove = getUser(socket.id);
          removeUserFromRoom(userToRemove.username, userToRemove.room);
          socket.leave(userToRemove.room);

          // tell everyone user left room
          const msgLeft = `${userToRemove.username} left ${userToRemove.room}.`;
          console.log(msgLeft);
          io.to(userToRemove.room).emit('message', generateMessage('admin', msgLeft));

          // update room user list
          io.to(userToRemove.room).emit('roomData', {
            room: userToRemove.room,
            users: getUsersInRoom(userToRemove.room)
          });

          username = userToRemove.username;
        }

        const user = addUser({ id: socket.id, username, email, room });

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

        // update everyone of room list
        io.emit('worldData', {
          rooms: getRooms()
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
          // socket.disconnect();

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
      }
    });

    // kick a user
    socket.on('kick', ({ username }, callback) => {
      const kicker = getUser(socket.id);

      if (kicker) {
        const room = kicker.room;

        if (kicker.username === username) {
          callback(new SocketError(`cannot kick yourself from ${room}.`));
        } else {
          const user = removeUserFromRoom(username, room);

          if (user) {
            const socketsConnected = io.of('/').connected;
            const socketToKick = socketsConnected[user.id];

            if (socketToKick) {
              try {
                console.log(`attempting to kick ${username} ${user.id} from ${room}.`);
                socketToKick.leave(room);

                // tell everyone user got kicked :(
                const msgKicked = `${kicker.username} kicked ${username} from ${room}.`;
                console.log(msgKicked);
                io.to(room).emit('message', generateMessage('admin', msgKicked));

                // update room user list
                io.to(room).emit('roomData', {
                  room: room,
                  users: getUsersInRoom(room)
                });
              } catch (err) {
                console.log(`error removing ${username} from ${room}: ${err.message}`);
              }
            } else {
              console.log(`${username} kicked from ${room}. no sockets open.`);
            }

            callback(null, user);
          } else {
            callback(new SocketError(`${username} not found in ${room}.`));
          }
        }
      } else {
        // kicker is not in this room or is disconnected. do you even go to this school?
        callback(new UserNotFoundError('oops! you\'re the one who got kicked, son!'));
      }
    });
  });
};
