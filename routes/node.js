// Celerate dashboard node page.

var dblib = require('./dblib');
var uP = require('micropromise');
var url = require('url');

function handleNode(res, urlquery) {
  // Get the nodes asynchronously.
  var corenodes = uP();
  var cpenodes = uP();
  var apnodes = uP();
  var hardware = uP();

  dblib.execQuery('FOR n IN node FILTER n.type == "core" RETURN n', {}, function(err, result) {
    if (err) {
      res.send("Corenodes Error: " + err);
    } else {
      corenodes.fulfill(result);
    }
  });

  dblib.execQuery('FOR n IN node FILTER n.type == "cpe" RETURN n', {}, function(err, result) {
    if (err) {
      res.send("CPEnodes Error: " + err);
    } else {
      cpenodes.fulfill(result);
    }
  });

  dblib.execQuery('FOR n IN node FILTER n.type == "ap" RETURN n', {}, function(err, result) {
    if (err) {
      res.send("APnodes Error: " + err);
    } else {
      apnodes.fulfill(result);
    }
  });

  dblib.execQuery('FOR h IN hardware RETURN h', {}, function(err, result) {
    if (err) {
      res.send("Error: " + err);
    } else {
      hardware.fulfill(result);
    }
  });


  corenodes.join([cpenodes, apnodes, hardware]).spread(function(corenodes, cpenodes, apnodes, hardware) {
    //console.log(corenodes);
    //console.log(cpenodes);
    //console.log(apnodes);
    console.log(hardware);

    res.render('node', { 'title' : 'Nodes', 'corenodes' : corenodes.result, 'cpenodes' : cpenodes.result, 'apnodes' : apnodes.result, 'hardware' : hardware.result });
  },
  function(err) {
    console.err("Error: ", err);
  });

}

exports.draw = function(req, res) {
  var urlquery = url.parse(req.url, true).query;
  handleNode(res, urlquery);
};
