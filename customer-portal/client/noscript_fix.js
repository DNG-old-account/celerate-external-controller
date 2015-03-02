Meteor.startup(function () {
  if (Meteor.isClient) {
    $('body').addClass('loaded');
  }
})

