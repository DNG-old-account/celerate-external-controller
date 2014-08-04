var async = require('async');
var arango = require('arango');
var uP = require('micropromise');
var db = arango.Connection("http://localhost:8529/");

exports.db = db;

exports.execQuery = function(queryStr, queryParams, resultCallback) {
  db.query.string = queryStr;
  db.query.exec(queryParams, resultCallback);
};

// Given a DB collection to dump.  Calls the given resultCallback(err, result)
// upon completion, with err non-null upon error.
exports.dumpCollection = function(collectionName, resultCallback) {
  // Create a promise that will be filled in with a dump of all the docs
  // requested.
  var docdump = uP();

  // Query for all documents in the given collection, given by the dump arg in
  // the URL.
  db.query.string = "FOR d IN @@collection RETURN d._id";
  db.query.exec({'@collection' : collectionName}, function(err, doclist) {
    if (err) {
      console.log("query err:", err);
      resultCallback(err, null);
    } else {
      async.map(doclist.result, function(d, callback) {
        // Create a promise for the dbreply.
        var pendingReply = uP();

        // For each reply we get, fulfill the pending reply var.
        db.document.get(d).then(function(doc) {
          pendingReply.fulfill(doc);
        },
        function(err) {
          console.log("error %j", err);
          pendingReply.reject(err);
        });

        // Block for the pending database reply.
        pendingReply.then(function(v) {
          callback(null, v);
        },
        function(err) {
          console.log("error:", err);
          callback(err, null);
        });
      },
      function(err, results) {
        if (err) {
          console.log("map failed:", map);
        } else {
          docdump.fulfill(results);
        }
      });
    }
  });

  docdump.then(function(v) {
    resultCallback(null, v);
  },
  function(err) {
    console.log("Failed to get the doc dump for collection", collectionName);
    resultCallback("unknown failure", null);
  });
};
