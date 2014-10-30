if (Meteor.isClient) {
  Template.subscriber_map.destroyed = function() {
    Session.set("subscriber_map", false);
    map = null;
  };

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

      google.maps.event.addListener(map, "rightclick", function(event) {
          var lat = event.latLng.lat();
          var lng = event.latLng.lng();
          // populate yor box/field with lat, lng
          $('.lat-lng-info').text('Lat=' + lat + ', Lng=' + lng);
      });

      Session.set("subscriber_map", true);
    }

    Deps.autorun(function() {
      if (!Session.equals("selected_subscriber", null)) {
        var m = markers[Session.get("selected_subscriber")];
        if (m != null) {
          map.setCenter(m.position);
          map.setZoom(15);
          m.setAnimation(google.maps.Animation.BOUNCE);
          setTimeout(function(){ m.setAnimation(null); }, 1400);
        }
      }
    });

    Deps.autorun(function() {
      console.log("Rendering map...");
      for (var m in markers) {
        markers[m].setMap(null);
      }
      markers = {};

      var subscriber_to_color = function (subscriber) {
        if (subscriber.archived == "true") return "_black";
        if (subscriber.status == "new lead") return "_yellow";
        if (subscriber.status == "connected") return "_green";
        if (subscriber.status == "no coverage") return ""; // red is default marker color
        return "_purple";
      };

      var bounds = new google.maps.LatLngBounds();

      Template.subscriber_overview.subscribers().forEach(function (subscriber) {
        try {
        if ('lat' in subscriber && subscriber['lat'].trim().length > 0 && 'lng' in subscriber && subscriber['lng'].trim().length > 0) {
          var name = (subscriber.first_name ? subscriber.first_name : "") + " " + (subscriber.last_name ? subscriber.last_name : "");
          var latlng = new google.maps.LatLng(subscriber.lat, subscriber.lng);
          bounds.extend(latlng);

          markers[subscriber._id] = new google.maps.Marker({
            position: latlng,
            title: name,
            icon: 'http://maps.google.com/mapfiles/marker' + subscriber_to_color(subscriber) + '.png',
            map: map
          });

          google.maps.event.addListener(markers[subscriber._id], 'click', function() {
            var bubble_body = '<iframe src="/subscriber_details/'+subscriber._id._str+'" height="400px" width="500px" frameborder="0"> </iframe>';
            (new google.maps.InfoWindow({ content: bubble_body })).open(map, markers[subscriber._id]);
          });
        }
      } catch (e) { console.log("failed to map subscriber " + JSON.stringify(subscriber)); console.log(e); }
      });

      map.fitBounds(bounds);
    });
  };

  google.maps.event.addDomListener(window, 'load', Template.subscriber_map.rendered);
}
