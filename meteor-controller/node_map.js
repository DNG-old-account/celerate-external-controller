if (Meteor.isClient) {
  Template.nodeMap.destroyed = function() {
    Session.set("node_map", false);
    map = null;
  };

  Template.nodeMap.rendered = function() {
    map = null;
    markers = {};
    links = {};
    linkinfo = {};
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
        var defaultcolor = ""; // red
        var ignorecolor = "_grey";
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

          return ignorecolor;
        }

        // No node is selected, so show normal colors.
        return type_to_color(node.type);
      };

      var bounds = new google.maps.LatLngBounds();

      // Add a listener to unset the selected node when you click someplace on the map.
      google.maps.event.addListener(map, 'click', function() {
        Session.set("selected_map_node", null);
        Session.set("selected_map_node_adjacent_nodes", null);
      });

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

            var bubble_body = '<div>';
            if (typeof node.management_ip === 'string' && node.management_ip.trim().length > 0) {
              bubble_body += '<a target="_blank" href="http://' + node.management_ip + '">' + node.name + '</a>';
            } else {
              bubble_body += node.name;
            }
            bubble_body += (typeof node.hardware === 'string' && node.hardware.trim().length > 0) ? '<br>' + node.hardware : '';
            bubble_body += (typeof node.mac === 'string' && node.mac.trim().length > 0) ? '<br>' + node.mac : '';
            bubble_body += '</div>';
            (new google.maps.InfoWindow({ content: bubble_body })).open(map, markers[node._id]);
          });
        }
      } catch (e) { console.log("failed to map node " + JSON.stringify(node)); console.log(e); }
      });

      if (Session.get("recenter_map")) {
        map.fitBounds(bounds);
      }
      try {
        var selectedMarker = markers[Session.get('selected_map_node')];
        new google.maps.event.trigger(selectedMarker, 'click');
      } catch (e) {
        console.log(e);
      }

      if (Session.get("show_all_links")) {
        // Returns a point fraction of the distance from the from LatLng towards the to
        // LatLng.
        function interpolate(from, to, fraction) {
          var lat = (from.lat() * (1.0 - fraction)) + (to.lat() * fraction);
          var lng = (from.lng() * (1.0 - fraction)) + (to.lng() * fraction);
          return new google.maps.LatLng(lat, lng);
        }

        Edges.find({}).forEach(function(edge) {
          if (!markers[edge.local_node] || !markers[edge.remote_node]) {
            return;
          }

          var edgeColor = '#BBDEFB';
          if (edge.local_node._str < edge.remote_node._str) {
            edgeColor = '#1565C0';
          }
          links[edge._id] = new google.maps.Polyline({
            path : [ markers[edge.local_node].position,
                     interpolate(markers[edge.local_node].position,
                                 markers[edge.remote_node].position, 0.5) ],
            strokeColor: edgeColor,
            strokeOpacity: 1.0,
            strokeWeight : 3,
            map : map
          });

          var local_node_name = Nodes.findOne(edge.local_node).name;
          var remote_node_name = Nodes.findOne(edge.remote_node).name;
          var infoText = "<h5>"+local_node_name+"->"+remote_node_name+"</h5>";

          // Create an info box, and add listeners to show and hide it when the user
          // hovers over the associated edge polyline.
          linkinfo[edge._id] = new google.maps.InfoWindow({ content : infoText });

          var linkTimeout = {};
          google.maps.event.addListener(links[edge._id], 'mouseover', function() {
            linkinfo[edge._id].setPosition(interpolate(
                markers[edge.local_node].position,
                markers[edge.remote_node].position,
                0.25
                ));
            if (linkTimeout[edge._id]) {
              clearTimeout(linkTimeout[edge._id]);
              delete linkTimeout[edge._id];
            }
            linkinfo[edge._id].open(map);
          });

          google.maps.event.addListener(links[edge._id], 'mouseout', function() {
            linkTimeout[edge._id] = setTimeout(function() {
              linkinfo[edge._id].close(map)
            }, 1000);
          });
        });
      }
    });
  };

  if (typeof google === 'object') {
    google.maps.event.addDomListener(window, 'load', Template.nodeMap.rendered);
  }
}

