if (Meteor.isClient) {
  var sort_fields = ["status_sort", "name_sort", "city_sort", "mapped_sort", "plan_sort", "signup_date_sort"];
  var sort_fields_to_label = {"status_sort": "status", "name_sort": "last_name", "city_sort": "city", "mapped_sort": "lat", "plan_sort": "plan", "signup_date_sort": "signup_date"};

  var archived_subscribers_dep = new Tracker.Dependency;
  var non_archived_subscribers_dep = new Tracker.Dependency;

  Meteor.startup(function() {
    Session.set("primary_sort_field_subscribers", "status_sort");
    Session.set("status_sort", -1);
    Session.set("name_sort", 1);
    Session.set("city_sort", 1);
    Session.set("mapped_sort", 1);
    Session.set("plan_sort", 1);
    Session.set("signup_date_sort", 1);

    Session.set("selected_subscriber", null);
    Session.set("subscriber_search_input", "");
    Session.set("subscriber_search_fields", {});
    Session.set("search_tag_selection", "global");

    Session.set("recenter_map", true);
  });

  getSubscribers = function () {
    var subquery = [];
    if (Session.get("subscriber_search_fields") != null) {
      var current_search_fields = Session.get("subscriber_search_fields");
      if (Session.get("subscriber_search_input").length > 0) {
        var search_field = Session.get("search_tag_selection");
        current_search_fields[search_field] = Session.get("subscriber_search_input");
      }

      for (s in current_search_fields) {
        var query_input = current_search_fields[s];
        if (s === 'global') {
          var global_query = [];
          var searchableFields = Session.get('searchableFields');

          for (f in searchableFields) {
            var field = searchableFields[f];
            var field_query = {};
            field_query[field] = { '$regex': query_input, '$options': 'i' };
            global_query.push(field_query);
          }

          subquery.push({$or: global_query});
        } else {
          var field_query = {};
          field_query[s] = { '$regex': query_input, '$options': 'i' };
          subquery.push(field_query);
        }
      }
    }
    query = {};
    if (subquery.length > 0) {
      query = {$and: subquery};
    }

    var include_fields = {'first_name': 1, 'last_name': 1, 'status': 1, 'street_address': 1, 'city': 1, 'lat': 1, 'lng': 1, 'prior_email': 1, 'archived': 1, 'plan': 1, 'billing_info': 1, 'mobile': 1, 'landline': 1, 'signup_date': 1};

    var result = Subscribers.find(query, {fields: include_fields, sort: GenerateHeaderSort(sort_fields, sort_fields_to_label, "primary_sort_field_subscribers")});
    Session.set("subscriber_count", result.count());
    return result;
  }

  Template.subscriberOverview.helpers({
    searchable_fields: function () {

      var searchableFields =  [ "last_name", "first_name", "city", "status", "street_address", "plan", "subscriber_type", "mobile", "landline", "prior_email", "archived", "current_provider", "bts_to_use" ];
      Session.set('searchableFields', searchableFields);
      return searchableFields;
    },
    current_search_fields: function () {
      var current_search_fields = Session.get("subscriber_search_fields");
      return current_search_fields;
    },
    subscribers: getSubscribers,
    subscriber_count: function () {
      return Session.get("subscriber_count");
    },
    selected_subscriber: function () {
      var subscriber = Subscribers.findOne(Session.get("selected_subscriber"));
      return subscriber;
    },
    created: function () {
      Tracker.afterFlush(function () {
        archived_subscribers_dep.changed();
      });
    }
  });

  Template.subscriberOverview.events({
    'keyup .subscriber_search_input': function (evt) {
      var timeout = Session.get("subscriber_search_input_timeout");
      if (timeout) {
        clearTimeout(timeout);
      }

      Session.set("subscriber_search_input_timeout", setTimeout(function() {
        Session.set("subscriber_search_input", $("#subscriber_search_input").val().trim());
        Session.set("subscriber_search_input_timeout", null);
      }, search_input_lag_ms));
    },
    'change #search_tag': function (evt) {
      Session.set("search_tag_selection", $("#search_tag").val().trim());
    },
    'click #add_search_field': function (evt) {
      var search_value = $("#subscriber_search_input").val().trim();
      console.log("search_value: " + search_value);
 
      var search_field = Session.get("search_tag_selection");
      console.log("search_field: " + search_field);

      var current_search_fields = Session.get("subscriber_search_fields");
      current_search_fields[search_field] = search_value;
      Session.set("subscriber_search_fields", current_search_fields);

      // Clear the subscriber input box since we've grabbed it.
      $("#subscriber_search_input").val("");
      Session.set("subscriber_search_input", "");
    },
    'click .delete_search_field': function (evt) {
      var current_search_fields = Session.get("subscriber_search_fields");
      delete current_search_fields[this.key];
      Session.set("subscriber_search_fields", current_search_fields);
    },
    'click .new_user_button': function (evt) {
      var newId = new Meteor.Collection.ObjectID();
      Subscribers.insert({ '_id': newId, 'first_name': "", 'last_name': "A New User" });
      Session.set("selected_subscriber", newId);
      console.log("selected_subscriber set to: " + Session.get("selected_subscriber"));
      // Enable the modal for the subscriber.
      Tracker.afterFlush(function () {
        $('#subscriber_details_modal').modal({show:true})
      });
    },
    'click #show_archived_subscribers': function (evt) {
      archived_subscribers_dep.changed();
    },
    'click #show_non_archived_subscribers': function (evt) {
      non_archived_subscribers_dep.changed();
    },
    'click .show_map': function (evt) {
      console.log(evt);
      var show_map = evt.target.checked;
      if (show_map) {
        $("#subscriber_map").slideDown();
      } else {
        $("#subscriber_map").slideUp();
      }
    },
    'click .recenter_map': function (evt) {
      console.log(evt);
      Session.set("recenter_map", evt.target.checked);
    },
    'click .name_header': function () {
      Session.set("name_sort", -1 * Session.get("name_sort"));
      Session.set("primary_sort_field_subscribers", "name_sort");
    },
    'click .status_header': function () {
      Session.set("status_sort", -1 * Session.get("status_sort"));
      Session.set("primary_sort_field_subscribers", "status_sort");
    },
    'click .city_header': function () {
      Session.set("city_sort", -1 * Session.get("city_sort"));
      Session.set("primary_sort_field_subscribers", "city_sort");
    },
    'click .mapped_header': function () {
      Session.set("mapped_sort", -1 * Session.get("mapped_sort"));
      Session.set("primary_sort_field_subscribers", "mapped_sort");
    },
    'click .plan_header': function () {
      Session.set("plan_sort", -1 * Session.get("plan_sort"));
      Session.set("primary_sort_field_subscribers", "plan_sort");
    },
    'click .signup_date_header': function () {
      Session.set("signup_date_sort", -1 * Session.get("signup_date_sort"));
      Session.set("primary_sort_field_subscribers", "signup_date_sort");
    }
  });

  Template.subscriber.helpers({
    selected: function () {
      return Session.equals("selected_subscriber", this._id) ? 'info' : '';
    }
  });

  Template.subscriber.events({
    'click': function (evt) {
      Session.set("selected_subscriber", this._id);
      console.log("selected_subscriber set to: " + Session.get("selected_subscriber"));
      if ($(evt.target).hasClass('edit-row')) {
        // Enable the modal for the subscriber.
        Tracker.afterFlush(function () {
          $('#subscriber_details_modal').modal({show:true})
        });
      }
    }
  });

  close_subscriber_modal = function() {
    $('#subscriber_details_modal').modal('hide');
  };
}
