if (Meteor.isClient) {
  // Hardware details functionality and events.
  Template.hardwareDetails.events({
    'click .add-port': function (evt) {
      Hardware.update(this._id, {$push: {ports: {name: 'new_port', type: 'wired'}}});
    },
    'click .delete-port': function (evt) {
      var db_update = {};
      db_update.ports = {'name' : evt.target.id};
      Hardware.update(this.hardware_instance._id, {$pull: db_update}); 
    },
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

        Hardware.update(this._id, {$set: db_update}); 
        formelement.disabled = true;

        // Toggle the icon visual state.
        evt.target.classList.add("text-gray");
        evt.target.previousElementSibling.classList.remove("text-gray");
      }
    },
    'click .delete_hardware_button': function (evt) {
      var id = this._id;
      bootbox.confirm("Are you sure you want to delete this hardware?", function(first_result) {
        if (first_result) {
          bootbox.confirm("Are you REALLY REALLY sure you want to delete this hardware?", function(second_result) {
            if (second_result) {
              window.parent.close_hardware_modal();
              setTimeout(function(){ Hardware.remove(id); }, 1000);
            }
          });
        }
      }); 
    }
  });

  Template.hardwareDetails.helpers({
    hardware_fields: function () {
      for (var p in this.ports) {
        this.ports[p].index = p;
      }

      return [ { field: "name", label: "Name", value: this.name },
               { field: "make", label: "Make", value: this.make },
               { field: "model", label: "Model", value: this.model },
               { field: "price", label: "Base Price", value: this.price, display_price_text: true },
               { field: "voltage", label: "Voltage", value: this.voltage },
               { field: "ports", label: "Ports", value: this.ports, display_ports: true },
             ];
    }
  });
}
