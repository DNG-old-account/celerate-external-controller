if (Meteor.isClient) {
  Template.subscriber_map.rendered = function() {
    map = null;
    markers = {};
    if (!Session.get("subscriber_map")) {
      google.maps.visualRefresh=true;
      var mapOptions = {
        zoom: 12,
        center: new google.maps.LatLng(38.95, -123.65),
        mapTypeId: google.maps.MapTypeId.HYBRID
      };

      map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

      Session.set("subscriber_map", true);
    }

    Deps.autorun(function() {
      console.log("RENDERING MAP");
      for (var m in markers) {
        markers[m].setMap(null);
      }
      markers = {};

      var subscriber_to_color = function (subscriber) {
        if (subscriber.status == "new lead") return "yellow";
        if (subscriber.status == "connected") return "green";
        if (subscriber.status == "no coverage") return "red";
        return "purple";
      };

      Template.subscriber_overview.subscribers().forEach(function (subscriber) {
        if ('lat' in subscriber && 'lng' in subscriber) {
          var name = (subscriber.first_name ? subscriber.first_name : "") + " " + (subscriber.last_name ? subscriber.last_name : "");
          markers[subscriber._id] = new google.maps.Marker({
            position: new google.maps.LatLng(subscriber.lat, subscriber.lng),
            title: name,
            icon: 'http://maps.google.com/mapfiles/ms/icons/' + subscriber_to_color(subscriber) + '-dot.png',
            map: map
          });

          google.maps.event.addListener(markers[subscriber._id], 'click', function() {
            var bubble_body = '<iframe src="/subscriber_details/'+subscriber._id._str+'" width="500px" frameborder="0"> </iframe>';
            (new google.maps.InfoWindow({ content: bubble_body })).open(map, markers[subscriber._id]);
          });
        }
      });
    });
  };

  google.maps.event.addDomListener(window, 'load', Template.subscriber_map.rendered);
}
