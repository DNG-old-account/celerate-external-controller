var checkUser = function (pause) {
  if (!Meteor.user() || !Meteor.user().services.google || (Meteor.user().services.google.email.indexOf("denovogroup.org") == -1)) {
    this.render('home_page');
    pause();
  }
};

Router.onBeforeAction('loading');
Router.map(function() {
  this.route('home_page', {path: '/'});

  this.route('hardware_page', {
    path: '/hardware',
    onBeforeAction: checkUser
  });
  this.route('hardware_details', {path: '/hardware_details/:_id', data: function() { return Hardware.findOne(new Meteor.Collection.ObjectID(this.params._id)); }});

  this.route('site_page', {
    path: '/site',
    onBeforeAction: checkUser
  });
  this.route('site_details', {path: '/site_details/:_id', data: function() { return Sites.findOne(new Meteor.Collection.ObjectID(this.params._id)); }});

  this.route('node_page', {
    path: '/node',
    onBeforeAction: checkUser
  });
  this.route('node_details', {path: '/node_details/:_id', data: function() { return Nodes.findOne(new Meteor.Collection.ObjectID(this.params._id)); }});

  this.route('emails_page', {
    path: '/emails_page',
    onBeforeAction: checkUser
  });

  this.route('subscriber_page', {
    path: '/subscriber',
    onBeforeAction: checkUser
  });
  this.route('subscriber_details', {path: '/subscriber_details/:_id', data: function() { return Subscribers.findOne(new Meteor.Collection.ObjectID(this.params._id)); }});
});
