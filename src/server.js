const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const passport = require('passport');
const path = require('path');
var session = require('express-session');
var MemoryStore = require('memorystore')(session);

const routesAuth = require('./routes/auth');
require('./utils/passport');

// set up server and socketio
const app = express();
const server = http.createServer(app);
const io = socketio(server);
require('./sockets')(io);

// set up session store; 1 day
app.use(session({
  cookie: { maxAge: 86400000 },
  store: new MemoryStore({ checkPeriod: 86400000 }),
  secret: process.env.SESSION_SECRET,
  saveUninitialized: false,
  resave: false
}));

// set up passport
app.use(passport.initialize());
app.use(passport.session());

// mount routes
app.use('/auth', routesAuth);
app.use('/admin', require('./routes/admin')(io));

// mount static files
const pathPublic = path.join(__dirname, '../public');
app.use(express.static(pathPublic));

// mount private files
app.use((req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect('/');
  }
});

app.use(express.static(path.join(__dirname, '../private')));

module.exports = server;
