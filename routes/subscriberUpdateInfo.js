var dblib = require('./dblib');
var uP = require('micropromise');
var url = require('url');

function handleUpdateInfo(req, res) {
  console.log(req.body);

  // We have to have been given an _id.
  if (!('_id' in req.body)) {
    console.log('/subscriber/update/ requires an _id.');
    res.send(-1);
    return;
  }

  // Change the subscribed string to a boolean if needed.
  console.log('got req.body = %j', req.body);
  if (req.body.subscribed == "false") {
    req.body.subscribed = false;
  } else if (req.body.subscribed == "true") {
    req.body.subscribed = true;
  }

  dblib.db.document.patch(req.body['_id'], req.body, {}, function(err, result) {
    if (err) {
      console.log(err);
    } else {
      console.log(result);
      res.send({ 'result' : 'ok' });
    }
  },
  function(err) {
    res.send("Error: " + err);
  });
}

exports.handle = function(req, res) {
  handleUpdateInfo(req, res);
};
