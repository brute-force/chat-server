const router = require('express').Router();
const passport = require('passport');

router.get('/logout', function (req, res) {
  if (req.user && req.user.user_id) {
    res.clearCookie('chat-username');
    res.clearCookie('chat-room');
  }

  req.logout();
  res.redirect('/');
});

const loginOptions = {
  // successRedirect: '/chat.html',
  failureRedirect: '/',
  failureFlash: true,
  scope: ['openid', 'email', 'profile'],
  // always ask for google login
  prompt: 'consent'
};

router.get('/login', (req, res, next) => {
  // pass on the chat room name
  loginOptions.state = JSON.stringify(req.query);
  passport.authenticate('google', loginOptions)(req, res, next);
});

router.get('/google/callback', passport.authenticate('google', loginOptions), (req, res) => {
  // pick up the chat room name
  const room = JSON.parse(req.query.state).room;
  req.session.room = room;

  // redirect to chat page after successful login
  // set a 1-day cookie w/ profile and room info
  res.redirect('/chat.html');
});

module.exports = router;
