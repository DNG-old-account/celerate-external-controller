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
    console.log(err);
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
    var installmentAmount = FRSettings.billing.installmentAmount;

    if (!result.error && !result.result.err) {
      console.log('types of charges');
      console.log(typesOfCharges);
      if (_.contains(typesOfCharges, 'installation')) {
        console.log('installation payment');
        Subscribers.update(thisSub._id, {$set: {'billing_info.installation.paid': true }});
      }
      if (_.contains(typesOfCharges, 'installment')) {
        console.log('installment payment');
        var installmentPayment = {
          amount: installmentAmount,
          charge_date: moment().tz('America/Los_Angeles').toISOString()
        }
        Subscribers.update(thisSub._id, {$set: {'billing_info.installation.installments': true }});
        Subscribers.update(thisSub._id, {$push: {'billing_info.installation.installment_payments': installmentPayment }});

        thisSub = Subscribers.findOne(thisSub._id);
        console.log('This Sub');
        console.log(thisSub);

        console.log(thisSub.billing_info.installation.installment_payments);

        var totalPaid = _.reduce(thisSub.billing_info.installation.installment_payments, function(sum, payment) {
          return sum + parseFloat(payment.amount);
        }, 0);

        console.log("total paid = ");
        console.log(totalPaid);

        console.log("standard installation = ");
        console.log(parseFloat(thisSub.billing_info.installation.standard_installation));


        if (totalPaid >= parseFloat(thisSub.billing_info.installation.standard_installation)) {
          console.log('totalPaid is really >= standard_isntallation???');
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

  requiredPayments: function(token) {
    var result = {};
    var subId = new Meteor.Collection.ObjectID(authenticate(token));
    var sub = Subscribers.findOne(subId);

    // If a subscriber doesn't have billing info yet, we can just create it here
    // TODO: this should really be code that's shared with controller - we don't want
    // to have to change this in both places!!
    // We can use a package for this!
    if (typeof sub.billing_info !== 'object') {
      // Create default billing info
      var billing = {
        installation: {
          standard_installation: '150',
          additional_equipment: [],
          additional_labor: [],
          paid: false,
          installments: false
        },
        charges: [],
        monthly_payments: []
      };
      db_update = {};
      db_update['billing_info'] = billing;
      Subscribers.update(this._id, {$set: db_update}); 
    }

    result.monthlyPayments = [];
    //TODO: In order to test appropriately I've 
    //      set it up to start billing a few weeks early of the next month
    var startOfThisMonth = moment().tz('America/Los_Angeles').add(10, 'days').startOf('month'); 
    result.required = false;

    if (sub.status === 'connected' && 
        moment(sub.activation_date).isValid() &&
        typeof sub.plan === 'string') {

      var activationDate = moment.tz(sub.activation_date, 'America/Los_Angeles');
      var dateCursor = moment(startOfThisMonth);
      var firstDayOfBilling = moment.tz(FRSettings.billing.firstDayOfBilling, 'America/Los_Angeles');

      if (activationDate.isAfter(firstDayOfBilling) || 
          activationDate.isSame(firstDayOfBilling, 'day')) {
        var firstMonthEver = moment(activationDate).startOf('month');
      } else {
        var firstMonthEver = moment(firstDayOfBilling);
      }

      while (dateCursor.isAfter(firstMonthEver) && !dateCursor.isSame(firstMonthEver, 'day')) {

        var monthlyPayment = {};
        monthlyPayment.required = true;
        monthlyPayment.startDate = moment(dateCursor).subtract(1, 'months');
        monthlyPayment.endDate = moment(dateCursor).subtract(1, 'days');
        if (monthlyPayment.startDate.isBefore(activationDate)) {
          monthlyPayment.startDate = moment(activationDate);
        }

        if (typeof sub.billing_info.monthly_payments === 'object') {
          _.each(sub.billing_info.monthly_payments, function(payment) {
            if (moment(payment.startDate).isValid() && 
                monthlyPayment.startDate.isSame(moment(payment.start_date), 'day')) {
              monthlyPayment.required = false;
              monthlyPayment.startDate = moment(payment.start_date).tz('America/Los_Angeles');
              monthlyPayment.endDate = moment(payment.end_date).tz('America/Los_Angeles');
            }
          });
        }

        if (monthlyPayment.required) {
          var monthlyPaymentAmount = FRSettings.billing.plans[sub.plan].monthly;
          var monthlyPaymentPlan = FRSettings.billing.plans[sub.plan];
          monthlyPayment.plan = FRSettings.billing.plans[sub.plan];

          if (monthlyPayment.startDate.isBefore(activationDate) || monthlyPayment.startDate.isSame(activationDate, 'day')) {
            var startOfMonth = moment(activationDate).startOf('month');
            var diff = Math.abs(startOfMonth.diff(activationDate, 'days'));
            var daysInMonth = startOfMonth.daysInMonth();
            monthlyPayment.amount = (monthlyPaymentAmount * ((daysInMonth - diff) / daysInMonth)).formatMoney();
            monthlyPayment.startDate = moment(activationDate);
          } else {
            monthlyPayment.amount = monthlyPaymentAmount;
          }
        }
        // We have to translate back into Date obj for Meteor client <--> server
        monthlyPayment.startDate = monthlyPayment.startDate.toISOString();
        monthlyPayment.endDate = monthlyPayment.endDate.toISOString();
        result.monthlyPayments.push(monthlyPayment);
        dateCursor.subtract(1, 'months');
      }
    }

    _.each(result.monthlyPayments, function(payment) {
      if (payment.required) {
        result.required = true;
      }
    });

    var dueToDate = {
      startDate: moment().add(10, 'years'),
      endDate: moment().subtract(10, 'years'),
      amount: 0,
      payments: [],
      required: false,
    };

    _.each(result.monthlyPayments, function(payment) {
      if (payment.required) {
        dueToDate.required = true;
        dueToDate.amount += parseFloat(payment.amount);
        dueToDate.payments.push(payment);
        if (moment(dueToDate.startDate).isAfter(moment(payment.startDate))) {
          dueToDate.startDate = moment(payment.startDate).toISOString();
        }
        if (moment(dueToDate.endDate).isBefore(moment(payment.endDate))) {
          dueToDate.endDate = moment(payment.endDate).toISOString();
        }
      }
    });

    result.dueToDate = dueToDate;

    result.installation = sub.billing_info.installation;
    if (result.installation.installments) {
      var totalPaid = _.reduce(result.installation.installment_payments, function(sum, payment) {
        return sum + payment.amount;
      }, 0);
      result.installation.remaining_amount = result.installation.standard_installation - totalPaid;
    }

    if (!result.installation.paid) {
      result.required = true;
    }

    return result;
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
