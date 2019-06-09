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

router.get('/google/callback', passport.authenticate('google', loginOptions), (req, res) => {
  // redirect to chat page after successful login
  // set a 1-day cookie w/ profile info
  res.cookie('chat-username', req.user.displayName, { maxAge: 86400000 });
  res.redirect('/chat.html');
});

module.exports = router;
