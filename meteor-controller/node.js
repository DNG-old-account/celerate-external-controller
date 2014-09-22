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

  Template.node_overview.nodes = function () {
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
  };

  Template.node_overview.node_count = function () {
    return Session.get("node_count");
  };

  Template.node_overview.selected_node = function () {
    var node = Nodes.findOne(Session.get("selected_node"));
    return node;
    //return _.map(node, function(val,key){return {'key': key, 'value': val}});
  };

  Template.node_overview.events({
    'keyup .node_search_input': function (evt) {
      Session.set("node_search_input", evt.target.value.trim());
    },
    'click .new_node_button': function (evt) {
      Nodes.insert({ '_id': new Meteor.Collection.ObjectID(), 'name': "New Node" });
    }
  });


  Template.node.selected = function () {
    return Session.equals("selected_node", this._id) ? 'info' : '';
  };

  Template.node_overview.events({
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

  Template.node.events({
    'click': function () {
      Session.set("selected_node", this._id);
      console.log("selected_node set to: " + Session.get("selected_node"))
    },
    'dblclick': function() {
      Session.set("selected_node", this._id);
      console.log("selected_node set to: " + Session.get("selected_node"));
      // Enable the modal for the node.
      $('#node_details_modal').modal({show:true})
    }
  });

  // Sidebar stuff.
  Template.celerate_sidebar.activeSidebar = function () {
    return '';
    //return Session.equals("currentPage", this.id) ? 'class="active"' : '';
  };
}
