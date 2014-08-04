// Celerate dashboard individual node view/edit page.

var dblib = require('./dblib');
var uP = require('micropromise');
var url = require('url');

function handleNodeView(res, urlquery) {
  // Get the subscriber, subscriber notes, and subscription profiles, asynchronously.
  var node = uP();
  var photos = uP();

  dblib.db.document.get('node/' + urlquery.key).then(function(result) {
    console.log(result);
    node.fulfill(result);
  },
  function(err) {
    console.log("error %j", err);
    node.reject(err);
  });

  dblib.execQuery('FOR p IN photo FILTER p.nodekey == "' + urlquery.key + '" RETURN {"photokey" : p._key, "text" : p.text}', {}, function(err, result) {
    if (err) {
      res.send("Photos Error: " + err);
    } else {
      photos.fulfill(result.result);
    }
  });

  node.join([photos]).spread(function(node, photos) {
    res.render('nodeView', { 'title' : 'Node Info', 'node' : node, 'photos' : photos });
  },
  function(err) {
    console.err("Error: ", err);
  });
}

exports.draw = function(req, res) {
  var urlquery = url.parse(req.url, true).query;
  handleNodeView(res, urlquery);
};
