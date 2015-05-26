var checkUser = function () {
  if (!Meteor.user() || !Meteor.user().services.google || (Meteor.user().services.google.email.indexOf("denovogroup.org") == -1)) {
    this.render('homePage');
  } else {
    return true;
  }
};

Router.configure({
  waitOn: function(){
    return Meteor.subscribe('userData');
  }
});

Router.onBeforeAction('loading');
Router.map(function() {
  this.route('homePage', {path: '/'});

  this.route('hardwarePage', {
    path: '/hardware',
    onBeforeAction: function() {
      if (checkUser()) {
        if (Meteor.isClient) {
          Meteor.subscribe('hardware');
          this.next();
        }
      }
    }
  });

  this.route('hardwareDetails', {
    path: '/hardware_details/:_id',
    data: function() { return Hardware.findOne(new Meteor.Collection.ObjectID(this.params._id)); },
    onBeforeAction: function() {
      if (checkUser()) {
        if (Meteor.isClient) {
          Meteor.subscribe('hardware');
          Session.set('selected_hardware', this.params._id);
          this.next();
        }
      }
    },
  });

  this.route('sitePage', {
    path: '/site',
    onBeforeAction: function() {
      if (checkUser()) {
        if (Meteor.isClient) {
          Meteor.subscribe('sites');
          this.next();
        }
      }
    },
  });

  this.route('siteDetails', {
    path: '/site_details/:_id', 
    data: function() { 
      return Sites.findOne(new Meteor.Collection.ObjectID(this.params._id)); 
    },
    onBeforeAction: function() {
      if (checkUser()) {
        if (Meteor.isClient) {
          Meteor.subscribe('sites');
          this.next();
        }
      }
    },
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
    onBeforeAction: function() {
      if (checkUser()) {
        if (Meteor.isClient) {
          Meteor.subscribe('nodes');
          Meteor.subscribe('edges');
          this.next();
        }
      }
    },
  });

  this.route('nodeDetails', {
    path: '/node_details/:_id',
    data: function() { 
      return Nodes.findOne(new Meteor.Collection.ObjectID(this.params._id)); 
    },
    onBeforeAction: function() {
      if (checkUser()) {
        if (Meteor.isClient) {
          Meteor.subscribe('nodeData', this.params._id);
          Meteor.subscribe('edges');
          this.next();
        }
      }
    },
  });

  this.route('billingExport', {
    path: '/billing_export',
    onBeforeAction: function() {
      if (checkUser()) {
        this.next();
      }
    }
  });

  this.route('emailsPage', {
    path: '/emails_page',
    onBeforeAction: function() {
      if (checkUser()) {
        if (Meteor.isClient) {
          Meteor.subscribe('subscribersOverview');
          this.next();
        }
      }
    }
  });

  this.route('subscriberPage', {
    path: '/subscriber',
    onBeforeAction: function() {
      if (checkUser()) {
        Meteor.subscribe('contacts');
        Meteor.subscribe('hardware');
        Meteor.subscribe('sites');
        this.next();
      }
    },
  });

  this.route('subscriberDetails', {
    path: '/subscriber_details/:_id',
    onBeforeAction: function() {
      if (checkUser()) {
        if (Meteor.isClient) {
          Meteor.subscribe('subscriberData', this.params._id);
          Meteor.subscribe('contacts');
          Meteor.subscribe('hardware');
          Meteor.subscribe('sites');
          Session.set('selected_subscriber', this.params._id);
          this.next();
        }
      }
    },
    data: function() { 
      return Subscribers.findOne(new Meteor.Collection.ObjectID(this.params._id)); 
    },
  });
});
