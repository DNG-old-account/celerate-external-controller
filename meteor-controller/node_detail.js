if (Meteor.isClient) {
  // Node details functionality and events.
  Template.nodeDetails.events({
    'click': function (evt) {
      console.log(evt);

      if (evt.target.id == "edit" && !evt.target.classList.contains("text-gray")) {
        // User clicked on pencil icon to begin editing.
        // Toggle the icon visual state.
        evt.target.classList.add("text-gray");
        evt.target.nextElementSibling.classList.remove("text-gray");

        var formelement = evt.target.parentElement.previousElementSibling.firstElementChild;
        formelement.disabled = false;
        
        if (evt.target.parentElement.previousElementSibling.firstElementChild.nodeName === 'SELECT') {
          // Try to remove a select2 that's already been instantiated
          try {
            $('select.site-select').select2('destroy');
          } catch (e) {
          }
          $('select.site-select').select2();
        }
      } else if (evt.target.id == "save" && !evt.target.classList.contains("text-gray")) {
        // User clicked on save icon to save input.
        var formelement = evt.target.parentElement.previousElementSibling.firstElementChild;
        console.log(formelement);
        console.log(this);
 
        db_update = {};
        db_update[formelement.id] = formelement.value;
        Nodes.update(this._id, {$set: db_update});

        formelement.disabled = true;

        // Toggle the icon visual state.
        evt.target.classList.add("text-gray");
        evt.target.previousElementSibling.classList.remove("text-gray");
      } else if (evt.target.id == "edit-edge" && !evt.target.classList.contains("text-gray")) {
        // Special case for editing an edge, since it's a (node,port) pair.
        // Toggle the icon visual state.
        evt.target.classList.add("text-gray");
        evt.target.nextElementSibling.classList.remove("text-gray");

        var formparent = evt.target.parentElement.parentElement;
        var node_selector = formparent.children[1].children[0];
        var port_selector = formparent.children[3].children[0];
        node_selector.disabled = false;
        port_selector.disabled = false;

        // Try to remove a select2 that's already been instantiated
        try {
          $('select#remote_node').select2('destroy');
        } catch (e) {
        }

        $('select#remote_node').select2();

        var edge = this;
        var node = Nodes.findOne(edge.remote_node);
        if (node) {
          Session.set('selectedNodeEdge' + edge._id._str, node);
        }
        $('select#remote_node').on("change", function (e) { 
          var node = Nodes.findOne(new Meteor.Collection.ObjectID($(this).val()));
          Session.set('selectedNodeEdge' + edge._id._str, node);
        });
      } else if (evt.target.id == "save-edge" && !evt.target.classList.contains("text-gray")) {
        // Special case for saving an edge, since it's a (node,port) pair.
        // Toggle the icon visual state.
        evt.target.classList.add("text-gray");
        evt.target.previousElementSibling.classList.remove("text-gray");

        var formparent = evt.target.parentElement.parentElement;
        var node_selector = formparent.children[1].children[0];
        var port_selector = formparent.children[3].children[0];
        node_selector.disabled = true;
        port_selector.disabled = true;

        console.log(this);
        console.log(node_selector.value);
        console.log(port_selector.value);

        // Store the edge.
        Edges.update(this._id, {$set: {"remote_node": new Meteor.Collection.ObjectID(node_selector.value), "remote_port": port_selector.value}});
      } else if (evt.target.id == "add-reverse-edge") {
        var formparent = evt.target.parentElement.parentElement;
        var node_selector = formparent.children[1].children[0];
        var port_selector = formparent.children[3].children[0];

        var node = Nodes.findOne(new Meteor.Collection.ObjectID(node_selector.value));

        // There are a few possible cases:
        // 1. The current edge is underspecified; refuse to make a reverse edge.
        // 2. The current edge is ok, but the reverse exists; refuse.
        // 3. The current edge is ok, but the reverse is different; refuse.
        // 4. The current edge is ok, but the reverse doesn't exist; create it.
        if (!node || (typeof port_selector.value !== 'string') || port_selector.value.length == 0) {
          bootbox.alert("Current forward edge is underspecified -- please fill in a valid node and port first.", function() {});
        } else {
          // Look up reverse edge.
          console.log("Forward edge ok, looking for reverse.");
          var reverse_edge = Edges.findOne({'local_node': this.remote_node, 'local_port': this.remote_port, 'remote_node': this.local_node});

          if (reverse_edge) {
            bootbox.alert("Found a reverse edge already from the remote node and port pointing here.");
          } else {
            // Create a reverse edge.
            var newId = new Meteor.Collection.ObjectID();
            Edges.insert({"_id": newId, "local_node": this.remote_node, "local_port": this.remote_port, "remote_node": this.local_node, "remote_port": this.local_port});
            bootbox.alert("Reverse edge added.");
          }
        }
      } else if (evt.target.id == "delete-edge") {
        var formparent = evt.target.parentElement.parentElement;
        var node_id_str = formparent.children[1].children[0].value;
        var node_name = "";
        var node = Nodes.findOne(new Meteor.Collection.ObjectID(node_id_str));
        if (node) {
          node_name = node.name;
        }

        var port_name = formparent.children[3].children[0].value;

        var id = this._id;
        bootbox.confirm("Are you sure you want to delete the edge to node/port:<br>" + node_name + "/" + port_name, function(first_result) {
          if (first_result) {
            bootbox.confirm("Are you REALLY REALLY sure you want to delete the edge to node/port:<br>" + node_name + "/" + port_name, function(second_result) {
              if (second_result) {
                Edges.remove(id);
              }
            });
          }
        }); 
      }
    },
    'click .get_location_button': function (evt) {
      var id = this._id;

      function setCurrentLocation(location, node_id) {
        if ('latitude' in location.coords && 'longitude' in location.coords) {
          var lat = location.coords.latitude;
          var lng = location.coords.longitude;
          $("#lat").val(lat);
          $("#lng").val(lng);

          db_update = {};
          db_update['lat'] = lat;
          db_update['lng'] = lng;
          Nodes.update(id, {$set: db_update});
        }
      }

      navigator.geolocation.getCurrentPosition(setCurrentLocation);
    },
    'click .delete_node_button': function (evt) {
      var id = this._id;
      bootbox.confirm("Are you sure you want to delete this node?", function(first_result) {
        if (first_result) {
          bootbox.confirm("Are you REALLY REALLY sure you want to delete this node?", function(second_result) {
            if (second_result) {
              window.parent.close_node_modal();
              setTimeout(function(){ Nodes.remove(id); }, 1000);
            }
          });
        }
      }); 
    },
    'click .add_edge_button': function (evt) {
      var newId = new Meteor.Collection.ObjectID();
      Edges.insert({"_id": newId, "local_node": this.node_instance._id, "local_port": this.context.name});
    }
  });

  var get_hardware_options = function () {
    return Hardware.find({}, {sort: {make: 1, model: 1}});
  };

  var get_site_options = function () {
    return Sites.find({}, {sort: {name: 1}});
  };

  Template.nodeDetails.helpers({
    hardware_options: get_hardware_options,
    site_options: get_site_options,
    site_name: function () {
      console.log(this);
      var site_query = Sites.findOne(new Meteor.Collection.ObjectID(this.site));
      console.log(site_query);
      if (site_query) {
        return site_query.name;
      }

      return "";
    },
    ports_from_hardware: function () {
      console.log(this);
      var hardware_query = Hardware.findOne({name: this.hardware});
      if (hardware_query) {
        return hardware_query.ports;
      }

      return [];
    },
    ports_for_node: function() {
      // Returns the ports for the hardware of the current remote node.
      console.log(this);
      var node = Session.get('selectedNodeEdge' + this._id._str);
      if (typeof node === 'undefined') {
        node = Nodes.findOne(this.remote_node);
      }
      if (node) {
        console.log("found remote node: " + node.name + " with hw " + node.hardware);
        var hardware_query = Hardware.findOne({name: node.hardware});
        if (hardware_query) {
          console.log("found hardware: " + JSON.stringify(hardware_query));
          return hardware_query.ports;
        }
      }

      return [];
    },
    per_port_fields: function () {
      console.log("per_port_fields");
      console.log(this);

      // Edges structure contains list of all nodes and a list of edges that
      // already exist.
      var node_options = Nodes.find({}).map(function(item, index, cursor) {
        return { _id: item._id._str, name: item.name, hardware: item.hardware };
      });

      var existing_edges = Edges.find({"local_node": this.node_instance._id, "local_port": this.context.name}).map(function(item, index, cursor) {
        return item;
      });

      var edges = {
        all_nodes: node_options,
        outgoing_edges: existing_edges,
      };

      console.log("Edges structure for " + this.node_instance.name);
      console.log(edges);

      // Other fields, such as the port's IP.
      var ip_value = "";
      if (this.node_instance.ports && this.node_instance.ports[this.context.name] && this.node_instance.ports[this.context.name].ip) {
        ip_value = this.node_instance.ports[this.context.name].ip;
      }

      return [ { field: "ports." + this.context.name + ".ip", label: "IP", value: ip_value },
               { field: "edges", label: "Outgoing Edges", edges: edges, has_edges: true }
             ];
    },
    node_fields: function () {
      var type_options = ["client", "cpe", "ap", "base_station", "core", "other"];
      var status_options = ["operational", "failed", "undeployed"];
      var device_ownership_options = ["provider", "customer"];

      var hardware_options = get_hardware_options().map(function(item, index, cursor) {
        return { value: item.name, label: (item.make + "/" + item.model + " (" + item.name + ")") };
      });

      var site_options = get_site_options().map(function(item, index, cursor) {
        var type_str = "";
        if (item.type != null) {
          type_str = "(" + _.keys(item.type).toString() + ")";
        }
        return { value: item._id._str, label: (item.name + " " + type_str) };
      });

      return [ { field: "name", label: "Name", value: this.name },
               { field: "hardware", label: "Hardware", value: this.hardware, options: true, options_custom_view: hardware_options },
               { field: "type", label: "Type", value: this.type, options: type_options },
               { field: "site", label: "Site", value: this.site, options: true, options_custom_view: site_options },
               { field: "status", label: "Status", value: this.status, options: status_options },
               { field: "device_ownership", label: "Device Ownership", value: this.device_ownership, options: device_ownership_options },
               { field: "mac", label: "MAC", value: this.mac },
               { field: "vendor_uid", label: "Vendor UID", value: this.vendor_uid },
               { field: "lat", label: "Lat", value:this.lat },
               { field: "lng", label: "Lng", value:this.lng },
               { field: "alt", label: "Altitude", value:this.alt },
               { field: "management_ip", label: "Management IP", value:this.management_ip },
               { field: "notes", label: "Notes", value:this.notes },
               { field: "ports", label: "Ports", value: this.ports, display_ports: true },
             ];
    },
    hardware_data: function () {
      return Hardware.find({name: this.hardware});
    }
  });
}
