var dblib = require('./dblib');
var uP = require('micropromise');
var url = require('url');
var fs = require('fs');

// Store an uploaded photo encoded in Base64.
function handleUpload(req, res) {
  console.log("Got new upload POST " + JSON.stringify(req.body));
  console.log("Got new upload POST headers" + JSON.stringify(req.headers));
  console.log("Got new upload POST file data: " + JSON.stringify(req.files));

  if (!('nodekey' in req.headers) || !('file' in req.files)) {
    res.status(400).send("Error: nodekey or file not found");
    return;
  }

  nodekey = req.headers.nodekey;
  fs.readFile(req.files.file.path, function (err, data) {
    if (err) {
      res.status(400).send("Error: couldn't read file");
      return;
    }

    var base64data = new Buffer(data).toString('base64');

    newNodePhoto = {
      'nodekey' : nodekey,
      'data' : base64data,
      'text' : ('phototext' in req.body) ? req.body['phototext'] : ""
    };
    dblib.db.document.create('photo', newNodePhoto).then(function(result) {
      console.log("Added new photo from web to DB: " + JSON.stringify(newNodePhoto));
      res.send('Server upload success.');
    }, function(err) {
      console.log("Error: " + err);
      res.status(400).send("Error: " + err);
    });
  });
}

exports.handle = function(req, res) {
  handleUpload(req, res);
};
