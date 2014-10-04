if (Meteor.isClient) {
  // Node details functionality and events.
  Template.node_details.events({
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

  Template.node_details.hardware_options = function () {
    return Hardware.find({}, {sort: {make: 1, model: 1}});
  };

  Template.node_details.site_options = function () {
    return Sites.find({}, {sort: {name: 1}});
  };

  Template.node_details.site_name = function() {
    console.log(this);
    var site_query = Sites.findOne(new Meteor.Collection.ObjectID(this.site));
    console.log(site_query);
    if (site_query) { return site_query.name; }
    return "";
  };

  Template.node_details.node_fields = function () {
    var type_options = ["client", "cpe", "ap", "base_station", "core", "other"];
    var status_options = ["operational", "failed", "undeployed"];

    var hardware_options = Template.node_details.hardware_options().map(function(item, index, cursor) { return { value: item.name, label: (item.make + "/" + item.model) }; });

    var site_options = Template.node_details.site_options().map(function(item, index, cursor) { return { value: item._id._str, label: item.name }; });

    return [ { field: "name", label: "Name", value: this.name },
             { field: "hardware", label: "Hardware", value: this.hardware, options: true, options_custom_view: hardware_options },
             { field: "type", label: "Type", value: this.type, options: type_options },
             { field: "status", label: "Status", value: this.status, options: status_options },
             { field: "site", label: "Site", value: this.site, options: true, options_custom_view: site_options }
           ];
  };

  Template.node_details.hardware_data = function () {
    return Hardware.find({name: this.hardware});
  };

}
