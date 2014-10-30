if (Meteor.isClient) {
  Template.error.dashboardLink = function() {
    var authToken = Session.get('authToken');
    return '/' + authToken;
  };
}

