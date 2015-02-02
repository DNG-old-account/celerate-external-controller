Meteor.startup(function () {
  if (typeof Meteor.settings.serviceAuth === "object") {
    _.each(Meteor.settings.serviceAuth, function(auth) {
      ServiceConfiguration.configurations.remove({
        service: auth.name
      });
      ServiceConfiguration.configurations.insert({
        service: auth.name,
        clientId: auth.clientId,
        secret: auth.secret
      });
    });
  }
  // server
  Meteor.publish("userData", function () {
    if (this.userId) {
      return Meteor.users.find({_id: this.userId},
                               {fields: {'services': 1}});
    } else {
      this.ready();
    }
  });

// client
// Meteor.subscribe("userData");
});
