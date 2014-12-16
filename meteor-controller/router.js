var checkUser = function () {
  if (!Meteor.user() || !Meteor.user().services.google || (Meteor.user().services.google.email.indexOf("denovogroup.org") == -1)) {
    this.render('homePage');
  } else {
    this.next();
  }
};

Router.onBeforeAction('loading');
Router.map(function() {
  this.route('homePage', {path: '/'});

  this.route('hardwarePage', {
    path: '/hardware',
    onBeforeAction: checkUser
  });
  this.route('hardwareDetails', {path: '/hardware_details/:_id', data: function() { return Hardware.findOne(new Meteor.Collection.ObjectID(this.params._id)); }});

  this.route('sitePage', {
    path: '/site',
    onBeforeAction: checkUser
  });
  this.route('siteDetails', {path: '/site_details/:_id', data: function() { return Sites.findOne(new Meteor.Collection.ObjectID(this.params._id)); }});

  this.route('nodePage', {
    path: '/node',
    onBeforeAction: checkUser
  });
  this.route('nodeDetails', {path: '/node_details/:_id', data: function() { return Nodes.findOne(new Meteor.Collection.ObjectID(this.params._id)); }});

  this.route('emailsPage', {
    path: '/emails_page',
    onBeforeAction: checkUser
  });

  this.route('subscriberPage', {
    path: '/subscriber',
    onBeforeAction: checkUser
  });
  this.route('subscriberDetails', {path: '/subscriber_details/:_id', data: function() { return Subscribers.findOne(new Meteor.Collection.ObjectID(this.params._id)); }});
});
