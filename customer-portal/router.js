var checkAdmin = function() {
  // client
  Meteor.subscribe("userData");
  if (!Meteor.user() || !Meteor.user().services.google || (Meteor.user().services.google.email.indexOf("denovogroup.org") == -1)) {
    this.render('homePage');
  } else {
    this.next();
  }
};

// Checks a user signup JSON data object and returns true if it is valid.
var validateUserSignup = function(signup_data) {
  // Verify that all fields are strings and that signup_data is an object.
  if (typeof signup_data !== 'object') {
    return false;
  }
  for (k in signup_data) {
    if (typeof signup_data[k] !== 'string') {
      return false;
    }
  }

  return true;   
};

Router.map(function() {
  // Allows for user signups from our website.
  this.route('/user_signup', { where: 'server' }).post(function () {
    var request = this.request;
    var eventJson = request.body;

    console.log("User signup: " + JSON.stringify(eventJson));

    var response = this.response;
    if (!validateUserSignup(eventJson)) {
      response.writeHead(400, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      });
      response.write(JSON.stringify({ 'status': 'Bad form data.' }));
    } else {
      // Insert the user signup into the subscriber collection.
      var new_user = {
        _id: new Meteor.Collection.ObjectID(),
        first_name: eventJson.first_name,
        last_name: eventJson.last_name,
        subscriber_type: eventJson.subscriber_type,
        plan: eventJson.plan,
        city: eventJson.city,
        street_address: eventJson.street_address,
        lat: eventJson.lat,
        lng: eventJson.lng,
        mobile: eventJson.mobile,
        landline: eventJson.landline,
        prior_email: eventJson.prior_email,
        current_provider: eventJson.current_provider,
        relay_site: eventJson.relay_site,
        notes: eventJson.notes,
        how_did_you_hear_of_us: eventJson.how_did_you_hear_of_us,
        terms: { agreed: (eventJson.terms === "true") ? true : false,
                 date: new Date()
        },
        status: "new lead",
        signup_date: (new Date()).toISOString(),
      };

      Subscribers.insert(new_user);

      response.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      });
      response.write(JSON.stringify({ 'status': 'Stored signup data, thanks!' }));
    }

    response.end();
  });
    
  this.route('admin', {
    path: 'admin',
    action: function() {
      var thisRoute = this;
      thisRoute.render('homePage');
    }
  });
  this.route('customer_agreement', {
    path: 'customer_agreement/:_authToken',
    action: function() {
      var thisRoute = this;
      Session.set('authToken', thisRoute.params._authToken);
      thisRoute.render('customer_agreement');
    }
  });

  this.route('customer_dashboard_fast_forward', {
    path: 'fast_forward/:_authToken',
    action: function() {
      var thisRoute = this;
      Session.set('authToken', thisRoute.params._authToken);
      if (typeof thisRoute.params.query.fastForward !== 'undefined') {
        var fastForward = thisRoute.params.query.fastForward;
        if (FRMethods.isNumber(fastForward)) {
          Session.set('fastForward', parseInt(fastForward, 10));
        }
      }
      thisRoute.render('customer_dashboard');
    },
    onBeforeAction: checkAdmin
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
        var sub = Subscribers.findOne({'billing_info.autopay.customer.id': sEvent.customer});
        var totalPaid = sEvent.total; // stripe does cents

        var calcTotalPaymentObj = FRMethods.calcTotalPayment(sub, 0, true);
        var totalPayment = Math.round(calcTotalPaymentObj.total * 100);
        var requiredPayments = calcTotalPaymentObj.requiredPayments;
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

          if (typeof requiredPayments.discounts === 'object') {
            _.each(requiredPayments.discounts, function(discount) {
              if (discount.toBeUsed) {
                var updatedDiscount = _.extend({}, discount);
                delete updatedDiscount.leftover;
                delete updatedDiscount.toBeUsed;

                updatedDiscount.used = true;
                updatedDiscount.dateUsed = new Date();
                updatedDiscount._id = new Meteor.Collection.ObjectID();

                Subscribers.update(sub._id, {$pull: {'billing_info.discounts': {'_id': discount._id}}});
                Subscribers.update(sub._id, {$push: {'billing_info.discounts': updatedDiscount }});
              }
            });
          }

          if (Math.round(requiredPayments.dueToDate.amount * 100) === totalPaid || totalPaid === totalPayment) {

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
