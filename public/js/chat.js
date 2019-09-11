/* global moment */
/* global Mustache */
/* global io */

const socket = io();

const $form = document.querySelector('.form');
const $textMessage = $form.querySelector('input.message');
const $buttonSend = $form.querySelector('.send');
const $buttonLocation = $form.querySelector('.location');
const $buttonLogout = $form.querySelector('.logout');
const $divMessages = document.querySelector('#messages');
const $divSidebarRoom = document.querySelector('.chat__sidebar_room');
const $divSidebarRooms = document.querySelector('.chat__sidebar_rooms');

$textMessage.focus();

// mustache templates
const $scriptTemplateMessage = document.querySelector('#message-template');
const $scriptTemplateLocation = document.querySelector('#location-template');
const $scriptTemplateSidebarRoom = document.querySelector('#sidebar-room');
const $scriptTemplateSidebarRooms = document.querySelector('#sidebar-rooms');

const momentFormatTimestamp = 'h:mm:ss a';

const autoscroll = () => {
  const $lastMessage = $divMessages.lastElementChild;

  // latest message height
  const lastMessageStyle = window.getComputedStyle($lastMessage);
  const lastMessageMargin = parseInt(lastMessageStyle.marginBottom);
  const lastMessageHeight = $lastMessage.offsetHeight + lastMessageMargin;

  // visible height
  const visibleHeight = $divMessages.offsetHeight;

  const containerHeight = $divMessages.scrollHeight;

  // user scroll offset
  const scrollOffset = $divMessages.scrollTop + visibleHeight;

  // auto-scroll when user is at the bottom
  if (containerHeight - lastMessageHeight <= scrollOffset) {
    $divMessages.scrollTop = $divMessages.scrollHeight;
  }
};

// send message
$buttonSend.addEventListener('click', (e) => {
  if ($textMessage.value.trim().length === 0) {
    return;
  }

  e.preventDefault();
  $buttonSend.setAttribute('disabled', 'disabled');

  if (socket.connected) {
    // kick a user
    if (/^\/kick /.test($textMessage.value.trim())) {
      const username = $textMessage.value.trim().replace(/^\/kick (.+)/, '$1');

      socket.emit('kick', { username }, (err, data) => {
        if (err) {
          window.alert(err.message);

          if (err.name === 'UserNotFoundError') {
            window.location.href = '/auth/logout';
          }
        }
      });
    } else if (/^\/join /.test($textMessage.value.trim())) {
      const room = $textMessage.value.trim().replace(/^\/join (.+)/, '$1');

      socket.emit('join', { room }, (err, user) => {
        if (err) {
          window.alert(err.message);
          window.location.href = '/auth/logout';
        }
      });
    } else {
      socket.emit('message', $textMessage.value, (err, data) => {
        if (err) {
          window.alert(err.message);

          if (err.name === 'UserNotFoundError') {
            window.location.href = '/auth/logout';
          }
        }
      });
    }

    $buttonSend.removeAttribute('disabled');

    $textMessage.value = '';
    $textMessage.focus();
  } else {
    // disconnected. send back to login and choose room
    window.alert('you\'ve been disconnected. log in again.');
    window.location.href = '/auth/logout';
  }
});

// send location
$buttonLocation.addEventListener('click', (e) => {
  e.preventDefault();

  if (!navigator.geolocation) {
    return window.alert('no geolocation');
  }

  $buttonLocation.setAttribute('disabled', 'disabled');

  navigator.geolocation.getCurrentPosition((position) => {
    const coords = { latitude: position.coords.latitude, longitude: position.coords.longitude };

    socket.emit('location', coords, (err, data) => {
      if (err) {
        window.alert(err.message);

        if (err.name === 'UserNotFoundError') {
          window.location.href = '/auth/logout';
        }
      }

      $buttonLocation.removeAttribute('disabled');
    });
  });
});

// log out user and disconnect
$buttonLogout.addEventListener('click', (e) => {
  e.preventDefault();
  $buttonLogout.setAttribute('disabled', 'disabled');

  socket.emit('disconnect');

  $buttonLogout.removeAttribute('disabled');
  window.location.href = '/auth/logout';
});

document.querySelector('.chat__sidebar_rooms').addEventListener('click', (e) => {
  e.preventDefault();

  socket.emit('join', { room: e.target.innerText }, (err, user) => {
    if (err) {
      window.alert(err.message);
      window.location.href = '/auth/logout';
    }
  });
});

// get user info and join room
window.fetch('/user')
  .then((res) => res.json())
  .then((json) => {
    const room = json.room;
    const username = json.user.display_name;

    socket.emit('join', { room, username }, (err, user) => {
      if (err) {
        window.alert(err.message);
        window.location.href = '/auth/logout';
      }
    });
  });

// render message
socket.on('message', ({ username, message, createdAt }) => {
  if (username === 'admin') {
    username = `<i>${username}</i>`;
  }

  createdAt = moment(createdAt).format(momentFormatTimestamp);
  const html = Mustache.render($scriptTemplateMessage.innerHTML, { createdAt, username, message });
  $divMessages.insertAdjacentHTML('beforeend', html);
  autoscroll();
});

// render video
socket.on('youtube', ({ username, message, createdAt }) => {
  // force everyone to watch a video you sent, autoplay
  console.log(`${username} sent youtube link: ${message}`);
  document.getElementById('ahem').src = message + (/\?start=\d+$/.test(message) ? '&' : '?') + 'autoplay=1';
});

// render location
socket.on('location', ({ username, message, createdAt }) => {
  createdAt = moment(createdAt).format(momentFormatTimestamp);
  const html = Mustache.render($scriptTemplateLocation.innerHTML, { createdAt, username, url: message });
  $divMessages.insertAdjacentHTML('beforeend', html);
  autoscroll();
});

// update user room list
socket.on('roomData', ({ room, users }) => {
  const html = Mustache.render($scriptTemplateSidebarRoom.innerHTML, { room, users });
  $divSidebarRoom.innerHTML = html;
});

// update rooms list
socket.on('worldData', ({ rooms }) => {
  const html = Mustache.render($scriptTemplateSidebarRooms.innerHTML, { rooms });
  $divSidebarRooms.innerHTML = html;
});
