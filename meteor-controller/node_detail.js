if (Meteor.isClient) {
  // Node details functionality and events.
  Template.node_details.events({
    'dblclick': function (evt) {
      console.log(evt);

      // Handle events that are directed to fake input fields that we use while disabled, that are replaced by select dropdowns when enabled.
      if (evt.target.parentNode.id == ("fake_selector_"+evt.target.id)) {
        $("#real_selector_"+evt.target.id).removeClass("hidden");
        $("#fake_selector_"+evt.target.id).addClass("hidden");
        return;
      }

      // Handle normal input boxes.
      if (evt.target.disabled) {
        evt.target.disabled = false;
      } else {
        db_update = {};
        db_update[evt.target.id] = evt.target.value;
        Nodes.update(this._id, {$set: db_update}); 
        evt.target.disabled = true;
      }
    },
    'change select': function (evt) {
      console.log(evt);

      // Handle events for drop-down select boxes.
      db_update = {};
      db_update[evt.target.id] = evt.target.value;
      Nodes.update(this._id, {$set: db_update}); 

      $("#real_selector_"+evt.target.id).addClass("hidden");
      $("#fake_selector_"+evt.target.id).removeClass("hidden");
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
  });

  Template.node_details.hardware_options = function () {
    return Hardware.find({});
  };

  Template.node_details.type_options = function () {
    return ["client", "cpe", "ap", "base_station", "core", "other"];
  };

  Template.node_details.status_options = function () {
    return ["operational", "failed", "undeployed"];
  };

  Template.node_details.site_options = function () {
    return Sites.find({});
  };

  Template.node_details.site_name = function() {
    console.log(this);
    var site_query = Sites.findOne(new Meteor.Collection.ObjectID(this.site));
    console.log(site_query);
    if (site_query) { return site_query.name; }
    return "";
  };

}

