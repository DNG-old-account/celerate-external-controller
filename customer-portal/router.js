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

  this.route('admin_login', {
    path: '/admin/customer/:_id',
    template: 'customer_dashboard',
    onBeforeAction: checkAdmin,
    onAfterAction: function() {
      console.log('impersonating');
      var userId = this.params._id;
      Meteor.call('impersonate', userId, function(error, result) {
        if(!error) {
          Meteor.connection.setUserId(userId);
          Router.go('customer_dashboard');
        }
      });
    }
  });

  this.route('customer_dashboard', {
    path: '/:_hash',
    onBeforeAction: checkAdmin,
    action: function() {
      var thisRoute = this;
      Session.set('authToken', thisRoute.params._hash);
      thisRoute.render('customer_dashboard');
    }
  });

});
