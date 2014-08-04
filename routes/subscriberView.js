// Celerate dashboard individual subscriber view/edit page.

var dblib = require('./dblib');
var uP = require('micropromise');
var url = require('url');

function handleSubscriberView(res, urlquery) {
  // Get the subscriber, subscriber notes, and subscription profiles, asynchronously.
  var subscriber = uP();
  var subscriberNotes;
  var profiles = uP();
  var cpenodes = uP();
  var apnodes = uP();

  dblib.db.document.get('subscriber/' + urlquery.key).then(function(result) {
    console.log(result);
    subscriber.fulfill(result);
  },
  function(err) {
    console.log("error %j", err);
    subscriber.reject(err);
  });

  /* No subscriber notes for now.
  dblib.execQuery('FOR n IN subscriber_notes FILTER n.subscriber_id == ' + urlquery.key + ' SORT n.date DESC RETURN n', {}, function(err, result) {
    if (err) {
      res.send("Error: " + err);
    } else {
      console.log(result);
      subscriberNotes.fulfill(result);
    }
  });
  */

  dblib.execQuery('FOR p IN profile RETURN p', {}, function(err, result) {
    if (err) {
      res.send("Error: " + err);
    } else {
      console.log(result);
      profiles.fulfill(result);
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

  // Once we get the subscriber, subscriber notes, and profiles, generate an object that can be used by the frontend.
  subscriber.join([profiles, cpenodes, apnodes]).spread(function(subscriber, profiles, cpenodes, apnodes) {
    // For time parsing support.
    var moment = require('moment');
    moment().format();

    res.render('subscriberView', { 'title' : 'Subscriber Info', 'subscriber' : subscriber, 'profiles' : profiles.result, 'cpenodes' : cpenodes.result, 'apnodes' : apnodes.result, 'moment' : moment });
  },
  function(err) {
    console.err("Error: ", err);
  });

}

exports.draw = function(req, res) {
  var urlquery = url.parse(req.url, true).query;
  handleSubscriberView(res, urlquery);
};
