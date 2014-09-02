var dblib = require('./dblib');
var uP = require('micropromise');
var url = require('url');

// Adds a new node based upon the given request.
function handleNewNode(req, res) {
  console.log("Got new node POST " + JSON.stringify(req.body));
  
  dblib.db.document.create('node', req.body).then(function(result) {
    console.log(req.body);
    res.send(req.body);
  },
  function(err) {
    res.send("Error: " + err);
  });
}

exports.handle = function(req, res) {
  handleNewNode(req, res);
};
