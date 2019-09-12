const router = require('express').Router();
const passport = require('passport');

router.get('/logout', function (req, res) {
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
  // pick up the chat room name and set default if none
  const room = JSON.parse(req.query.state).room;
  req.session.room = room || 'ahem';

  // redirect to chat page after successful login
  // set a 1-day cookie w/ profile and room info
  let redirectPath = '/chat.html';

  if (req.session.originalUrl) {
    redirectPath = req.session.originalUrl;
    delete req.session.originalUrl;
  }

  res.redirect(redirectPath);
});

module.exports = router;
