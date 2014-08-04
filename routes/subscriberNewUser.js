var dblib = require('./dblib');
var uP = require('micropromise');
var url = require('url');

// Add a new user based upon the given request.
function handleNewUser(req, res) {
  // Change the subscribed string to a boolean if needed.
  if (req.body.subscribed == "false") {
    req.body.subscribed = false;
  } else if (req.body.subscribed == "true") {
    req.body.subscribed = true;
  }
   
  console.log("got new user POST " + JSON.stringify(req.body));
  
  dblib.db.document.create('subscriber', req.body).then(function(result) {
    console.log(req.body);
    res.send(req.body);
  },
  function(err) {
    res.send("Error: " + err);
  });
}

exports.handle = function(req, res) {
  handleNewUser(req, res);
};
