var checkAdmin = function(pause) {
  if (!Meteor.user() || !Meteor.user().services.google || typeof Meteor.user().services.google.email !== "string" || 
      (Meteor.user().services.google.email.indexOf("@furtherreach.net") == -1 && 
       Meteor.user().services.google.email.indexOf("@denovogroup.org") == -1)) {
    this.render('login');
    pause();
  }
};

Router.onBeforeAction('loading');
Router.map(function() {

  this.route('payments', {
    path: '/payments/:_authToken',
    onBeforeAction: checkAdmin,
    action: function() {
      var thisRoute = this;
      Session.set('authToken', thisRoute.params._authToken);
      thisRoute.render('payments');
    }
  });

  this.route('customer_agreement', {
    path: 'customer_agreement/:_authToken',
    onBeforeAction: checkAdmin,
    action: function() {
      var thisRoute = this;
      Session.set('authToken', thisRoute.params._authToken);
      thisRoute.render('customer_agreement');
    }
  });

  this.route('customer_dashboard', {
    path: '/:_authToken',
    onBeforeAction: checkAdmin,
    action: function() {
      var thisRoute = this;
      Session.set('authToken', thisRoute.params._authToken);
      thisRoute.render('customer_dashboard');
    }
  });

});
