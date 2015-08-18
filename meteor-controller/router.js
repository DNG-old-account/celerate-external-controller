var checkUser = function (thisRouter) {
  if (!Meteor.user() || !Meteor.user().services.google || (Meteor.user().services.google.email.indexOf("denovogroup.org") == -1)) {
    thisRouter.render('homePage');
  } else {
    return true;
  }
};

if (Meteor.isClient) {
  Tracker.autorun(function() {
    //Update the cookie whenever they log in or out
    Cookie.set("meteor_user_id", Meteor.userId());
    Cookie.set("meteor_token", localStorage.getItem("Meteor.loginToken"));
  });
}

var checkUserServer = function (request, response) {
  //Check the values in the cookies
  var cookies = new Cookies( request ),
      userId = cookies.get("meteor_user_id") || "",
      token = cookies.get("meteor_token") || "";

  //Check a valid user with this token exists
  var user = Meteor.users.findOne({
    _id: userId,
      'services.resume.loginTokens.hashedToken' : Accounts._hashLoginToken(token)
  });

  if (!user || !user.services.google || (user.services.google.email.indexOf("denovogroup.org") == -1)) {
    return false;
  }
  return true;
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
      if (checkUser(this)) {
        if (Meteor.isClient) {
          Meteor.subscribe('hardware');
          this.next();
        }
      }
    },
    fastRender: true
  });

  this.route('hardwareDetails', {
    path: '/hardware_details/:_id',
    data: function() { return Hardware.findOne(new Meteor.Collection.ObjectID(this.params._id)); },
    onBeforeAction: function() {
      if (checkUser(this)) {
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
      if (checkUser(this)) {
        if (Meteor.isClient) {
          Meteor.subscribe('sites');
          this.next();
        }
      }
    },
    fastRender: true
  });

  this.route('siteDetails', {
    path: '/site_details/:_id', 
    data: function() { 
      return Sites.findOne(new Meteor.Collection.ObjectID(this.params._id)); 
    },
    onBeforeAction: function() {
      if (checkUser(this)) {
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
      if (checkUser(this)) {
        if (Meteor.isClient) {
          Meteor.subscribe('nodes');
          Meteor.subscribe('edges');
          this.next();
        }
      }
    },
    fastRender: true
  });

  this.route('nodeDetails', {
    path: '/node_details/:_id',
    data: function() { 
      return Nodes.findOne(new Meteor.Collection.ObjectID(this.params._id)); 
    },
    onBeforeAction: function() {
      if (checkUser(this)) {
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
      if (checkUser(this)) {
        this.next();
      }
    },
    fastRender: true
  });

  this.route('billingExportCsv', {
    where: 'server',
    path: '/billing_export_csv',
    action: function() {
      if (checkUserServer(this.request, this.response)) { 
        this.response.writeHead(200, {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'Content-type: text/csv',
          'Content-Disposition': 'attachment;filename=billing_export.csv'
        });
        var billingCsv = Meteor.call('getBillingCsv');
        this.response.write(billingCsv);
      } else {
        this.response.end("Not allowed");
      }
    }
  });

  this.route('emailsPage', {
    path: '/emails_page',
    onBeforeAction: function() {
      if (checkUser(this)) {
        if (Meteor.isClient) {
          Meteor.subscribe('contacts');
          Meteor.subscribe('subscribersOverview');
          this.next();
        }
      }
    },
    fastRender: true
  });

  this.route('subscriberPage', {
    path: '/subscriber',
    onBeforeAction: function() {
      if (checkUser(this)) {
        Meteor.subscribe('contacts');
        Meteor.subscribe('hardware');
        Meteor.subscribe('sites');
        this.next();
      }
    },
    fastRender: true
  });

  this.route('subscriberDetails', {
    path: '/subscriber_details/:_id',
    onBeforeAction: function() {
      if (checkUser(this)) {
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
