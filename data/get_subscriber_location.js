var fs = require('fs');
var request = require('request');
var async = require('async');

var data = fs.readFileSync(process.argv[2]);
var subscribers = JSON.parse(data);

var q = async.queue(function (subscriber, callback) {
  var baseurl = "http://maps.googleapis.com/maps/api/geocode/json?address=";
  baseurl += encodeURIComponent(subscriber.street_address + ", " + subscriber.city + ", California");
  //console.log(baseurl);
  request(baseurl, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var maps_reply = JSON.parse(body);
      if (maps_reply && 'results' in maps_reply) {
        var location_data = maps_reply['results'][0];
        if (!('partial_match' in location_data && location_data['partial_match'])) {
          var lat = location_data['geometry']['location']['lat'];
          var lng = location_data['geometry']['location']['lng'];

          var s = {};
          s["_id"] = subscriber["_id"]["$oid"];
          s.lat = lat.toString();
          s.lng = lng.toString();
          console.log(JSON.stringify(s));
        }
      }
    }
    setTimeout(function(){callback();}, 500);
  });
}, 1);

q.push(subscribers);
