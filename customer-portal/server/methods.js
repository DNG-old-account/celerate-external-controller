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

    if (!turnOn) {
      // If we've already setup the billing_info.autopay object
      if (typeof sub.billing_info.autopay === 'object') {
        Subscribers.update(sub._id, {$set: {'billing_info.autopay.on': false }});
      } else {
        Subscribers.update(sub._id, {$set: {'billing_info.autopay': {on: false} }});
      }
    } else {

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
    var result = {};
    var dbUpdate;
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
      dbUpdate = {};
      dbUpdate['billing_info'] = billing;
      Subscribers.update(sub._id, {$set: dbUpdate}); 
    }

    result.monthlyPayments = [];
    result.required = false;

    // Will show users the billing info one day before the 1st of the month
    var startOfThisMonth = moment().tz('America/Los_Angeles').add(1, 'days').startOf('month'); 
    var activationDate;

    if (sub.status === 'connected' && 
        moment(sub.activation_date).isValid()) {

      // Want to mark any user connected before the beta period end as paid
      var endOfBetaInstallation = moment.tz(FRSettings.billing.endOfBetaInstallation, 'America/Los_Angeles');
      activationDate = moment.tz(sub.activation_date, 'America/Los_Angeles');
      if (activationDate.isBefore(endOfBetaInstallation) || activationDate.isSame(endOfBetaInstallation, 'day')) {
        Subscribers.update(sub._id, {$set: {'billing_info.installation.paid': true}});
      }

      // Calculate monthly payments
      if (typeof sub.plan === 'string') {

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
            // Check for and apply discount
            if (typeof sub.discount === 'string' && 
                typeof FRSettings.billing.discounts[sub.discount] === 'function') {
              var newAmount = FRSettings.billing.discounts[sub.discount](monthlyPayment.amount);
              monthlyPayment.discount = {
                label: sub.discount,
                previousAmount: monthlyPayment.amount,
                amount: monthlyPayment.amount - newAmount
              };
              monthlyPayment.amount = newAmount;
            }
          }
          // We have to translate back into Date obj for Meteor client <--> server
          monthlyPayment.startDate = monthlyPayment.startDate.toISOString();
          monthlyPayment.endDate = monthlyPayment.endDate.toISOString();
          result.monthlyPayments.push(monthlyPayment);
          dateCursor.subtract(1, 'months');
        }
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
    result.installation.standard_installation = Math.round10(parseFloat(result.installation.standard_installation), -2);

    result.installation.totalInstallationAmount = parseFloat(result.installation.standard_installation);
    result.installation.showAdditionalLabor = false;
    result.installation.showAdditionalEquipment = false;
    result.installation.taxable = false;

    if (typeof result.installation.additional_equipment === 'object' &&
        typeof result.installation.additional_equipment.length === 'number' &&
        result.installation.additional_equipment.length > 0) {

      result.installation.showAdditionalEquipment = true;
      result.installation.taxable = true;
      result.installation.taxableAmount = 0;
      result.installation.totalTax = 0;

      _.each(result.installation.additional_equipment, function(equipment) {
        // If any piece of hardware has a different tax % than another piece of hardware, we should throw an error
        if (FRMethods.isNumber(result.installation.taxPercent) && 
            result.installation.taxPercent !== parseFloat(equipment.hardwareObj.tax)) {

          throw "Hardware tax amounts aren't the same!";
        }
        result.installation.taxPercent = parseFloat(equipment.hardwareObj.tax);
        equipment.hardwareObj.taxCost = Math.round10((parseFloat(equipment.hardwareObj.tax) / 100) * parseFloat(equipment.hardwareObj.price), -2);
        result.installation.totalInstallationAmount += equipment.hardwareObj.taxCost + parseFloat(equipment.hardwareObj.price);
        result.installation.taxableAmount += parseFloat(equipment.hardwareObj.price);
        result.installation.totalTax += equipment.hardwareObj.taxCost;
      });
    }

    if (FRMethods.isNumber(result.installation.additional_labor) && 
        result.installation.additional_labor > 0) {

      result.installation.showAdditionalLabor = true;
      result.installation.additionalLaborCost = Math.round10(result.installation.additional_labor * FRSettings.billing.additionalHourCost, -2);
      result.installation.totalInstallationAmount += FRSettings.billing.additionalHourCost * parseFloat(result.installation.additional_labor);
      result.installation.additionalLaborHourCost = FRSettings.billing.additionalHourCost;
    }

    if (result.installation.installments) {
      result.installation.totalPaid = _.reduce(result.installation.installment_payments, function(sum, payment) {
        return sum + payment.amount;
      }, 0);
      result.installation.remaining_amount = Math.round10(result.installation.totalInstallationAmount - result.installation.totalPaid, -2);
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
