var dblib = require('./dblib');
var url = require('url');

exports.draw = function(req, res) {
  var urlquery = url.parse(req.url, true).query;
  if (urlquery.collection) {
    var r = dblib.dumpCollection(urlquery.collection, function(err, result) {
      if (err) {
        console.log("dblib.dumpCollection error:", err);
        res.send("Error querying collection " + urlquery.collection);
      } else {
        res.send(result);
      }
    });
  } else {
    res.send("Need to specify a collection.");
  }
};
