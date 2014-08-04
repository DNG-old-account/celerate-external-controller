// Celerate dashboard hardware page.

var dblib = require('./dblib');
var uP = require('micropromise');
var url = require('url');

function handleHardware(res, urlquery) {
  // Get the hardware asynchronously.
  var hardware = uP();

  dblib.execQuery('FOR h IN hardware RETURN h', {}, function(err, result) {
    if (err) {
      res.send("Error: " + err);
    } else {
      hardware.fulfill(result);
    }
  });

  hardware.then(function(hardware) {
    console.log(hardware);
    res.render('hardware', { 'title' : 'Hardware', 'hardware' : hardware.result });
  },
  function(err) {
    console.err("Error: ", err);
  });

}

exports.draw = function(req, res) {
  var urlquery = url.parse(req.url, true).query;
  handleHardware(res, urlquery);
};
