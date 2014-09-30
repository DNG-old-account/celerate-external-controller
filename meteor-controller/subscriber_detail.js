if (Meteor.isClient) {
  // Subscriber details functionality and events.
  Template.subscriber_details.events({
    'click': function (evt) {
      console.log(evt);

      if (evt.target.id == "edit" && !evt.target.classList.contains("text-gray")) {
        // User clicked on pencil icon to begin editing.
        // Toggle the icon visual state.
        evt.target.classList.add("text-gray");
        evt.target.nextElementSibling.classList.remove("text-gray");

        var formelement = evt.target.parentElement.previousElementSibling.firstChild;
        formelement.disabled = false;
      } else if (evt.target.id == "save" && !evt.target.classList.contains("text-gray")) {
        // User clicked on save icon to save input.
        var formelement = evt.target.parentElement.previousElementSibling.firstChild;
        console.log(formelement);
        console.log(this);

        db_update = {};
        db_update[formelement.id] = formelement.value;
        Subscribers.update(this._id, {$set: db_update}); 
        formelement.disabled = true;

        // Handle special cases, such as marking a subscriber as connected.
        if (formelement.id == "status" && formelement.value == "connected") {
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

        // Toggle the icon visual state.
        evt.target.classList.add("text-gray");
        evt.target.previousElementSibling.classList.remove("text-gray");
      }
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

  Template.subscriber_details.cpe_options = function () {
    return Nodes.find({ type: 'cpe' });
  };

  Template.subscriber_details.terms_info = function () {
    return hasAgreedToTerms = (this.agreed_to_terms) ? "Yes" : "No";
  };

  Template.subscriber_details.ap_options = function () {
    return Nodes.find({ type: 'ap' });
  };

  Template.subscriber_details.basic_info_fields = function () {
    var priority_options = ["high", "medium", "low", "none", "unknown"];
    var status_options = ["connected", "new lead", "no coverage"];
    var provider_options = ["further reach", "cvc", "ukiah wireless", "mcn", "satellite", "none", "unknown"];
    var plan_options = ["beta-free", "nonprofit-free", "relay-free", "landuse-free", "limited", "essential", "performance", "ultra"];

    return [ { field: "first_name", label: "First Name", value: this.first_name },
             { field: "last_name", label: "Last Name", value: this.last_name },
             { field: "community", label: "Community", value: this.community },
             { field: "street_address", label: "Street Address", value: this.street_address },
             { field: "city", label: "City", value: this.city },
             { field: "state", label: "State", value: this.state },
             { field: "lat", label: "Location Lat", value: this.lat },
             { field: "lng", label: "Location Lng", value: this.lng },
             { field: "mobile", label: "Mobile", value: this.mobile },
             { field: "landline", label: "Landline", value: this.landline },
             { field: "prior_email", label: "Prior Email", value: this.prior_email },
             { field: "priority", label: "Priority", value: this.priority, options: priority_options },
             { field: "status", label: "Status", value: this.status, options: status_options },
             { field: "current_provider", label: "Current Provider", value: this.current_provider, options: provider_options },
             { field: "relay_site", label: "Relay Site", value: this.relay_site },
             { field: "time_availability", label: "Time Availability", value: this.time_availability },
             { field: "plan", label: "Plan", value: this.plan, options: plan_options },
             { field: "notes", label: "Notes", value: this.notes },
             { field: "username", label: "Username", value: this.username },
             { field: "signup_date", label: "Signup Date", value: this.signup_date },
             { field: "end_date", label: "End Date", value: this.end_date },
             { field: "hold_date", label: "Hold Date", value: this.hold_date }
           ];
  };
}
