var checkAdmin = function(pause) {
  if (!Meteor.user() || !Meteor.user().services.google || typeof Meteor.user().services.google.email !== "string" || 
      (Meteor.user().services.google.email.indexOf("@furtherreach.net") == -1 && 
       Meteor.user().services.google.email.indexOf("@denovogroup.org") == -1)) {
    this.render('login');
    pause();
  }
};

Router.map(function() {

  this.route('customer_agreement', {
    path: 'customer_agreement/:_authToken',
    action: function() {
      var thisRoute = this;
      Session.set('authToken', thisRoute.params._authToken);
      thisRoute.render('customer_agreement');
    }
  });

  this.route('customer_dashboard', {
    path: '/:_authToken',
    action: function() {
      var thisRoute = this;
      Session.set('authToken', thisRoute.params._authToken);
      thisRoute.render('customer_dashboard');
    }
  });

  this.route('error', {
    path: 'error/:_authToken',
    action: function() {
      var thisRoute = this;
      Session.set('authToken', thisRoute.params._authToken);
      thisRoute.render('error');
    }
  });

  console.log(this);
  this.route('/webhooks/stripe', { where: 'server' })
    .post(function () {
      var request = this.request;
      var eventJson = JSON.parse(request.body);

      var eventId = eventJson.id;

      var stripe = Meteor.npmRequire('stripe')(Meteor.settings.stripe.privateKey);
      var stripeResp;

      // Make our call to stripe syncronous
      stripeResp = Async.runSync(function(done) {
        stripe.events.retrieve(eventId, function(err, event) {
          done(err, event);
        });
      });

      console.log(stripeResp);
      if (stripeResp.err || !stripeResp.result) {
        console.log(stripeResp);
        throw new Meteor.Error("Couldn't retrieve the stripe event.", stripeResp);
      }

      var sEvent = stripeResp.result;

      if (sEvent.object === 'invoice' &&
          sEvent.paid === true) {
        var sub = Subscribers.find({'billing_info.autopay.subscription.id': sEvent.subscription});
        var totalPaid = sEvent.total / 100; // stripe does cents

        var requiredPayments = FRMethods.calculatePayments();
        var chargeStart = requiredPayments.dueToDate.startDate;
        var chargeEnd = requiredPayments.dueToDate.endDate;

        stripeResp = Async.runSync(function(done) {
          stripe.charges.retrieve(sEvent.charge, function(err, charge) {
            done(err, charge);
          });
        });
 
        console.log(stripeResp);
        if (stripeResp.err || !stripeResp.result) {
          console.log(stripeResp);
          throw new Meteor.Error("Couldn't retrieve the stripe charge.", stripeResp);
        }

        var charge = stripeResp.result;

        if (requiredPayments.dueToDate.amount === total) {

          var monthlyPayment = {
            amount: totalPaid,
            start_date: chargeStart,
            end_date: chargeEnd,
            charge: charge
          };
          Subscribers.update(thisSub._id, {$push: {'billing_info.monthly_payments': monthlyPayment}});
        }
      }

      var response = this.response;
      response.send(200);
    })
});
