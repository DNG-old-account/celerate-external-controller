// Celerate dashboard subscriber page.

var dblib = require('./dblib');
var uP = require('micropromise');
var url = require('url');

function handleSubscriber(res, urlquery) {
  var subscribers = uP();
  var leads = uP();

  dblib.execQuery('FOR s IN subscriber FILTER s.subscribed != true RETURN s', {}, function(err, result) {
    if (err) {
      res.send("Error: " + err);
    } else {
      leads.fulfill(result);
    }
  });

  dblib.execQuery('FOR s IN subscriber FILTER s.subscribed == true SORT s.username ASC RETURN s', {}, function(err, result) {
    if (err) {
      res.send("Error: " + err);
    } else {
      subscribers.fulfill(result);
    }
  });

  subscribers.join([leads]).spread(function(subscribers, leads) {
    console.log(leads);
    console.log(subscribers);
    res.render('subscriber', { 'title' : 'Subscribers and Leads', 'subscribers' : subscribers.result, 'leads' : leads.result });
  },
  function(err) {
    console.err("Error: ", err);
  });

}

exports.draw = function(req, res) {
  var urlquery = url.parse(req.url, true).query;
  handleSubscriber(res, urlquery);
};
