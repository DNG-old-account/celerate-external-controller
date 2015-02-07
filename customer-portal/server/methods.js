// In your server code: define a method that the client can call
var crypto = Npm.require('crypto');

var authenticate = function(short_token) {
  var p = FRMethods.processAuthToken(short_token,
                                     Meteor.settings.serverAuthToken.encryptionKey,
                                     Meteor.settings.serverAuthToken.MACKey);
  if (p.err) {
    console.log(p.err);
    throw new Meteor.Error("invalid-auth-token", p.err);
  }

  // console.log("Got subscriber_id: " + p.subscriber_id);
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
    var hasMore;

    var calcTotalPaymentObj = FRMethods.calcTotalPayment(sub, 0, true);
    var totalPayment = Math.round(calcTotalPaymentObj.total * 100);
    var requiredPayments = calcTotalPaymentObj.requiredPayments;

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
      
      hasMore = true;
      var customers = [];
      var lastCustomer = undefined;
      var stripeRestConfig = {limit: 100};
      // Check to see if a plan already exists with the proper name and amount
      while (hasMore) {
        if (typeof lastCustomer === 'string') {
          stripeRestConfig.starting_after = lastCustomer;
        } 

        stripeResp = Async.runSync(function(done) {
          stripe.customers.list(stripeRestConfig, function(err, result) {
            done(err, result);
          });
        });

        if (stripeResp.err || !stripeResp.result) {
          console.log(stripeResp);
          throw new Meteor.Error("Stripe couldn't list customers", stripeResp);
        }
        if (typeof _.last(stripeResp.result.data) === 'object') {
          lastCustomer = _.last(stripeResp.result.data).id;
          customers = customers.concat(stripeResp.result.data);
        }
        hasMore = stripeResp.result.has_more;
      }

      var thisCustomer = _.find(customers, function(customer) {
        return customer.email === sub.prior_email;
      });

      if (typeof thisCustomer !== 'object') {
        // Create a customer
        stripeResp = Async.runSync(function(done) {
          stripe.customers.create({
            card: configObj.token,
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

        thisCustomer = stripeResp.result;
      } else {
        stripeResp = Async.runSync(function(done) {
          stripe.customers.update(thisCustomer.id, {
            card: configObj.token,
          }, function(err, result) {
            done(err, result);
          });
        });

        if (stripeResp.err || !stripeResp.result) {
          console.log(stripeResp);
          throw new Meteor.Error("Couldn't update Stripe customer", stripeResp);
        }

        thisCustomer = stripeResp.result;
      }

      if (requiredPayments.dueToDate.required && totalPayment > 0) {
        var stripeConfig = {
            name: 'Further Reach',
            allowRememberMe: false,
            email: sub.prior_email,
            description: '',
            requiredPayments: requiredPayments,
            installmentAmount: 0,
            monthlyCharges: requiredPayments.dueToDate.payments
        }
        var billingPeriodEndDate = requiredPayments.dueToDate.endDate;
        var billingPeriodStartDate = requiredPayments.dueToDate.startDate;

        stripeConfig.description += 'Monthly payment for period of ' + 
                        moment(billingPeriodStartDate).format('MM/DD/YYYY') + ' to ' + 
                        moment(billingPeriodEndDate).format('MM/DD/YYYY') + '';
        stripeConfig.billingPeriodStartDate = billingPeriodStartDate;
        stripeConfig.billingPeriodEndDate = billingPeriodEndDate;
 
        var stripeTokenObj = {
          type: 'customer',
          id: thisCustomer.id
        };

        Meteor.call('chargeCard', token, stripeTokenObj, stripeConfig, ["monthly"]);
      }

      hasMore = true;
      var plans = [];
      var lastPlan = undefined;
      stripeRestConfig = {limit: 100};
      // Check to see if a plan already exists with the proper name and amount
      while (hasMore) {
        if (typeof lastPlan === 'string') {
          stripeRestConfig.starting_after = lastPlan;
        }
        stripeResp = Async.runSync(function(done) {
          stripe.plans.list(stripeRestConfig, function(err, result) {
            done(err, result);
          });
        });

        if (stripeResp.err || !stripeResp.result) {
          console.log(stripeResp);
          throw new Meteor.Error("Stripe couldn't list plans", stripeResp);
        }
        if (typeof _.last(stripeResp.result.data) === 'object') {
          lastPlan = _.last(stripeResp.result.data).id;
          plans = plans.concat(stripeResp.result.data);
        }
        hasMore = plans.has_more;
      }

      if (typeof requiredPayments.nextMonthsPayment === 'object') {
        var monthlyPayment = requiredPayments.nextMonthsPayment;
      } else {
        console.log('Couldn\'t find next months payment');
        console.log(requiredPayments);
        throw new Meteor.Error("Couldn't find next months payment", requiredPayments);
      }

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
    if (FRMethods.isNumber(stripeConfig.installmentAmount)) {
      installmentAmount = parseFloat(stripeConfig.installmentAmount);
    }

    var calcTotalPaymentObj = FRMethods.calcTotalPayment(thisSub, installmentAmount, true);
    var totalPayment = Math.round(calcTotalPaymentObj.total * 100);
    var requiredPayments = calcTotalPaymentObj.requiredPayments;

    var chargeObj = {
      amount: totalPayment,
      currency: "usd",
      description: stripeConfig.description,
      receipt_email: stripeConfig.email,
    };

    if (typeof stripeToken === 'object' &&
        typeof stripeToken.type === 'string' &&
        stripeToken.type === 'customer') {

      _.extend(chargeObj, {
        customer: stripeToken.id
      });
    } else {
      _.extend(chargeObj, {
        card: stripeToken.id,
      });
    }

    // Make our call to stripe syncronous
    var result = Async.runSync(function(done) {
      stripe.charges.create(chargeObj, function(err, charge) {
        done(err, charge);
      });
    });

    var dollarAmount = Math.round10(totalPayment / 100, 2);

    if (!result.error && !result.result.err) {
      if (_.contains(typesOfCharges, 'installation')) {
        Subscribers.update(thisSub._id, {$set: {'billing_info.installation.paid': true }});
      }
      if (_.contains(typesOfCharges, 'installment')) {
        var installmentPayment = {
          amount: parseFloat(installmentAmount),
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
      if (_.contains(typesOfCharges, 'monthly') && 
          typeof stripeConfig.monthlyCharges === 'object') {

        _.each(stripeConfig.monthlyCharges, function(charge) {
          var monthlyPayment = {
            amount: parseFloat(charge.amount),
            start_date: charge.startDate,
            end_date: charge.endDate,
            charge: result.result
          };
          Subscribers.update(thisSub._id, {$push: {'billing_info.monthly_payments': monthlyPayment}});
        });
      }

      if (typeof requiredPayments.discounts === 'object') {
        _.each(requiredPayments.discounts, function(discount) {
          if (discount.toBeUsed) {
            var updatedDiscount = _.extend({}, discount);
            delete updatedDiscount.leftover;
            delete updatedDiscount.toBeUsed;

            updatedDiscount.used = true;
            updatedDiscount.dateUsed = new Date();
            updatedDiscount._id = new Meteor.Collection.ObjectID();

            Subscribers.update(thisSub._id, {$pull: {'billing_info.discounts': {'_id': discount._id}}});
            Subscribers.update(thisSub._id, {$push: {'billing_info.discounts': updatedDiscount }});
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

  calculateTotalPayments: function(token, installmentAmount, fastForward) {
    var subId = new Meteor.Collection.ObjectID(authenticate(token));
    var sub = Subscribers.findOne(subId);

    return FRMethods.calcTotalPayment(sub, installmentAmount, false, fastForward);
  },

  requiredPayments: function(token, fastForward) {
    var subId = new Meteor.Collection.ObjectID(authenticate(token));
    var sub = Subscribers.findOne(subId);

    return FRMethods.calculatePayments(sub, fastForward);
  },

  billingInfo: function(token) {
    var subId = new Meteor.Collection.ObjectID(authenticate(token));
    return FRMethods.getBillingInfo(subId);
  },

  planInfo: function(token) {
    var subId = new Meteor.Collection.ObjectID(authenticate(token));
    var sub = Subscribers.findOne(subId);
    var planInfo = FRSettings.billing.plans[sub.plan];
    if (typeof planInfo === 'object') {
      planInfo.accountNum = FRMethods.generateSubscriberAccountId(sub._id._str);
    }
    return planInfo;
  }

});
