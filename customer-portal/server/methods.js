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
    var sub = Subscribers.findOne(subId); // TODO: Add selector for not certain fields
    var stripe = Meteor.npmRequire('stripe')(Meteor.settings.stripe.privateKey);

    if (!turnOn) {
      // If we've already setup the billing_info.autopay object
      if (typeof sub.billing_info.autopay === 'object') {
        Subscribers.update(sub._id, {$set: {'billing_info.autopay.on': false }});
      } else {
        Subscribers.update(sub._id, {$set: {'billing_info.autopay': {on: false} }});
      }
    } else {

      // Make our call to stripe syncronous
      var result = Async.runSync(function(done) {
        stripe.customer.create({
          card: configObj.token,
          email: configObj.email,
          description: 'Further Reach Autopay for ' + sub.first_name + ' ' + sub.last_name,
          email: sub.prior_email,
        }, function(err, charge) {
          done(err, charge);
        });
      });

      console.log(result);

    }
    return sub.billing_info.autopay;
  },

  autoPayConfig: function (token) {
    var subId = new Meteor.Collection.ObjectID(authenticate(token));
    var sub = Subscribers.findOne(subId); // TODO: Add selector for not certain fields

    return sub.billing_info.autopay;
  },

  getSubscriber: function (token) {
    var subId = new Meteor.Collection.ObjectID(authenticate(token));
    var sub = Subscribers.findOne(subId); // TODO: Add selector for not certain fields
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
    var installmentAmount = stripeConfig['installmentAmount'];

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
        };
        Subscribers.update(thisSub._id, {$push: {'billing_info.monthly_payments': monthlyPayment}});
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
