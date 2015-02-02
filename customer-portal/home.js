if (Meteor.isClient) {
  Template.homePage.helpers({
    logged_in: function () {
      return Meteor.user() != null;
    },
    user_info: function () {
      return Meteor.user().services.google.email;
    }
  });
}
