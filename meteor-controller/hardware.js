if (Meteor.isClient) {
  var search_fields = ["name", "make", "model"];
  var sort_fields = ["name_sort", "make_sort", "model_sort"];
  var sort_fields_to_label = {"name_sort": "name", "make_sort": "make", "model_sort": "model"};

  Meteor.startup(function() {
    Session.set("primary_sort_field_hardware", "name_sort");
    Session.set("name_sort", 1);
    Session.set("make_sort", 1);
    Session.set("model_sort", 1);

    Session.set("selected_hardware", null);
    Session.set("hardware_search_input", "");
  });

  Template.hardwareOverview.helpers({
    hardwares: function () {
      var query = {};
      if (Session.get("hardware_search_input") != null && !Session.equals("hardware_search_input", "")) {
        console.log("Searching for: ["+Session.get("hardware_search_input")+"]");
        var subquery = [];
        for (s in search_fields) {
          var field_query = {};
          field_query[search_fields[s]] = { '$regex': Session.get("hardware_search_input"), '$options': 'i'};
          subquery.push(field_query);
        }
        query = {$or: subquery};
      }
      console.log("query: " + JSON.stringify(query));

      var include_fields = {'name': 1, 'make': 1, 'model': 1, 'ports': 1 };

      var query_options = {fields: include_fields, sort: GenerateHeaderSort(sort_fields, sort_fields_to_label, "primary_sort_field_hardware")};
      console.log(JSON.stringify(query_options));
      var result = Hardware.find(query, {fields: include_fields, sort: GenerateHeaderSort(sort_fields, sort_fields_to_label, "primary_sort_field_hardware")});
      Session.set("hardware_count", result.count());
      return result;
    },
    hardware_count: function () {
      return Session.get("hardware_count");
    },
    selected_hardware: function () {
      var hardware = Hardware.findOne(Session.get("selected_hardware"));
      return hardware;
      //return _.map(hardware, function(val,key){return {'key': key, 'value': val}});
    }
  });

  Template.hardwareOverview.events({
    'keyup .hardware_search_input': function (evt) {
      Session.set("hardware_search_input", evt.target.value.trim());
    },
    'click .new_hardware_button': function (evt) {
      var newId = new Meteor.Collection.ObjectID();
      Hardware.insert({ '_id': newId, 'name': "New Hardware" });
      Session.set("selected_hardware", newId);
      showModal();
    },
    'click .name_header': function () {
      Session.set("name_sort", -1 * Session.get("name_sort"));
      Session.set("primary_sort_field_hardware", "name_sort");
    },
    'click .make_header': function () {
      Session.set("make_sort", -1 * Session.get("make_sort"));
      Session.set("primary_sort_field_hardware", "make_sort");
    },
    'click .model_header': function () {
      Session.set("model_sort", -1 * Session.get("model_sort"));
      Session.set("primary_sort_field_hardware", "model_sort");
    }
  });


  Template.hardware.helpers({
    selected: function () {
      return Session.equals("selected_hardware", this._id) ? 'info' : '';
    }
  });

  Template.hardware.events({
    'click': function (evt) {
      var alreadyClicked = false;
      if (Session.equals('selected_hardware', this._id)) {
        alreadyClicked = true;
      }

      Session.set("selected_hardware", this._id);
      console.log("selected_hardware set to: " + Session.get("selected_hardware"))
      if (alreadyClicked || $(evt.target).hasClass('edit-row')) {
        showModal();
      }
    }
  });

  var showModal = function() {
    Tracker.afterFlush(function () {
      $('#hardware_details_modal').modal({show:true})
      $('#hardware_details_modal').off('hide.bs.modal');
      $('#hardware_details_modal').on('hide.bs.modal', function() {
        $('#hardware_details_modal select, #hardware_details_modal input').prop('disabled', true);
      });
    });
  };

  var close_hardware_modal = function() {
    $('#hardware_details_modal').modal('hide');
  };
}
