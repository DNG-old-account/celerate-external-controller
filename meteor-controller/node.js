if (Meteor.isClient) {
  var sort_fields = ["mapped_sort", "name_sort", "hardware_sort", "mac_sort"];
  var sort_fields_to_label = {"mapped_sort": "lat", "name_sort": "name", "hardware_sort": "hardware", "mac_sort": "mac"};

  Meteor.startup(function() {
    Session.set("primary_sort_field_nodes", "name_sort");
    Session.set("mapped_sort", -1);
    Session.set("name_sort", 1);
    Session.set("hardware_sort", 1);
    Session.set("mac_sort", 1);

    Session.set("selected_node", null);
    Session.set("node_search_input", "");
    Session.set("node_search_fields", {});
    Session.set("search_tag_selection", "global");

    Session.set("recenter_map", true);
    Session.set("show_all_links", false);
    Session.set("selected_map_node", null);
    Session.set("selected_map_node_adjacent_nodes", null);
  });

  getNodes = function () {
    var subquery = [];
    if (Session.get("node_search_fields") != null) {
      var current_search_fields = Session.get("node_search_fields");
      if (Session.get("node_search_input").length > 0) {
        var search_field = Session.get("search_tag_selection");
        current_search_fields[search_field] = Session.get("node_search_input");
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

    var include_fields = {'name': 1, 'hardware': 1, 'type': 1, 'site': 1, 'status': 1, 'mac': 1, 'vendor_uid': 1, 'lat': 1, 'lng': 1, 'alt': 1, 'management_ip': 1, 'notes': 1};

    var result = Nodes.find(query, {fields: include_fields, sort: GenerateHeaderSort(sort_fields, sort_fields_to_label, "primary_sort_field_nodes")});
    Session.set("node_count", result.count());
    return result;
  }

  Template.nodeOverview.helpers({
    searchable_fields: function () {

      var searchableFields =  [ "name", "type", "mac", "hardware", "management_ip", "vendor_uid" ];
      Session.set('searchableFields', searchableFields);
      return searchableFields;
    },
    current_search_fields: function () {
      var current_search_fields = Session.get("node_search_fields");
      return current_search_fields;
    },
    nodes: getNodes,
    node_count: function () {
      return Session.get("node_count");
    },
    selected_node: function () {
      var node = Nodes.findOne(Session.get("selected_node"));
      return node;
      //return _.map(node, function(val,key){return {'key': key, 'value': val}});
    },
  });

  Template.nodeOverview.events({
    'keyup .node_search_input': function (evt) {
      var timeout = Session.get("node_search_input_timeout");
      if (timeout) {
        clearTimeout(timeout);
      }

      Session.set("node_search_input_timeout", setTimeout(function() {
        Session.set("node_search_input", $("#node_search_input").val().trim());
        Session.set("node_search_input_timeout", null);
      }, search_input_lag_ms));
    },
    'change #search_tag': function (evt) {
      Session.set("search_tag_selection", $("#search_tag").val().trim());
    },
    'click #add_search_field': function (evt) {
      var search_value = $("#node_search_input").val().trim();
      console.log("search_value: " + search_value);
 
      var search_field = Session.get("search_tag_selection");
      console.log("search_field: " + search_field);

      var current_search_fields = Session.get("node_search_fields");
      current_search_fields[search_field] = search_value;
      Session.set("node_search_fields", current_search_fields);

      // Clear the node input box since we've grabbed it.
      $("#node_search_input").val("");
      Session.set("node_search_input", "");
    },
    'click .delete_search_field': function (evt) {
      var current_search_fields = Session.get("node_search_fields");
      delete current_search_fields[this.key];
      Session.set("node_search_fields", current_search_fields);
    },
    'click .new_node_button': function (evt) {
      var newId = new Meteor.Collection.ObjectID();
      Nodes.insert({ '_id': newId, 'name': "New Node" });
      Session.set("selected_node", newId);
      // Enable the modal for the subscriber.
      Tracker.afterFlush(function () {
        showModal();
      });
    },
    'click .name_header': function () {
      Session.set("name_sort", -1 * Session.get("name_sort"));
      Session.set("primary_sort_field_nodes", "name_sort");
    },
    'click .mapped_header': function () {
      Session.set("mapped_sort", -1 * Session.get("mapped_sort"));
      Session.set("primary_sort_field_nodes", "mapped_sort");
    },
    'click .hardware_header': function () {
      Session.set("hardware_sort", -1 * Session.get("hardware_sort"));
      Session.set("primary_sort_field_nodes", "hardware_sort");
    },
    'click .mac_header': function () {
      Session.set("mac_sort", -1 * Session.get("mac_sort"));
      Session.set("primary_sort_field_nodes", "mac_sort");
    },
    'click .show_map': function (evt) {
      console.log(evt);
      var show_map = evt.target.checked;
      if (show_map) {
        $("#node_map").slideDown();
      } else {
        $("#node_map").slideUp();
      }
    },
    'click .show_all_links': function (evt) {
      var show_all_links = evt.target.checked;
      Session.set("show_all_links", show_all_links);
    },
    'click .recenter_map': function (evt) {
      console.log(evt);
      Session.set("recenter_map", evt.target.checked);
    }
  });


  Template.node.selected = function () {
    return Session.equals("selected_node", this._id) ? 'info' : '';
  };

  Template.node.events({
    'click': function (evt) {
      Session.set("selected_node", this._id);
      console.log("selected_node set to: " + Session.get("selected_node"))
      if ($(evt.target).hasClass('edit-row')) {
        showModal();
      }
    }
  });

  var showModal = function() {
    // Enable the modal for the node.
    Tracker.afterFlush(function () {
      $('#node_details_modal').modal({show:true});
      $('#node_details_modal').off('hide.bs.modal');
      $('#node_details_modal').on('hide.bs.modal', function() {
        $('#node_details_modal select, #node_details_modal input').prop('disabled', true);
      });
    });
  };

  var close_node_modal = function() {
    $('#node_details_modal').modal('hide');
  };
}
