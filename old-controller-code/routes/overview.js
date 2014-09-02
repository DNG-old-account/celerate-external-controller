// Celerate dashboard overview page, including deployment map.

var dblib = require('./dblib');
var uP = require('micropromise');
var url = require('url');

function handleMap(res, urlquery) {
  // Get the nodes and the topology, asynchronously.
  var nodes = uP();
  var topology = uP();

  dblib.execQuery('FOR n IN node FILTER n.location.lat != "" RETURN n', {}, function(err, result) {
    if (err) {
      res.send("Error: " + err);
    } else {
      nodes.fulfill(result);
    }
  });

  dblib.execQuery('FOR e IN topology RETURN e', {}, function(err, result) {
    if (err) {
      res.send("Error: " + err);
    } else {
      topology.fulfill(result);
    }
  });

  // Once we get the nodes and topology, generate an object that can be used by
  // map frontend.
  nodes.join([topology]).spread(function(nodes, topology) {
    var nodemap = {};
    for (var n in nodes.result) {
      nodemap[nodes.result[n].nickname] = nodes.result[n];
      console.log("Got node: ", nodes.result[n].nickname);
    }

    var topologymap = {};
    for (var e in topology.result) {
      topologymap[topology.result[e].from + '->' + topology.result[e].to] = topology.result[e];
      console.log("Got edge: ", topology.result[e]);
    }
    res.render('overview', { 'title' : 'Deployment Map', 'nodemap' : nodemap, 'topology' : topologymap });

  },
  function(err) {
    console.err("Error: ", err);
  });

}

exports.draw = function(req, res) {
  var urlquery = url.parse(req.url, true).query;
  handleMap(res, urlquery);
};
