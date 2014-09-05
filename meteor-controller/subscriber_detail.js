if (Meteor.isClient) {
  // Subscriber details functionality and events.
  Template.subscriber_details.events({
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
        Subscribers.update(this._id, {$set: db_update}); 
        evt.target.disabled = true;
      }
    },
    'change select': function (evt) {
      console.log(evt);

      // Handle events for drop-down select boxes.
      db_update = {};
      db_update[evt.target.id] = evt.target.value;
      Subscribers.update(this._id, {$set: db_update}); 

      // Handle special cases, such as marking a subscriber as connected.
      if (evt.target.id == "status" && evt.target.value == "connected") {
        var subscriber_id = this._id._str;
        var existing_site = Sites.findOne(function() { return this.type && this.type.subscriber && this.type.subscriber == subscriber_id; });
        console.log(existing_site);
        if (!existing_site) {
          Sites.insert({'_id': new Meteor.Collection.ObjectID(),
                        'name': (this.first_name + " " + this.last_name),
                        'type': {'subscriber': this._id}});
          window.alert("Adding site for newly connected subscriber.");
        }
      }

      $("#real_selector_"+evt.target.id).addClass("hidden");
      $("#fake_selector_"+evt.target.id).removeClass("hidden");
    },
    'click .get_location_button': function (evt) {
      var id = this._id;

      function setCurrentLocation(location) {
        if ('latitude' in location.coords && 'longitude' in location.coords) {
          lat = location.coords.latitude;
          lng = location.coords.longitude;
          $("#lat").val(lat);
          $("#lng").val(lng);

          db_update = {};
          db_update['lat'] = lat;
          db_update['lng'] = lng;
          Subscribers.update(id, {$set: db_update});
        }
      }

      navigator.geolocation.getCurrentPosition(setCurrentLocation);
    },
    'click .user_google_account_setup_button': function (evt) {
      window.open("https://admin.google.com/AdminHome?fral=1#UserList:org=45257bl2kp4lkp");
    },
    'click .user_billing_setup_button': function (evt) {

    }
  });

  Template.subscriber_details.priority_options = function () {
    return ["high", "medium", "low", "none", "unknown"];
  };

  Template.subscriber_details.provider_options = function () {
    return ["further reach", "cvc", "ukiah wireless", "mcn", "satellite", "none", "unknown"];
  };

  Template.subscriber_details.plan_options = function () {
    return ["beta-free", "free-nonprofit", "essential", "standard", "ultra"];
  };

  Template.subscriber_details.status_options = function () {
    return ["connected", "new lead", "no coverage"];
  };

  Template.subscriber_details.cpe_options = function () {
    return Nodes.find({ type: 'cpe' });
  };

  Template.subscriber_details.ap_options = function () {
    return Nodes.find({ type: 'ap' });
  };
}
