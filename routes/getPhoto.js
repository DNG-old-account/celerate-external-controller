var dblib = require('./dblib');
var url = require('url');

exports.draw = function(req, res) {
  var urlquery = url.parse(req.url, true).query;
  if (urlquery.photokey) {
    dblib.db.document.get('photo/' + urlquery.photokey).then(function(result) {
      photo = new Buffer(result.data, 'base64');
      res.writeHead(200, { 'Content-Type': 'image/jpeg' });
      res.end(photo);
    },
    function(err) {
      console.log("error %j", err);
      res.status(400).send("Error: " + err);
    });
  } else {
    res.status(404);
  }
};
