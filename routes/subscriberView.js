// Celerate dashboard individual subscriber view/edit page.

var dblib = require('./dblib');
var uP = require('micropromise');
var url = require('url');

function handleSubscriberView(res, urlquery) {
  var subscriber = uP();
  // var subscriberNotes = uP();
  var plans = uP();
  var cpenodes = uP();
  var apnodes = uP();

  dblib.db.document.get('subscriber/' + urlquery.key).then(function(result) {
    console.log("subscriber: %j", result);
    subscriber.fulfill(result);
  },
  function(err) {
    console.log("error %j", err);
    subscriber.reject(err);
  });

  // TODO(barath): No subscriber notes for now, but add these back as we move away from outside systems.
  //
  // dblib.execQuery('FOR n IN subscriber_notes FILTER n.subscriber_id == ' + urlquery.key + ' SORT n.date DESC RETURN n', {}, function(err, result) {
  //   if (err) {
  //     res.send("Error: " + err);
  //   } else {
  //     console.log(result);
  //     subscriberNotes.fulfill(result);
  //   }
  // });

  dblib.execQuery('FOR p IN plan RETURN p', {}, function(err, result) {
    if (err) {
      res.send("Error: " + err);
      plans.reject(err);
    } else {
      console.log("Plans %j", result);
      plans.fulfill(result);
    }
  });

  dblib.execQuery('FOR n IN node FILTER n.type == "cpe" RETURN n', {}, function(err, result) {
    if (err) {
      res.send("CPE nodes Error: " + err);
      cpenodes.reject(err);
    } else {
      console.log("CPEnodes %j", result);
      cpenodes.fulfill(result);
    }
  });

  dblib.execQuery('FOR n IN node FILTER n.type == "ap" RETURN n', {}, function(err, result) {
    if (err) {
      res.send("AP nodes Error: " + err);
      apnodes.reject(err);
    } else {
      console.log("APnodes %j", result);
      apnodes.fulfill(result);
    }
  });

  // Once we get the subscriber, subscriber notes, and plans, generate an object that can be used by the frontend.
  subscriber.join([plans, cpenodes, apnodes]).spread(function(subscriber, plans, cpenodes, apnodes) {
    // For time parsing support.
    var moment = require('moment');
    moment().format();

    res.render('subscriberView', { 'title' : 'Subscriber Info', 'subscriber' : subscriber, 'plans' : plans.result, 'cpenodes' : cpenodes.result, 'apnodes' : apnodes.result, 'moment' : moment });
  },
  function(err) {
    console.err("Error: ", err);
  });

}

exports.draw = function(req, res) {
  var urlquery = url.parse(req.url, true).query;
  handleSubscriberView(res, urlquery);
};
