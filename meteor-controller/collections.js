if (Meteor.isServer) {
  Meteor.publish("userData", function () {
    return Meteor.users.find({_id: this.userId},
      {fields: {'services': 1}});
  });

  Meteor.publish("siteData", function publishFunction (siteId) {
    if (typeof siteId === 'string') {
      siteId = new Meteor.Collection.ObjectID(siteId);
    }
    return Sites.find({_id: siteId})
  });

  Meteor.publish("subscriberData", function publishFunction (subId) {
    if (typeof subId === 'string') {
      subId = new Meteor.Collection.ObjectID(subId);
    }
    return Subscribers.find({_id: subId})
  });

  Meteor.publish("subscribersOverview", function () {
    return Subscribers.find({},
      {fields: {'billing_info': 0}});
  });

  Meteor.publish("subscribersFields", function (fields) {
    return Subscribers.find({},
      {fields: fields});
  });

  Meteor.publish("hardware", function () {
    return Hardware.find();
  });

  Meteor.publish("hardwareData", function publishFunction (hardwareId) {
    if (typeof hardwareId === 'string') {
      hardwareId = new Meteor.Collection.ObjectID(hardwareId);
    }
    return Hardware.find({_id: hardwareId})
  });

  Meteor.publish("nodes", function () {
    return Nodes.find();
  });

  Meteor.publish("nodeData", function publishFunction (nodeId) {
    if (typeof nodeId === 'string') {
      nodeId = new Meteor.Collection.ObjectID(nodeId);
    }
    return Nodes.find({_id: nodeId})
  });

  Meteor.publish("edges", function () {
    return Edges.find();
  });

  Meteor.publish("sites", function () {
    return Sites.find();
  });

  Meteor.publish("subscriberSite", function publishFunction (subId) {
    if (typeof subId === 'string') {
      subId = new Meteor.Collection.ObjectID(subId);
    }
    return Sites.find({'type.subscriber': subId});
  });

  Meteor.publish("siteNodes", function publishFunction (siteId) {
    if (typeof siteId === 'object') {
      siteId = siteId._str;
    }
    return Nodes.find({'site': siteId});
  });

  Meteor.publish("contacts", function () {
    return Contacts.find();
  });

  Meteor.publish("shortAuthTokens", function () {
    return ShortAuthTokens.find();
  });
}

Subscribers = new Meteor.Collection("subscribers");
Nodes = new Meteor.Collection("nodes");
Edges = new Meteor.Collection("edges");
Hardware = new Meteor.Collection("hardware");
Sites = new Meteor.Collection("sites");
Contacts = new Meteor.Collection("contacts");
ShortAuthTokens = new Meteor.Collection("shortauthtokens");
