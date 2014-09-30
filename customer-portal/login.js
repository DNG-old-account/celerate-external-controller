if (Meteor.isClient) {

  Template.login.events({
    'submit': function () {
      console.log("Add User!");
    },
  });
}
