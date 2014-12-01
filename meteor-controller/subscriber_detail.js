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

        if (formelement.id === 'prior_email') {
          if (typeof formelement.value !== 'string' || 
              formelement.value.trim() === '' ||
              !FRMethods.isValidEmail(formelement.value)) {

            bootbox.alert('"' + formelement.value + '" is not a valid email address');
            return;
          }
        }

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

            }
          });
        } else {
          if (formelement.id === 'plan') {
            // Check if has current plan
            if (typeof this.plan === 'string' && this.plan.trim() !== '') {
              if (this.billing_info !== 'object') {
                FRMethods.createBillingProperties(this);
              }

              if (typeof this.billing_info.plan_activity !== 'object') {
                Subscribers.update(this._id, {$set: {'billing_info.plan_activity': []}}); 
              }
              var planChange = {
                previousPlan: this.plan,
                newPlan: formelement.value,
                date: new Date()
              }
              Subscribers.update(this._id, {$push: {'billing_info.plan_activity': planChange}}); 
              // TODO: we need to check to see if subscriber is autopay and then change their plans and do all that fancy magic
              if (typeof this.billing_info.autopay === 'object' && this.billing_info.autopay.on) {

              }
            }
          }
          db_update = {};
          db_update[formelement.id] = formelement.value;
          Subscribers.update(this._id, {$set: db_update}); 
          formelement.disabled = true;
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
    'click .archive_subscriber_button': function (evt) {
      var id = this._id;
      bootbox.confirm("Are you sure you want to archive this subscriber?", function(result) {
        if (result) {
          Subscribers.update(id, {$set: {archived: "true"}});
        }
      }); 
    },
    'click .unarchive_subscriber_button': function (evt) {
      var id = this._id;
      bootbox.confirm("Are you sure you want to UN-archive this subscriber?", function(result) {
        if (result) {
          Subscribers.update(id, {$set: {archived: "false"}});
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

  var getUserBillingLink = function (subscriber_id) {
    console.log("about to call generateAuthToken with " + subscriber_id);
    Meteor.call('generateAuthToken', subscriber_id, function (err, result) {
      if (err) {
        console.log("generateAuthToken call failed: " + err);
      } else {
        console.log("Called generateAuthToken, got: " + result);
        if (!result) {
          console.log("generateAuthToken failed.");
        } else {
          var user_link = Meteor.settings.public.urls.customerPortal + result;
          console.log("setting user billing link " + user_link);
          Session.set("user_billing_link", user_link);
        }
      }
    });
  };

  Template.subscriber_details.user_billing_link = function () {
    console.log("re-getting user billing link: " + Session.get("user_billing_link"));
    return Session.get("user_billing_link");
  };

  Template.subscriber_details.site_link = function () {
    return Sites.findOne({'type.subscriber': this._id});
  };

  Template.subscriber_details.cpe_options = function () {
    return Nodes.find({ type: 'cpe' });
  };

  Template.subscriber_details.terms_info = function () {
    return {
      agreed_to_terms: (typeof this.terms === "object" && this.terms.agreed) ? '<span class="glyphicon glyphicon-ok"></span> ' + this.terms.date : '<span class="glyphicon glyphicon-remove"></span>'
    };
  };

  Template.subscriber_details.ap_options = function () {
    return Nodes.find({ type: 'ap' });
  };
   
  Template.subscriber_billing_info.selectedAdditionalEquipment = function () {
    return Session.get('selectedAdditionalEquipmentNode');
  };

  Template.subscriber_details.basic_info_fields = function () {
    // Set up the user billing link, since we know we have a subscriber id now.
    getUserBillingLink(this._id._str);

    var subscriber_type_options = ["residential", "business", "non profit organization"];
    var status_options = ["connected", "new lead", "no coverage", "deferred", "not interested", "disconnected"];
    var provider_options = ["further reach", "cvc", "ukiah wireless", "mcn", "satellite", "none", "unknown"];
    var plan_options = _.keys(FRSettings.billing.plans);
    var discount_options = _.keys(FRSettings.billing.discounts);

    // Assemble the fields to display.
    var fields;
    fields = [ { field: "first_name", label: "First Name", value: this.first_name },
               { field: "last_name", label: "Last Name", value: this.last_name } ];

    // For non-residential subscribers, show a business name field.
    // TODO(barath): Eventually only show a business name field for such subscribers.
    if (this.subscriber_type !== 'residential') {
      fields.push({ field: "business_name", label: "Business Name", value: this.business_name });
    }

    fields.push({ field: "subscriber_type", label: "Subscriber Type", value: this.subscriber_type, options: subscriber_type_options },
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
                { field: "discount", label: "Discount", value: this.discount, options: discount_options },
                { field: "discount_start_date", label: "Discount Start Date", value: this.discount_start_date },
                { field: "discount_end_date", label: "Discount End Date", value: this.discount_end_date },
                { field: "username", label: "Username", value: this.username },
                { field: "max_speed", label: "Max Speed", value: this.max_speed },
                { field: "activation_date", label: "Activation Date", value: this.activation_date },
                { field: "signup_date", label: "Signup Date", value: this.signup_date },
                { field: "end_date", label: "End Date", value: this.end_date },
                { field: "hold_date", label: "Hold Date", value: this.hold_date });

    return fields;
  };


  Template.subscriber_details.is_archived = function () {
    return this.archived == "true";
  };

  Template.subscriber_details.scheduling_fields = function () {
    var priority_options = ["high", "medium", "low", "none", "unknown"];
    var provider_options = ["further reach", "cvc", "ukiah wireless", "mcn", "satellite", "none", "unknown"];
    var bts_options = [ "RJ-N", "RJ-W", "RJ-E", "LH-E", "10M-W", "BH-N", "BH-E", "PAHS-SW", "PAHS-SE", "PAES-W", "PAES-S", "TH-W", "TH-E" ];

    return [ { field: "priority", label: "Priority", value: this.priority, options: priority_options },
             { field: "current_provider", label: "Current Provider", value: this.current_provider, options: provider_options },
             { field: "relay_site", label: "Willing to be Relay Site", value: this.relay_site },
             { field: "time_availability", label: "Time Availability", value: this.time_availability },
             { field: "bts_to_use", label: "BTS to use", value: this.bts_to_use, options: bts_options },
             { field: "notes", label: "Notes", value: this.notes },
             { field: "signup_date", label: "Signup Date", value: this.signup_date }
           ];
  };

  Template.subscriber_billing_info.events({
    'click #add-discount': function (evt) {
      evt.preventDefault();
      var thisSub = Session.get('thisSub');
      var amount = Math.round10(parseFloat($('#discount-amount').val()), 2);
      var notes = $('#discount-notes').val();
      var label = $('#discount-label').val();
      var discount = {
        amount: amount,
        dateCreated: new Date(),
        used: false,
        notes: notes,
        label: label
      };
      // TODO: (max) - need to figure out if autopay is on, and then apply a discount to their subscription
      Subscribers.update(thisSub._id, {$push: {'billing_info.discounts': discount }});
    },

    'click .delete-discount': function (evt) {
      evt.preventDefault();
      var thisSub = Session.get('thisSub');
      Subscribers.update(thisSub._id, {$pull: {'billing_info.discounts': {'dateCreated': this.dateCreated}}});

    },
    'click #add-additional-hardware': function (evt) {
      evt.preventDefault();
      var selectedHardware = Session.get('selectedAdditionalEquipmentNode');
      var tax = parseFloat($('#extra-equipment-tax-percent').val());
      selectedHardware.hardwareObj.tax = tax;
      var thisSub = this;
      Subscribers.update(thisSub._id, {$push: {'billing_info.installation.additional_equipment': selectedHardware }});
    },
    'click #remove-additional-hardware': function (evt) {
      evt.preventDefault();
      var thisSub = Session.get('thisSub');
      var removeHardware = this;
      Subscribers.update(thisSub._id, {$pull: {'billing_info.installation.additional_equipment': {'_id': removeHardware._id} }});
    },
    'click #update-billing': function (evt) {
      evt.preventDefault();
      var thisSub = this;

      var form = $(evt.target).parents('form.billing-form');
      var updatedVal = form.find('#standard-installation').val();
      var paidInstallation = form.find('#paid-installation').val();
      paidInstallation = (paidInstallation === "true") ? true : false;

      Subscribers.update(thisSub._id, {$set: {'billing_info.installation.standard_installation': updatedVal }});

      var extraLaborCost = form.find('#billing-extra-labor').val().trim();
      if (FRMethods.isNumber(extraLaborCost)) {
        extraLaborCost = parseFloat(extraLaborCost);
        Subscribers.update(thisSub._id, {$set: {'billing_info.installation.additional_labor': extraLaborCost }});
      }

      Subscribers.update(thisSub._id, {$set: {'billing_info.installation.paid': paidInstallation }});
    },
    'change select#billing-extra-equipment': function (evt) {
      var newSelectedId = $(evt.target).val();
      var nodes = Session.get('additionalEquipmentNodes');

      var newSelectedNode = _.find(nodes, function(node) {
        return node._id._str === newSelectedId;
      });
      Session.set('selectedAdditionalEquipmentNode', newSelectedNode);

    }
  });

  Template.subscriber_billing_info.billing_info = function () {
    if (typeof this.billing_info !== 'object') {
      FRMethods.createBillingProperties(this);
    }
    return this.billing_info; 
  };

  Template.subscriber_billing_info.extraEquipment = function () {
    var thisSub = this;
    Session.set('thisSub', thisSub);

    var billedHardware = thisSub.billing_info.installation.additional_equipment;
    
    var nodes = [];
    // Now search through sites to see if any are associated with this subscriber
    var thisSubsSites = Sites.find({'type.subscriber': thisSub._id}).fetch();
    if (thisSubsSites.length > 0) {
      // Now search through nodes to see if any are associated with these sites
      _.each(thisSubsSites, function(site) {
        var thisSitesNodes = Nodes.find({'site': site._id._str}).fetch();

        // Get rid of any that we've already added to billing
        thisSitesNodes = _.reject(thisSitesNodes, function(node) {
          var reject = false;
          _.each(billedHardware, function(billed) {
            if (node._id._str === billed._id._str) {
              reject = true;
            }
          });
          return reject;
        });

        // Now add hardware details
        _.each(thisSitesNodes, function(node) {
          var thisHardware = Hardware.findOne({'name': node.hardware});
          node.hardwareObj = thisHardware;
        });

        nodes = nodes.concat(thisSitesNodes);
      });
      Session.set('selectedAdditionalEquipmentNode', _.first(nodes));
      Session.set('additionalEquipmentNodes', nodes);
    }

    return {
      installedNodes: nodes,
    };
  };

}

