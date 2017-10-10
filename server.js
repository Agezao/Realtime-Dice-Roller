// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom

var loggedUsers = [];
var totalRolls = 0;

io.on('connection', function (socket) {
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    loggedUsers.push({name: username});
    addedUser = true;
    socket.emit('login', {
      loggedUsers: loggedUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      loggedUsers: loggedUsers
    });

    if(totalRolls > 0) {
      totalRolls = 0;
      socket.broadcast.emit('game reset', {
        username: socket.username,
        join: true
      });
    }
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (addedUser) {
      loggedUsers = loggedUsers.filter(function(el) {
        return el.name !== socket.username;
      });

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        loggedUsers: loggedUsers
      });

      
      if(totalRolls > 0) {
        totalRolls = 0;
        socket.broadcast.emit('game reset', {
          username: socket.username,
          join: false
        });
      }
    }
  });

  socket.on('roll user', function (username) {
    var roll = Math.floor(Math.random() * 6) + 1;
    totalRolls++;
    var rollData = {
      username: username,
      roll: roll
    };

    socket.emit('user rolled', rollData);
    socket.broadcast.emit('user rolled', rollData);

    if(loggedUsers.length == totalRolls) {
      totalRolls = 0;
      socket.emit('everyone rolled', {});
      socket.broadcast.emit('everyone rolled', {});
    }
  });

});