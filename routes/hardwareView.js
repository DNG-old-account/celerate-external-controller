// Celerate dashboard hardware view/edit page.

var dblib = require('./dblib');
var uP = require('micropromise');
var url = require('url');

function handleHardwareView(res, urlquery) {
  var hardware = uP();

  dblib.db.document.get('hardware/' + urlquery.key).then(function(result) {
    console.log(result);
    hardware.fulfill(result);
  },
  function(err) {
    console.log("error %j", err);
    hardware.reject(err);
  });

  hardware.then(function(hardware) {
    res.render('hardwareView', { 'title' : 'Hardware Info', 'hardware' : hardware });
  },
  function(err) {
    console.err("Error: ", err);
  });
}

exports.draw = function(req, res) {
  var urlquery = url.parse(req.url, true).query;
  handleHardwareView(res, urlquery);
};
