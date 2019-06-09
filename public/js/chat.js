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
const $divSidebar = document.querySelector('.chat__sidebar');

$textMessage.focus();

// mustache templates
const $scriptTemplateMessage = document.querySelector('#message-template');
const $scriptTemplateLocation = document.querySelector('#location-template');
const $scriptTemplateSidebar = document.querySelector('#sidebar-template');

// retrieve the passport cookie
const getCookieValue = (a) => {
  const b = document.cookie.match('(^|[^;]+)\\s*' + a + '\\s*=\\s*([^;]+)');
  return b ? b.pop() : 'ahem';
};

// retrieve username and room from cookies
const username = decodeURIComponent(getCookieValue('chat-username'));
const room = decodeURIComponent(getCookieValue('chat-room'));

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
      const user = $textMessage.value.trim().replace(/^\/kick (.+)/, '$1');

      socket.emit('kick', { username: user, room }, (err, data) => {
        if (err) {
          window.alert(err.message);
        }
      });
    } else {
      socket.emit('message', $textMessage.value, (err, data) => {
        if (err) {
          window.alert(err.message);
          window.location.href = '/auth/logout';
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
        window.location.href = '/auth/logout';
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

// join room
socket.emit('join', { room, username }, (err, user) => {
  if (err) {
    window.alert(err.message);
    window.location.href = '/auth/logout';
  }
});

// update user room list
socket.on('roomData', ({ room, users }) => {
  const html = Mustache.render($scriptTemplateSidebar.innerHTML, { room, users });
  $divSidebar.innerHTML = html;
});
