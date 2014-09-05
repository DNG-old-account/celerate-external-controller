if (Meteor.isClient) {
  // site details functionality and events.
  Template.site_details.events({
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
        Sites.update(this._id, {$set: db_update}); 
        evt.target.disabled = true;
      }
    },
    'click .new_type_dropdown_button': function (evt) {
      var dropdown_value = $("#new_type_dropdown").val();
      console.log(dropdown_value);

      if (dropdown_value == null || dropdown_value == "") return;

      var new_types = this.type ? this.type : {};
      new_types[dropdown_value] = "";

      Sites.update(this._id, {$set: {"type" : new_types}});
    },
    'click' : function(evt) {
      if (evt.target.id == "delete_tag") {
        // Handle deletion of a tag.
        var tag_name = evt.target.parentNode.id;
        console.log(tag_name);
        console.log(this);

        var new_types = this.type;
        delete new_types[tag_name];

        Sites.update(this._id, {$set: {"type" : new_types}});
      }
    },
    'change select': function (evt) {
      console.log(evt);

      // Ignore events on the new type dropdown, because that's an explicit click.
      if (evt.target.id == "new_type_dropdown") return;

      // Handle events for drop-down select boxes.
      db_update = {};
      db_update[evt.target.id] = evt.target.value;
      Sites.update(this._id, {$set: db_update}); 

      $("#real_selector_"+evt.target.id).addClass("hidden");
      $("#fake_selector_"+evt.target.id).removeClass("hidden");
    },
    'click .get_location_button': function (evt) {
      var id = this._id;

      function setCurrentLocation(location, site_id) {
        if ('latitude' in location.coords && 'longitude' in location.coords) {
          var lat = location.coords.latitude;
          var lng = location.coords.longitude;
          $("#lat").val(lat);
          $("#lng").val(lng);

          db_update = {};
          db_update['lat'] = lat;
          db_update['lng'] = lng;
          Sites.update(id, {$set: db_update});
        }
      }

      navigator.geolocation.getCurrentPosition(setCurrentLocation);
    },
  });

  Template.site_details.nodes_in_site = function () {
    return Nodes.find({'site': this._id._str});
  };

  Handlebars.registerHelper('site_type_deletable', function (key) {
    return (key in {'relay': '', 'core': '', 'storage': ''});
  });

  Handlebars.registerHelper('new_type_options', function (site_obj) {
    var standard_types = ["relay", "core"];

    var existing_types = site_obj.type ? site_obj.type : {};

    // Only allow adding "storage" to a site that has no type tags.
    if (_.isEmpty(existing_types)) {
      standard_types.push("storage");
      return standard_types;
    }

    return _.filter(standard_types, function(t) { return !(t in existing_types); });
  });

  Handlebars.registerHelper('site_detail_subscriber_address', function(subscriber_id) {
    subscriber = Subscribers.findOne(subscriber_id);
    return subscriber.street_address;
  });

  Handlebars.registerHelper('site_detail_city', function(subscriber_id) {
    subscriber = Subscribers.findOne(subscriber_id);
    return subscriber.city;
  });

}
