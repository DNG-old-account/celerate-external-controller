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
    onBeforeAction: checkUser,
    fastRender: true
  });
  this.route('hardwareDetails', {
    path: '/hardware_details/:_id',
    data: function() { return Hardware.findOne(new Meteor.Collection.ObjectID(this.params._id)); },
    onBeforeAction: checkUser,
    fastRender: true
  });

  this.route('sitePage', {
    path: '/site',
    onBeforeAction: checkUser,
    fastRender: true
  });
  this.route('siteDetails', {
    path: '/site_details/:_id', 
    data: function() { return Sites.findOne(new Meteor.Collection.ObjectID(this.params._id)); },
    onBeforeAction: checkUser,
    fastRender: true
  });

  this.route('nodePage', {
    path: '/node',
    data: function() {
      try {
        var node = Nodes.findOne(new Meteor.Collection.ObjectID(this.params.query.id));
        if (node) {
          Session.set("selected_node", node._id);
        }
      } catch (e) {
        console.log(e);
      }
    },
    onBeforeAction: checkUser,
    fastRender: true
  });
  this.route('nodeDetails', {
    path: '/node_details/:_id',
    data: function() { return Nodes.findOne(new Meteor.Collection.ObjectID(this.params._id)); },
    onBeforeAction: checkUser,
    fastRender: true
  });

  this.route('emailsPage', {
    path: '/emails_page',
    onBeforeAction: checkUser,
    fastRender: true
  });

  this.route('subscriberPage', {
    path: '/subscriber',
    onBeforeAction: checkUser,
    fastRender: true
  });
  this.route('subscriberDetails', {
    path: '/subscriber_details/:_id',
    data: function() { return Subscribers.findOne(new Meteor.Collection.ObjectID(this.params._id)); },
    onBeforeAction: checkUser,
    fastRender: true
  });
});
