// this stores user/room info in memory only
const users = [];

const addUser = ({ id, username, email, room }) => {
  // prevent "dupes"
  username = username.trim();
  room = room.trim().toLowerCase();

  if (!username || !room) {
    throw new Error('username and room required.');
  } else if (username === 'admin') {
    throw new Error('change your username.');
  }

  const existingUser = users.find((user) => user.room === room && user.username === username);

  if (existingUser) {
    throw new Error(`${username} in use.`);
  }

  const user = { id, username, email, room };
  users.push(user);

  return user;
};

const removeUser = (id) => {
  const index = users.findIndex((user) => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
};

// kick a user
const removeUserFromRoom = (username, room) => {
  const index = users.findIndex((user) => user.username === username && user.room === room);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
};

const getUser = (id) => {
  return users.find((user) => user.id === id);
};

const getUsersInRoom = (room) => {
  return users.filter((user) => user.room === room);
};

const getRooms = () => {
  return users.map((user) => user.room).filter((room, i, rooms) => rooms.indexOf(room) === i);
};

module.exports = {
  addUser,
  removeUser,
  removeUserFromRoom,
  getUser,
  getUsersInRoom,
  getRooms
};
