if (Meteor.isClient) {
  Template.home_page.logged_in = function () {
    return Meteor.user() != null;
  };

  Template.home_page.user_info = function () {
    return Meteor.user().services.google.email;
  };
}
