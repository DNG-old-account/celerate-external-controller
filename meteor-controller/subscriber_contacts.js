if (Meteor.isClient) {
  Template.subscriberContacts.helpers({
    get_contacts: function() {
      contacts = [];
      for (var c in this.contacts) {
        contacts.push({type: this.contacts[c].type, data: Contacts.findOne(this.contacts[c].contact_id)});
      }
      return contacts;
    },
    contact_fields: function () {
      return [ { field: "first_name", label: "First Name", value: this.first_name },
               { field: "last_name", label: "Last Name", value: this.last_name },
               { field: "community", label: "Community", value: this.community },
               { field: "street_address", label: "Street Address", value: this.street_address },
               { field: "city", label: "City", value: this.city },
               { field: "state", label: "State", value: this.state },
               { field: "zip_code", label: "Zip Code", value: this.zip_code },
               { field: "lat", label: "Location Lat", value: this.lat },
               { field: "lng", label: "Location Lng", value: this.lng },
               { field: "mobile", label: "Mobile", value: this.mobile },
               { field: "landline", label: "Landline", value: this.landline },
               { field: "email", label: "Email", value: this.email }
             ];
    }
  });

  Handlebars.registerHelper('new_contact_type_options', function () {
    return ["billing", "helpdesk"];
  });

  // Subscriber contacts functionality and events.
  Template.subscriberContacts.events({
    'click': function (evt) {
      console.log(evt);

      if (evt.target.hash == "#add_contact") {
        var o = new Meteor.Collection.ObjectID();
        Contacts.insert({"_id" : o});
        Subscribers.update(new Meteor.Collection.ObjectID(evt.target.className), { $push: { "contacts": {"type": evt.target.id, "contact_id": o} }});
        return;
      }

      // User clicked on pencil icon to begin editing.
      if (evt.target.id == "edit" && !evt.target.classList.contains("text-gray")) {
        evt.stopPropagation();
        // Toggle the icon visual state.
        evt.target.classList.add("text-gray");
        evt.target.nextElementSibling.classList.remove("text-gray");

        var formelement = evt.target.parentElement.previousElementSibling.firstChild;
        formelement.disabled = false;
      }

      // User clicked on save icon to save input.
      if (evt.target.id == "save" && !evt.target.classList.contains("text-gray")) {
        evt.stopPropagation();
        var formelement = evt.target.parentElement.previousElementSibling.firstChild;
        console.log(formelement);
        console.log(this);

        var thisContact = Contacts.findOne(this._id);
        var thisSub = Subscribers.findOne({'contacts': {$elemMatch: {"contact_id": this._id}}});
        var billingInfo = FRMethods.getBillingInfo(thisSub._id);

        if (formelement.id === 'email') {
          if (typeof formelement.value !== 'string' || 
              formelement.value.trim() === '' ||
              !FRMethods.isValidEmail(formelement.value)) {

            bootbox.alert('"' + formelement.value + '" is not a valid email address');
            return;
          }

          // If sub is on autopay we have to change their email address in stripe
          if (typeof thisContact.email === 'string' && 
              billingInfo.contact.email === thisContact.email) {

            if (typeof thisSub.billing_info === 'object' &&
                typeof thisSub.billing_info.autopay === 'object' &&
                typeof thisSub.billing_info.autopay.customer === 'object') {

              Meteor.call('updateStripeEmail', thisSub._id, formelement.value, function(err, result) {
                if (result) {
                } else {
                  console.log(err);
                  bootbox.alert('Error trying to update stripe email address <br/> ' + JSON.stringify(err) ); 
                }
              });
            }
          }
        }


        db_update = {};
        db_update[formelement.id] = formelement.value;
        Contacts.update(this._id, {$set: db_update}); 
        formelement.disabled = true;

        // Toggle the icon visual state.
        evt.target.classList.add("text-gray");
        evt.target.previousElementSibling.classList.remove("text-gray");
      }
    }
  });
}
