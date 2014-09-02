var checkUser = function (pause) {
  if (!Meteor.user() || !Meteor.user().services.google || Meteor.user().services.google.email.indexOf("furtherreach.net") == -1) {
    this.render('home_page');
    pause();
  }
};

Router.onBeforeAction('loading');
Router.map(function() {
  this.route('home_page', {path: '/'});
  this.route('node_page', {
    path: '/node',
    onBeforeAction: checkUser
  });
  this.route('node_details', {path: '/node_details/:_id', data: function() { return Nodes.findOne(new Meteor.Collection.ObjectID(this.params._id)); }});
  this.route('subscriber_page', {
    path: '/subscriber',
    onBeforeAction: checkUser
  });
  this.route('subscriber_details', {path: '/subscriber_details/:_id', data: function() { return Subscribers.findOne(new Meteor.Collection.ObjectID(this.params._id)); }});
});