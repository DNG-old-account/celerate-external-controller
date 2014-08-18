var express = require('express');
var https = require('https');
var fs = require('fs');
var path = require('path');
var util = require('util');

var app = express();

// CORS middleware.
var allowCrossDomain = function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');

  next();
}

// All environments.
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.multipart());
app.use(allowCrossDomain);
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// Development only.
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// TODO(barath): Move the below socket.io code to a separate file.
// Real-time data exchange, to nodes and web clients.
//
// var socketapp = require('http').createServer(function (req, res) {
//   res.writeHead(200);
//   res.end("");
// });
// var io = require('socket.io').listen(socketapp)
// socketapp.listen(1234);
//
// var nodes = {}
// var socketToNickname = {}
// 
// io.sockets.on('connection', function (socket) {
//   socket.on('node_register', function (data) {
//     if ('node_nickname' in data) {
//       socketToNickname[socket.id] = data['node_nickname'];
// 
//       // Clean up old state and timers if we've seen this client before.
//       if (data['node_nickname'] in nodes) {
//         if ('timer' in nodes[data['node_nickname']]) {
//           console.log('Seen ' + data['node_nickname'] + ' before, clearing timer.');
//           clearTimeout(nodes[data['node_nickname']]['timer']);
//         }
//       }
// 
//       nodes[data['node_nickname']] = { 'nickname' : data['node_nickname'] };
//       console.log(data['node_nickname'] + ' connected on socket ' + socket.id);
//     }
//   });
// 
//   socket.on('stats', function (data) {
//     console.log(data);
//   });
// 
//   socket.on('disconnect', function () {
//     console.log('client disconnected on socket ' + socket.id);
//     var nickname = socketToNickname[socket.id];
//     delete socketToNickname[socket.id];
//     nodes[nickname]['timer'] = setTimeout(function() { sendText("5106042390", "Potential outage") }, 10000);
//   });
// });

// Sends the given text message to the given recipient via Twilio.
function sendText(recipient, messageText) {
  // Twilio Credentials.
  var accountSid = 'ACdc0b3340bc308374e8c0aef799f52ca2'; 
  var authToken = '4b2d3ababa297567d5b5f59e09cc8838'; 

  var client = require('twilio')(accountSid, authToken); 
  client.messages.create({ 
    to: recipient, 
    from: "+15109077290", 
    body: messageText
  }, function(err, message) { 
    if (err) {
      console.log('Error sending text: ' + err);
    } else {
      console.log(message.sid);
    }
  });
}

// Require and connect routes.
var routes = require('./routes');
var overviewRoute = require('./routes/overview');
app.get('/', routes.index);
app.get('/overview', overviewRoute.draw);

var subscriberRoute = require('./routes/subscriber');
var subscriberViewRoute = require('./routes/subscriberView');
var subscriberNewLead = require('./routes/subscriberNewLead');
var subscriberNewUser = require('./routes/subscriberNewUser');
var subscriberUpdateInfo = require('./routes/subscriberUpdateInfo');
app.get('/subscriber', subscriberRoute.draw);
app.get('/subscriber/view', subscriberViewRoute.draw);
app.post('/subscriber/newlead', subscriberNewLead.handle);
app.post('/subscriber/newuser', subscriberNewUser.handle);
app.post('/subscriber/update', subscriberUpdateInfo.handle);

var nodeRoute = require('./routes/node');
var nodeNewRoute = require('./routes/nodeNew');
var nodeViewRoute = require('./routes/nodeView');
var nodeUpdateInfo = require('./routes/nodeUpdateInfo');
app.get('/node', nodeRoute.draw);
app.post('/node/newnode', nodeNewRoute.handle);
app.get('/node/view', nodeViewRoute.draw);
app.post('/node/update', nodeUpdateInfo.handle);

var hardwareRoute = require('./routes/hardware');
var hardwareViewRoute = require('./routes/hardwareView');
var hardwareUpdateInfo = require('./routes/hardwareUpdateInfo');
app.get('/hardware', hardwareRoute.draw);
app.get('/hardware/view', hardwareViewRoute.draw);
app.post('/hardware/update', hardwareUpdateInfo.handle);

var dbdumpRoute = require('./routes/dbdump');
app.get('/dbdump', dbdumpRoute.draw);

var uploadNodePhotoRoute = require('./routes/uploadNodePhoto');
app.post('/upload/nodePhoto', uploadNodePhotoRoute.handle);

var getPhotoRoute = require('./routes/getPhoto');
app.get('/photo', getPhotoRoute.draw);

// Start the server.
var options = {
  key : fs.readFileSync('keys/celerate-web-key.pem'),
  cert : fs.readFileSync('keys/celerate-web-cert.pem')
};
https.createServer(app).listen(app.get('port'), function() {
  console.log('Celerate server listening on port ' + app.get('port'));
});
