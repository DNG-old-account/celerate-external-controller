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
    per_port_fields: function () {
      console.log("per_port_fields");
      console.log(this);

      var remote_node_value = "";
      var remote_port_value = "";

      var remote_node_options = Nodes.find({}).map(function(item, index, cursor) {
        return { value: item._id._str, label: item.name };
      });

      var remote_port_options = [];
      if (this.node_instance.ports && this.node_instance.ports[this.context.name]) {
        if (this.node_instance.ports[this.context.name].remote_node) {
          remote_node_value = this.node_instance.ports[this.context.name].remote_node;
          var remote_node = Nodes.findOne(new Meteor.Collection.ObjectID(remote_node_value));
          var remote_node_hardware = Hardware.findOne({name: remote_node.hardware});

          // Only show remote ports of the same type.
          var port_type_to_match = this.context.type;
          var matching_ports = _.filter(remote_node_hardware.ports, function(p) {
            return p.type === port_type_to_match;
          });
          remote_port_options = _.map(matching_ports, function (item) {
            return { value: item.name, label: item.name + " (" + item.type + ")" };
          });
        }

        if (this.node_instance.ports[this.context.name].remote_port) {
          remote_port_value = this.node_instance.ports[this.context.name].remote_port;
        }
      }

      var ip_value = "";
      if (this.node_instance.ports && this.node_instance.ports[this.context.name] && this.node_instance.ports[this.context.name].ip) {
        ip_value = this.node_instance.ports[this.context.name].ip;
      }

      return [ { field: "ports." + this.context.name + ".ip", label: "IP", value: ip_value },
               { field: "ports." + this.context.name + ".remote_node", label: "Remote Node", value: remote_node_value, options: true, options_custom_view: remote_node_options },
               { field: "ports." + this.context.name + ".remote_port", label: "Remote Port", value: remote_port_value, options: true, options_custom_view: remote_port_options },
             ];
    },
    node_fields: function () {
      var type_options = ["client", "cpe", "ap", "base_station", "core", "other"];
      var status_options = ["operational", "failed", "undeployed"];

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
               { field: "mac", label: "MAC", value: this.mac },
               { field: "vendor_uid", label: "Vendor UID", value: this.vendor_uid },
               { field: "lat", label: "Lat", value:this.lat },
               { field: "lng", label: "Lng", value:this.lng },
               { field: "alt", label: "Altitude", value:this.alt },
               { field: "management_ip", label: "Management IP", value:this.management_ip },
               { field: "notes", label: "Notes", value:this.notes },
               // { field: "ports", label: "Ports", value: this.ports, display_ports: true },
             ];
    },
    hardware_data: function () {
      return Hardware.find({name: this.hardware});
    }
  });
}
