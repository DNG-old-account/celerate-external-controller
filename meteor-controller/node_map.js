if (Meteor.isClient) {
  Template.nodeMap.destroyed = function() {
    Session.set("node_map", false);
    map = null;
  };

  Template.nodeMap.rendered = function() {
    map = null;
    markers = {};
    if (!Session.get("node_map")) {
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

      Session.set("node_map", true);
    }

    Deps.autorun(function() {
      if (!Session.equals("selected_node", null)) {
        var m = markers[Session.get("selected_node")];
        if (m != null) {
          if (Session.get("recenter_map")) {
            map.setCenter(m.position);
            map.setZoom(15);
          }

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

      var node_to_color = function (node) {
        var defaultcolor = "_grey";
        var colormap = {
          "core": "_orange",
          "cpe": "_green",
          "base_station": "_purple",
          "ap": "_white",
        };
        var type_to_color = function (type) {
          if (type in colormap) return colormap[type];
          return defaultcolor;
        };

        // If a node is selected, only highlight those nodes that are adjacent to it.
        var selected_node = Session.get("selected_map_node");
        var adjacent_nodes = Session.get("selected_map_node_adjacent_nodes");
        if (selected_node) {
          if (node._id._str === selected_node._str) {
            return type_to_color(node.type);
          }
          if (adjacent_nodes[node._id]) {
            return type_to_color(node.type);
          }

          return defaultcolor;
        }

        // No node is selected, so show normal colors.
        return type_to_color(node.type);
      };

      var bounds = new google.maps.LatLngBounds();

      getNodes().forEach(function (node) {
        try {
        if ('lat' in node && node['lat'].trim().length > 0 && 'lng' in node && node['lng'].trim().length > 0) {
          var name = node.name;
          var latlng = new google.maps.LatLng(node.lat, node.lng);
          bounds.extend(latlng);

          markers[node._id] = new google.maps.Marker({
            position: latlng,
            title: name,
            icon: 'http://maps.google.com/mapfiles/marker' + node_to_color(node) + '.png',
            map: map
          });

          google.maps.event.addListener(markers[node._id], 'click', function() {
            Session.set("selected_map_node", node._id);

            // Find adjacent nodes and store them for later use.
            var outbound_edges = Edges.find({'local_node': node._id});
            var adjacent_nodes = {};
            outbound_edges.forEach(function(edge) {
              adjacent_nodes[edge.remote_node] = true;
            });
            console.log("Adjacent nodes:");
            console.log(adjacent_nodes);
            Session.set("selected_map_node_adjacent_nodes", adjacent_nodes);

            // var bubble_body = '<iframe src="/node_details/'+node._id._str+'" height="400px" width="500px" frameborder="0"> </iframe>';
            // (new google.maps.InfoWindow({ content: bubble_body })).open(map, markers[node._id]);
          });
        }
      } catch (e) { console.log("failed to map node " + JSON.stringify(node)); console.log(e); }
      });

      if (Session.get("recenter_map")) {
        map.fitBounds(bounds);
      }
    });
  };

  if (typeof google === 'object') {
    google.maps.event.addDomListener(window, 'load', Template.nodeMap.rendered);
  }
}

