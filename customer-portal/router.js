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

  this.route('/stripe/webhooks', { where: 'server' })
    .post(function () {
      var request = this.request;
      var eventJson = request.body;

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

      var sObjectWrapper = stripeResp.result;
      if (typeof sObjectWrapper.data !== 'object' || 
          typeof sObjectWrapper.data.object !== 'object') {
        console.log(sObjectWrapper);
        throw new Meteor.Error("Couldn't retrieve the stripe event.", stripeResp);
      }
      var sEvent = sObjectWrapper.data.object;
      console.log(sEvent);

      if (sEvent.object === 'invoice' &&
          sEvent.paid === true) {
        var sub = Subscribers.findOne({'billing_info.autopay.subscription.id': sEvent.subscription});
        var totalPaid = sEvent.total / 100; // stripe does cents

        var requiredPayments = FRMethods.calculatePayments(sub);
        var chargeStart = requiredPayments.dueToDate.startDate;
        var chargeEnd = requiredPayments.dueToDate.endDate;

        if (typeof sEvent.charge === "string") {
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

          if (requiredPayments.dueToDate.amount === totalPaid) {

            charge.description = 'Monthly payment for the period ' + moment(chargeStart).format('MM/DD/YYYY') + ' to ' + moment(chargeEnd).format('MM/DD/YYYY') + '.'

            var monthlyPayment = {
              amount: totalPaid,
              start_date: chargeStart,
              end_date: chargeEnd,
              charge: charge
            };
            Subscribers.update(sub._id, {$push: {'billing_info.monthly_payments': monthlyPayment}});
            Subscribers.update(sub._id, {$push: {'billing_info.charges': charge}});
          }
        }
      }

      var response = this.response;
      response.write('200');
      response.end();
    })
});
