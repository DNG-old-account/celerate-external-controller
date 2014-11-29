// In your server code: define a method that the client can call
var crypto = Npm.require('crypto');

var authenticate = function(mergedToken) {
  // Split the token into a token and a tag.
  var s = mergedToken.split("+");
  if (s.length != 3) {
    throw new Meteor.Error("invalid-auth-token", "Couldn't split merged token into three pieces: " + mergedToken);
  }

  var iv = s[0];
  var token = s[1];
  var tag = s[2];
  var p = FRMethods.processAuthToken(iv, token, tag,
                                     Meteor.settings.serverAuthToken.encryptionKey,
                                     Meteor.settings.serverAuthToken.MACKey);
  if (p.err) {
    console.log(p.err);
    throw new Meteor.Error("invalid-auth-token", p.err);
  }

  return p.subscriber_id;
}

Meteor.methods({
  sendEmail: function (to, from, subject, text) {
    check([to, from, subject, text], [String]);

    // Let other method calls from the same client start running,
    // without waiting for the email sending to complete.
    this.unblock();

    Email.send({
      to: to,
      from: from,
      subject: subject,
      text: text
    });
  },

  setupAutoPay: function (token, turnOn, configObj) {
    var subId = new Meteor.Collection.ObjectID(authenticate(token));
    var sub = Subscribers.findOne(subId); 
    var stripe = Meteor.npmRequire('stripe')(Meteor.settings.stripe.privateKey);

    var paymentsObj = FRMethods.calculatePayments(sub);

    if (!turnOn) {
      if (typeof sub.billing_info.autopay !== 'object') {
        Subscribers.update(sub._id, {$set: {'billing_info.autopay': {} }});
      } 

      sub = Subscribers.findOne(sub._id);
      if (typeof sub.billing_info.autopay.customer === 'object' && 
          typeof sub.billing_info.autopay.subscription === 'object') {
 
        // Cancel subscription
        var stripeResp = Async.runSync(function(done) {
          stripe.customers.cancelSubscription(
            sub.billing_info.autopay.customer.id,
            sub.billing_info.autopay.subscription.id, 
            function(err, result) {
              done(err, result);
            }
          );
        });

        console.log(stripeResp);
        if (stripeResp.err || !stripeResp.result) {
          console.log(stripeResp);
          throw new Meteor.Error("Couldn't cancel the Stripe Subscription.", stripeResp);
        }

        var thisCancellation = stripeResp.result;
        Subscribers.update(sub._id, {$set: {'billing_info.autopay.cancellation': thisCancellation }});
        sub = Subscribers.findOne(sub._id);
      }

      Subscribers.update(sub._id, {$set: {'billing_info.autopay.on': false }});
      sub = Subscribers.findOne(sub._id);

    } else {

      var stripeResp;

      // First check for outstanding payments and pay those
      //
      // TODO:

      // Create a customer
      stripeResp = Async.runSync(function(done) {
        stripe.customers.create({
          card: configObj.token,
          email: configObj.email,
          description: 'Further Reach Autopay for ' + sub.first_name + ' ' + sub.last_name,
          email: sub.prior_email,
        }, function(err, result) {
          done(err, result);
        });
      });

      if (stripeResp.err || !stripeResp.result) {
        console.log(stripeResp);
        throw new Meteor.Error("Couldn't create new Stripe customer", stripeResp);
      }

      var thisCustomer = stripeResp.result;
      var hasMore = true;
      var plans = [];

      // Check to see if a plan already exists with the proper name and amount
      while (hasMore) {
        stripeResp = Async.runSync(function(done) {
          stripe.plans.list(function(err, result) {
            done(err, result);
          });
        });

        if (stripeResp.err || !stripeResp.result) {
          console.log(stripeResp);
          throw new Meteor.Error("Stripe couldn't list plans", stripeResp);
        }
        plans = plans.concat(stripeResp.result.data);
        hasMore = plans.has_more;
      }

      console.log(paymentsObj);
      console.log(plans);
      var monthlyPayment = _.last(paymentsObj.monthlyPayments);
      console.log(monthlyPayment);
      var planName = sub.plan + '-' + (monthlyPayment.amount * 100);
      var myPlan = _.find(plans, function(plan) {
        return planName === plan.id && plan.amount === monthlyPayment.amount * 100;
      });

      // If there isn't already a plan for this sub we gotta create one!
      if (typeof myPlan !== 'object') {
        stripeResp = Async.runSync(function(done) {
          stripe.plans.create({
            id: planName,
            amount: monthlyPayment.amount * 100,
            currency: 'usd',
            interval: 'month',
            name: FRSettings.billing.plans[sub.plan].label,
            statement_description: 'FR Monthly',
          }, function(err, result) {
            done(err, result);
          });
        });
        console.log(stripeResp);
        if (stripeResp.err || !stripeResp.result) {
          console.log(stripeResp);
          throw new Meteor.Error("Stripe couldn't create plan", stripeResp);
        }
        myPlan = stripeResp.result;
      }

      var startOfNextMonth = moment().tz('America/Los_Angeles').endOf('month').add(1, 'days');

      // Now create subscription for customer to plan
      stripeResp = Async.runSync(function(done) {
        stripe.customers.createSubscription(thisCustomer.id, {
          plan: myPlan.id,
          trial_end: startOfNextMonth.unix(), // This will start autopay at the beginning of next month
        }, function(err, result) {
          done(err, result);
        });
      });
      
      console.log(stripeResp);
      if (stripeResp.err || !stripeResp.result) {
        console.log(stripeResp);
        throw new Meteor.Error("Stripe couldn't create new subscription for customer", stripeResp);
      }
      var thisSubscription = stripeResp.result;

      // Now we've ostensibly setup autopay for the customer - let's update the collection
      if (typeof sub.billing_info.autopay !== 'object') {
        Subscribers.update(sub._id, {$set: {'billing_info.autopay': {on: true} }});
      }
      Subscribers.update(sub._id, {$set: {'billing_info.autopay.on': true }});
      Subscribers.update(sub._id, {$set: {'billing_info.autopay.plan': myPlan }});
      Subscribers.update(sub._id, {$set: {'billing_info.autopay.customer': thisCustomer }});
      Subscribers.update(sub._id, {$set: {'billing_info.autopay.subscription': thisSubscription }});
    }

    sub = Subscribers.findOne(sub._id);
    return sub.billing_info.autopay;
  },

  autoPayConfig: function (token) {
    // TODO: Fill this out!
    var subId = new Meteor.Collection.ObjectID(authenticate(token));
    var sub = Subscribers.findOne(subId); 

    // TODO: Fill this out!
    return sub.billing_info.autopay || sub.billing_info || sub;
  },

  getSubscriber: function (token) {
    var subId = new Meteor.Collection.ObjectID(authenticate(token));
    var sub = Subscribers.findOne(subId);
    sub.contactInfo = [];
    if (typeof sub.contacts === 'object') {
      _.each(sub.contacts, function(c) {
        contactObj = Contacts.findOne(c.contact_id);
        contactObj.type = c.type;
        sub.contactInfo.push(contactObj);
      });
    }

    return sub;
  },

  chargeCard: function(token, stripeToken, stripeConfig, typesOfCharges) {
    var stripe = Meteor.npmRequire('stripe')(Meteor.settings.stripe.privateKey);
    var subId = new Meteor.Collection.ObjectID(authenticate(token));
    var thisSub = Subscribers.findOne(subId);

    // Check to make sure that our totals are accurate
    var installmentAmount;
    if (_.contains(typesOfCharges, 'installment') && FRMethods.isNumber(stripeConfig.installmentAmount)) {
      installmentAmount = parseFloat(stripeConfig.installmentAmount);
    }
    var requiredPayments = FRMethods.calculatePayments(thisSub);
    var totalPayment = FRMethods.calcTotalPayment(thisSub, installmentAmount);

    console.log('stripeConfig = ');
    console.log(stripeConfig);
    if (totalPayment * 100 !== stripeConfig.amount) {
      throw { 
        name:        "Stripe Charge Error", 
        message:     "Stripe Charge is going to not equal our calculated total payment.", 
        toString:    function(){return this.name + ": " + this.message;} 
      }; 
    }

    // Make our call to stripe syncronous
    var result = Async.runSync(function(done) {
      stripe.charges.create({
        amount: stripeConfig.amount,
        currency: "usd",
        card: stripeToken.id,
        description: stripeConfig.description,
        receipt_email: stripeConfig.email,
      }, function(err, charge) {
        done(err, charge);
      });
    });

    console.log(result);
    var dollarAmount = stripeConfig.amount / 100;

    if (!result.error && !result.result.err) {
      if (_.contains(typesOfCharges, 'installation')) {
        Subscribers.update(thisSub._id, {$set: {'billing_info.installation.paid': true }});
      }
      if (_.contains(typesOfCharges, 'installment')) {
        var installmentPayment = {
          amount: installmentAmount,
          charge_date: moment().tz('America/Los_Angeles').toISOString()
        }
        Subscribers.update(thisSub._id, {$set: {'billing_info.installation.installments': true }});
        Subscribers.update(thisSub._id, {$push: {'billing_info.installation.installment_payments': installmentPayment }});

        thisSub = Subscribers.findOne(thisSub._id);

        var totalPaid = _.reduce(thisSub.billing_info.installation.installment_payments, function(sum, payment) {
          return sum + parseFloat(payment.amount);
        }, 0);

        if (totalPaid >= parseFloat(thisSub.billing_info.installation.standard_installation)) {
          Subscribers.update(thisSub._id, {$set: {'billing_info.installation.paid': true }});
        }
      } 
      if (_.contains(typesOfCharges, 'monthly')) {
        var monthlyPayment = {
          amount: dollarAmount,
          start_date: stripeConfig.billingPeriodStartDate,
          end_date: stripeConfig.billingPeriodEndDate,
          charge: result.result
        };
        Subscribers.update(thisSub._id, {$push: {'billing_info.monthly_payments': monthlyPayment}});
      }
      
      console.log(requiredPayments);
      if (typeof requiredPayments.discounts === 'object') {
        console.log(requiredPayments.discounts);
        _.each(requiredPayments.discounts, function(discount) {
          if (discount.toBeUsed) {
            // If there is leftover amount on this discount, create a copy of this one with 
            // the remaining amount and a note
            if (discount.leftover !== 0) {
              var newDiscount = _.extend({}, discount);
              newDiscount.amount = discount.leftover;
              delete newDiscount.lefover;
              delete newDiscount.toBeUsed;
              newDiscount.notes = 'Leftover from ' + new Date() + '. ' + newDiscount.notes;

              Subscribers.update(thisSub._id, {$push: {'billing_info.discounts': newDiscount }});
            } 

            discount.used = true;
            discount.dateUsed = new Date();

            Subscribers.update(thisSub._id, {$pull: {'billing_info.discounts': {'dateCreated': discount.dateCreated}}});
            Subscribers.update(thisSub._id, {$push: {'billing_info.discounts': discount }});
          }
        });
      }

      Subscribers.update(thisSub._id, {$push: {'billing_info.charges': result.result}});
    }
    return result;

  },

  agreeToTerms: function(token) {
    var subId = new Meteor.Collection.ObjectID(authenticate(token));
    var sub = Subscribers.findOne(subId);
    dbUpdate = {};
    dbUpdate.terms = {
      agreed: true,
      date: new Date()
    };
    Subscribers.update(sub._id, {$set: dbUpdate}); 
    return sub;
  },

  requiredPayments: function(token) {
    var dbUpdate;
    var subId = new Meteor.Collection.ObjectID(authenticate(token));
    var sub = Subscribers.findOne(subId);

    return FRMethods.calculatePayments(sub);
  },

  billingInfo: function(token) {
    var subId = new Meteor.Collection.ObjectID(authenticate(token));
    var sub = Subscribers.findOne(subId);
    var hasBillingContact = false;
    var contact;
    if (typeof sub.contacts === 'object') {
      _.each(sub.contacts, function(c) {
        if (c.type === "billing") {
          hasBillingContact = true;
          contact = Contacts.findOne(c.contact_id);
        }
      });
    }

    if (!hasBillingContact) {
      contact = {
        first_name: sub.first_name || '',
        last_name: sub.last_name || '',
        street_address: sub.street_address || '',
        city: sub.city || '',
        state: sub.state || '',
        zip_code: sub.zip_code || '',
        email: sub.prior_email || ''
      }
    }

    var billingDetails = sub.billing_info; 
    return {
      contact: contact,
      billingDetails: billingDetails
    }
  },

  planInfo: function(token) {
    var plans = FRSettings.billing.plans;
    return plans;
  }
});
