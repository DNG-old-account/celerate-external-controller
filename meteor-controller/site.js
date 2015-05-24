if (Meteor.isClient) {
  var search_fields = ["type", "name"];
  var sort_fields = ["type_sort", "name_sort", "pictures_sort"];
  var sort_fields_to_label = {"type_sort": "type", "name_sort": "name", "pictures_sort": "pictures"};

  Meteor.startup(function() {
    Session.set("primary_sort_field_sites", "name_sort");
    Session.set("type_sort", 1);
    Session.set("name_sort", 1);
    Session.set("pictures_sort", 1);

    Session.set("selected_site", null);
    Session.set("site_search_input", "");
  });

  Template.siteOverview.helpers({
    sites: function () {
      Meteor.subscribe('subscribersFields', {'city': 1, 'street_address': 1});
      var query = {};
      if (Session.get("site_search_input") != null && !Session.equals("site_search_input", "")) {
        console.log("Searching for: ["+Session.get("site_search_input")+"]");
        var subquery = [];
        for (s in search_fields) {
          var field_query = {};
          field_query[search_fields[s]] = { '$regex': Session.get("site_search_input"), '$options': 'i'};
          subquery.push(field_query);
        }
        query = {$or: subquery};
      }
      console.log("query: " + JSON.stringify(query));

      var include_fields = {'type': 1, 'name': 1, 'type': 1, 'pictures': 1};

      var result = Sites.find(query, {fields: include_fields, sort: GenerateHeaderSort(sort_fields, sort_fields_to_label, "primary_sort_field_sites")});
      Session.set("site_count", result.count());
      return result;
    },
    site_count: function () {
      return Session.get("site_count");
    },
    selected_site: function () {
      var site = Sites.findOne(Session.get("selected_site"));
      return site;
    }
  });

  Template.siteOverview.events({
    'keyup .site_search_input': function (evt) {
      Session.set("site_search_input", evt.target.value.trim());
    },
    'click .new_site_button': function (evt) {
      var newId = new Meteor.Collection.ObjectID();
      Sites.insert({ '_id': newId, 'name': "New site" });
      Session.set("selected_site", newId);
      showModal();
    },
    'click .type_header': function () {
      Session.set("type_sort", -1 * Session.get("type_sort"));
      Session.set("primary_sort_field_sites", "type_sort");
    },
    'click .name_header': function () {
      Session.set("type_sort", -1 * Session.get("type_sort"));
      Session.set("primary_sort_field_sites", "type_sort");
    },
    'click .pictures_header': function () {
      Session.set("pictures_sort", -1 * Session.get("pictures_sort"));
      Session.set("primary_sort_field_sites", "pictures_sort");
    }
  });

  Template.site.helpers({
    selected: function () {
      return Session.equals("selected_site", this._id) ? 'info' : '';
    }
  });

  Template.site.events({
    'click': function (evt) {
      Session.set("selected_site", this._id);
      console.log("selected_site set to: " + Session.get("selected_site"))
      if ($(evt.target).hasClass('edit-row')) {
        showModal();
      }
    }
  });

  Handlebars.registerHelper('site_type_to_string', function(type_field) {
    var types = [];
    for (var key in type_field) {
      types.push(key);
    }
    return JSON.stringify(types);
  });

  Handlebars.registerHelper('site_location_to_string', function(site) {
    var street_address = "";
    var city = "";

    if ("type" in site && "subscriber" in site.type) {
      // For subscriber sites, use the subscriber's address and city.
      subscriber = Subscribers.findOne(site.type["subscriber"]);
      if (typeof subscriber === 'object') { 
        if (typeof subscriber.street_address === 'string') {
          street_address = subscriber.street_address;
        }
        if (typeof subscriber.city === 'string') {
          city = subscriber.city;
        }
      }
    } else if ("street_address" in site && "city" in site) {
      // For all other site types, use the site-specific address, if it exists.
      street_address = site.street_address;
      city = site.city;
    } else {
      // No known address, do nothing.
    }

    return street_address + ", " + city;
  });

  var showModal = function() {
    Tracker.afterFlush(function () {
      $('#site_details_modal').modal({show:true})
      $('#site_details_modal').off('hide.bs.modal');
      $('#site_details_modal').on('hide.bs.modal', function() {
        $('#site_details_modal .disabled-on-init select, #site_details_modal .disabled-on-init input').prop('disabled', true);
      });
    });
  };

  var close_site_modal = function() {
    $('#site_details_modal').modal('hide');
  };
}
