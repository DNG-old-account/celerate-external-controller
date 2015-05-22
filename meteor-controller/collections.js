if (Meteor.isServer) {
  Meteor.publish("userData", function () {
    return Meteor.users.find({_id: this.userId},
      {fields: {'services': 1}});
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
  Meteor.publish("hardware", function () {
    return Hardware.find();
  });
  Meteor.publish("nodes", function () {
    return Nodes.find();
  });
  Meteor.publish("edges", function () {
    return Edges.find();
  });
  Meteor.publish("sites", function () {
    return Sites.find();
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
