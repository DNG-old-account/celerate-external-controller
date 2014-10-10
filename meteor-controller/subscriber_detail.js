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

        // Confirm when marking as connected.
        if (formelement.id == "status" && formelement.value == "connected") {
          var context = this;
          bootbox.confirm("Are you sure you want to mark this subscriber as connected?", function(result) {
            if (result) {
              db_update = {};
              db_update[formelement.id] = formelement.value;
              if (formelement.id == "status" && formelement.value == "connected") {
                db_update['current_provider'] = 'further reach';
                db_update['activation_date'] = new Date();
              }
              Subscribers.update(context._id, {$set: db_update}); 
              formelement.disabled = true;

              var subscriber_id = context._id._str;
              var existing_site = Sites.findOne(function() { return context.type && context.type.subscriber && context.type.subscriber == subscriber_id; });
              console.log(existing_site);
              if (!existing_site) {
                Sites.insert({'_id': new Meteor.Collection.ObjectID(),
                  'name': (context.first_name + " " + context.last_name),
                  'type': {'subscriber': context._id}});
                window.alert("Adding site for newly connected subscriber.");
              }

              // Toggle the icon visual state.
              evt.target.classList.add("text-gray");
              evt.target.previousElementSibling.classList.remove("text-gray");
            }
          });
        } else {
          db_update = {};
          db_update[formelement.id] = formelement.value;
          Subscribers.update(this._id, {$set: db_update}); 
          formelement.disabled = true;

          // Toggle the icon visual state.
          evt.target.classList.add("text-gray");
          evt.target.previousElementSibling.classList.remove("text-gray");
        }
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
    'click #user_billing_setup_button': function (evt) {
      var id = this._id;
      // Try/Catch to allow for customerPortal or url to be undefined
      try {
        var win = window.open(Meteor.settings.public.urls.customerPortal +  id, '_blank');
        win.focus();
      } catch (e) {
      }

    },
    'click #update_billing': function (evt) {
      // TODO: Doesn't have a handler for other equipment or labor
      evt.preventDefault();
      thisSub = this;

      var form = $(evt.target).parents('form.billing-form');
      var updatedVal = form.find('#standard_installation').val();
      var paidInstallation = form.find('#paid_installation').val();
      paidInstallation = (paidInstallation === "true") ? true : false;

      Subscribers.update(thisSub._id, {$set: {'billing_info.installation.standard_installation': updatedVal }});
      Subscribers.update(thisSub._id, {$set: {'billing_info.installation.paid': paidInstallation }});

    },
    'click .archive_subscriber_button': function (evt) {
      var id = this._id;
      bootbox.confirm("Are you sure you want to archive this subscriber?", function(result) {
        if (result) {
          Subscribers.update(id, {$set: {archived: true}});
        }
      }); 
    },
    'click .delete_subscriber_button': function (evt) {
      var id = this._id;
      bootbox.confirm("Are you sure you want to delete this subscriber?", function(first_result) {
        if (first_result) {
          bootbox.confirm("Are you REALLY REALLY sure you want to delete this subscriber?", function(second_result) {
            if (second_result) {
              window.parent.close_subscriber_modal();
              setTimeout(function(){ Subscribers.remove(id); }, 1000);
            }
          });
        }
      }); 
    }
  });

  Template.subscriber_details.cpe_options = function () {
    return Nodes.find({ type: 'cpe' });
  };

  Template.subscriber_details.terms_info = function () {
    return {
      agreed_to_terms: (typeof this.terms === "object" && this.terms.agreed) ? "Yes: " + this.terms.date : "No"
    }
  };

  Template.subscriber_details.ap_options = function () {
    return Nodes.find({ type: 'ap' });
  };

  Template.subscriber_details.basic_info_fields = function () {
    var subscriber_type_options = ["residential", "business", "non profit organization"];
    var status_options = ["connected", "new lead", "no coverage"];
    var provider_options = ["further reach", "cvc", "ukiah wireless", "mcn", "satellite", "none", "unknown"];
    var plan_options = ["beta-free", "nonprofit-free", "relay-free", "landuse-free", "limited", "essential", "performance", "ultra", "silver", "gold"];

    return [ { field: "first_name", label: "First Name", value: this.first_name },
             { field: "last_name", label: "Last Name", value: this.last_name },
             { field: "subscriber_type", label: "Subscriber Type", value: this.subscriber_type, options: subscriber_type_options },
             { field: "community", label: "Community", value: this.community },
             { field: "street_address", label: "Street Address", value: this.street_address },
             { field: "city", label: "City", value: this.city },
             { field: "state", label: "State", value: this.state },
             { field: "zip_code", label: "Zip Code", value: this.zip_code },
             { field: "lat", label: "Location Lat", value: this.lat },
             { field: "lng", label: "Location Lng", value: this.lng },
             { field: "mobile", label: "Mobile", value: this.mobile },
             { field: "landline", label: "Landline", value: this.landline },
             { field: "prior_email", label: "Prior Email", value: this.prior_email },
             { field: "status", label: "Status", value: this.status, options: status_options },
             { field: "plan", label: "Plan", value: this.plan, options: plan_options },
             { field: "username", label: "Username", value: this.username },
             { field: "max_speed", label: "Max Speed", value: this.max_speed },
             { field: "activation_date", label: "Activation Date", value: this.activation_date },
             { field: "signup_date", label: "Signup Date", value: this.signup_date },
             { field: "end_date", label: "End Date", value: this.end_date },
             { field: "hold_date", label: "Hold Date", value: this.hold_date }
           ];
  };

  Template.subscriber_details.billing_info = function () {
    // If a subscriber doesn't have billing info yet, we can just create it here
    if (typeof this.billing_info !== 'object') {
      // Create default billing info
      var billing = {
        installation: {
          standard_installation: '150',
          additional_equipment: [],
          additional_labor: [],
          paid: false
        },
        charges: []
      };
      db_update = {};
      db_update['billing_info'] = billing;
      Subscribers.update(this._id, {$set: db_update}); 
    }

  
    return this.billing_info; 

  };

  Template.subscriber_details.scheduling_fields = function () {
    var priority_options = ["high", "medium", "low", "none", "unknown"];
    var provider_options = ["further reach", "cvc", "ukiah wireless", "mcn", "satellite", "none", "unknown"];

    return [ { field: "priority", label: "Priority", value: this.priority, options: priority_options },
             { field: "current_provider", label: "Current Provider", value: this.current_provider, options: provider_options },
             { field: "relay_site", label: "Relay Site", value: this.relay_site },
             { field: "time_availability", label: "Time Availability", value: this.time_availability },
             { field: "notes", label: "Notes", value: this.notes },
             { field: "signup_date", label: "Signup Date", value: this.signup_date }
           ];
  };
}
