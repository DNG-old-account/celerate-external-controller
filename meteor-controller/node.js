if (Meteor.isClient) {
  var search_fields = ["status", "name", "hardware", "mac"];
  var sort_fields = ["status_sort", "name_sort", "hardware_sort", "mac_sort"];
  var sort_fields_to_label = {"status_sort": "status", "name_sort": "name", "hardware_sort": "hardware", "mac_sort": "mac"};

  Meteor.startup(function() {
    Session.set("primary_sort_field_nodes", "status_sort");
    Session.set("status_sort", -1);
    Session.set("name_sort", 1);
    Session.set("hardware_sort", 1);
    Session.set("mac_sort", 1);

    Session.set("selected_node", null);
    Session.set("node_search_input", "");
  });

  Template.nodeOverview.helpers({
    nodes: function () {
      var query = {};
      if (Session.get("node_search_input") != null && !Session.equals("node_search_input", "")) {
        console.log("Searching for: ["+Session.get("node_search_input")+"]");
        var subquery = [];
        for (s in search_fields) {
          var field_query = {};
          field_query[search_fields[s]] = { '$regex': Session.get("node_search_input"), '$options': 'i'};
          subquery.push(field_query);
        }
        query = {$or: subquery};
      }
      console.log("query: " + JSON.stringify(query));

      var include_fields = {'name': 1, 'status': 1, 'hardware': 1, 'mac': 1};

      var result = Nodes.find(query, {fields: include_fields, sort: GenerateHeaderSort(sort_fields, sort_fields_to_label, "primary_sort_field_nodes")});
      Session.set("node_count", result.count());
      return result;
    },
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
      Session.set("node_search_input", evt.target.value.trim());
    },
    'click .new_node_button': function (evt) {
      var newId = new Meteor.Collection.ObjectID();
      Nodes.insert({ '_id': newId, 'name': "New Node" });
      Session.set("selected_node", newId);
      // Enable the modal for the subscriber.
      Tracker.afterFlush(function () {
        $('#node_details_modal').modal({show:true})
      });
    },
    'click .name_header': function () {
      Session.set("name_sort", -1 * Session.get("name_sort"));
      Session.set("primary_sort_field_nodes", "name_sort");
    },
    'click .status_header': function () {
      Session.set("status_sort", -1 * Session.get("status_sort"));
      Session.set("primary_sort_field_nodes", "status_sort");
    },
    'click .hardware_header': function () {
      Session.set("hardware_sort", -1 * Session.get("hardware_sort"));
      Session.set("primary_sort_field_nodes", "hardware_sort");
    },
    'click .mac_header': function () {
      Session.set("mac_sort", -1 * Session.get("mac_sort"));
      Session.set("primary_sort_field_nodes", "mac_sort");
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
        // Enable the modal for the node.
        Tracker.afterFlush(function () {
          $('#node_details_modal').modal({show:true})
        });
      }
    }
  });

  close_node_modal = function() {
    $('#node_details_modal').modal('hide');
  };
}
