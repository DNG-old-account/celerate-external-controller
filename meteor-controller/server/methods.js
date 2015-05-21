// In your server code: define a method that the client can call

var sendEmail = function (to, from, subject, text, tries, bcc) {
  var numTries = FRSettings.email.retries;
  tries = (typeof tries !== 'undefined') ? tries : 0;

  check([to, from, subject, text], [String]);

  var emailConfig = {
    to: to,
    from: from,
    subject: subject,
    text: text
  };

  if (typeof bcc !== 'undefined') {
    emailConfig.bcc = bcc;
  }
 

  try {
    Email.send(emailConfig);
    console.log('Sent email to: ' + to);
  } catch (e) {
    console.log('Error sending email to: ' + to);
    console.log('From: ' + from);
    console.log('Subject: ' + subject);
    console.log('Text: ' + text);
    console.log(e);
    if (tries < numTries) {
      tries++;
      // Wait 2 min before attempting to send this email again 
      // because this is async, there will potentially be a 
      // large batch that will all fire in 2 min. 
      // Which could mean that some end up failling again, but as long as
      // the numTries is sufficiently large (probably around 1 for every 50 emails or so)
      // then there won't be a problem
      // TODO: better solution
      Meteor.setTimeout(function() {
        sendEmail(to, from, subject, text, tries, bcc);
      }, 120000); 
    } else {
      var errorSubject = 'Error Sending Email to: ' + to;
      Email.send({
        to: FRSettings.email.notificationEmails,
        from: from,
        subject: errorSubject,
        text: text
      });
    }
  }
};

var getEmail = function(sub) {
  var emailAddress;
  if (typeof sub.prior_email === 'string' &&
      FRMethods.isValidEmail(sub.prior_email)) {
    emailAddress = sub.prior_email
  } else {
    if (typeof sub.contacts === 'object') {
      _.each(sub.contacts, function(c) {
        if (c.type === 'billing') {
          contactObj = Contacts.findOne(c.contact_id);
          if (typeof contactObj.email === 'string' &&
              contactObj.email.trim() !== '' &&
              FRMethods.isValidEmail(contactObj.email)) {

            emailAddress = contactObj.email;
          }
        }
      });
    }
  }
  if (FRMethods.isValidEmail(emailAddress)) {
    return emailAddress;
  } else {
    console.log("No valid email address for subscriber: ");
    console.log(sub);
    throw new Meteor.Error("No valid email address for subscriber: ", sub);
  }
}

Meteor.methods({
  generateAuthToken: function (subscriber_id) {
    var result = FRMethods.generateAuthToken(subscriber_id,
                                             Meteor.settings.serverAuthToken.encryptionKey,
                                             Meteor.settings.serverAuthToken.MACKey);
    return result;
  },

  getPictures: function(site) {
    if (typeof site.pictures !== 'object') {
      return;
    } 
    var results = [];

    _.each(site.pictures, function(pictureObj) {
      results.push({
        url: Meteor.call('getS3Url', pictureObj.key),
        label: pictureObj.label,
        key: pictureObj.key
      });
    });

    return results;
  },

  getS3Url: function(key) {
    var params = {
      Bucket: 'celerate-external-controller-uploads', 
      Key: key, 
      Expires: 600
    };
    var url = s3.getSignedUrl('getObject', params);
    return url;
  },

  signS3Upload: function(file, key) {
    var params = {
      Bucket: 'celerate-external-controller-uploads',
      Key: key,
      Expires: 600, // 10 min
      ContentType: file.type,
      ACL: 'private'
    };

    signedUrl = s3.getSignedUrl('putObject', params);

    return signedUrl;
  },

  sendEmails: function(subscribers, emailKey) {

    // Let other method calls from the same client start running,
    // without waiting for the email sending to complete.
    this.unblock();
    var emailObj = FREmails[emailKey];

    _.each(subscribers, function(subId) {
      var subIdObj = new Meteor.Collection.ObjectID(subId);
      var sub = Subscribers.findOne(subIdObj);

      var authToken = Meteor.call('generateAuthToken', subId);
      var userLink = Meteor.settings.public.urls.customerPortal + authToken;
      var subject = emailObj.subject(sub);
      var accountId = FRMethods.generateSubscriberAccountId(subId);

      sub.email = getEmail(sub);

      var startOfThisMonth = moment().add(1, 'days').startOf('month'); 
      var billingDate = (startOfThisMonth.month() + 1) + '/15/' + startOfThisMonth.year();

      sub.billingDate = billingDate;

      var body = emailObj.body(sub, userLink, accountId); 

      sendEmail(sub.email, emailObj.from, subject, body);
      
    });
    return true;
  },

  notifyRemoveHold: function(subId) {
    var sub = Subscribers.findOne(subId);

    // Let other method calls from the same client start running,
    // without waiting for the email sending to complete.
    this.unblock();

    var emailObj = FREmails.notifyRemoveHold;
    var authToken = Meteor.call('generateAuthToken', sub._id._str);
    var userLink = Meteor.settings.public.urls.customerPortal + authToken;
    var accountId = FRMethods.generateSubscriberAccountId(sub._id._str);

    sub.email = getEmail(sub);

    var body = emailObj.body(sub, userLink, accountId); 
    var subject = emailObj.subject(sub);
    sendEmail(sub.email, emailObj.from, subject, body, 0, FRSettings.email.notificationEmails);

    return true;
  },

  notifyHold: function(subId) {
    var sub = Subscribers.findOne(subId);

    // Let other method calls from the same client start running,
    // without waiting for the email sending to complete.
    this.unblock();

    var emailObj = FREmails.notifyHold;
    var authToken = Meteor.call('generateAuthToken', sub._id._str);
    var userLink = Meteor.settings.public.urls.customerPortal + authToken;
    var accountId = FRMethods.generateSubscriberAccountId(sub._id._str);

    sub.email = getEmail(sub);

    var body = emailObj.body(sub, userLink, accountId); 
    var subject = emailObj.subject(sub);
    sendEmail(sub.email, emailObj.from, subject, body, 0, FRSettings.email.notificationEmails);

    return true;
  },

   updateStripeEmail: function(subId, newEmail) {
    var sub = Subscribers.findOne(subId);
    var stripe = Meteor.npmRequire('stripe')(Meteor.settings.stripe.privateKey);
    var stripeResp;

    if (typeof sub.billing_info !== 'object' ||
        typeof sub.billing_info.autopay !== 'object' || 
        typeof sub.billing_info.autopay.customer !== 'object') {

      throw new Meteor.Error("Subscriber missing stripe customer information", stripeResp);
    }

    stripeResp = Async.runSync(function(done) {
      stripe.customers.update(sub.billing_info.autopay.customer.id, {
        email: newEmail
      }, function(err, result) {
        done(err, result);
      });
    });

    if (stripeResp.err || !stripeResp.result) {
      console.log(stripeResp);
      throw new Meteor.Error("Stripe couldn't update email", stripeResp);
    }

    var customer = stripeResp.result;
    Subscribers.update(sub._id, {$set: {'billing_info.autopay.customer': customer }});
    return customer;
  },
      
  autopayPlanChange: function(subId, planChange) {
    var sub = Subscribers.findOne(subId);
    var stripe = Meteor.npmRequire('stripe')(Meteor.settings.stripe.privateKey);
    var stripeResp;

    var calcTotalPaymentObj = FRMethods.calcTotalPayment(sub, 0, true);
    var totalPayment = Math.round(calcTotalPaymentObj.total * 100);
    var requiredPayments = calcTotalPaymentObj.requiredPayments;
 
    var hasMore = true;
    var plans = [];
    var lastPlan = undefined;
    var stripeRestConfig = {limit: 100};

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


    stripeResp = Async.runSync(function(done) {
      stripe.customers.updateSubscription(sub.billing_info.autopay.customer.id, sub.billing_info.autopay.subscription.id, {
        plan: myPlan.id,
        prorate: true,
        trial_end: sub.billing_info.autopay.subscription.trial_end
      }, 
      function(err, result) {
        done(err, result);
      });
    });

    if (stripeResp.err || !stripeResp.result) {
      console.log(stripeResp);
      throw new Meteor.Error("Couldn't change customers plans", stripeResp);
    }

    var subscription = stripeResp.result;
    Subscribers.update(sub._id, {$set: {'billing_info.autopay.subscription': subscription }});
    return subscription;
  },

  discountAutopay: function(subId, discount) {
    var thisSub = Subscribers.findOne(subId);
    var stripe = Meteor.npmRequire('stripe')(Meteor.settings.stripe.privateKey);
    var stripeResp;
 
    // Add stripe "coupon" - amount in cents as always
    stripeResp = Async.runSync(function(done) {
      stripe.coupons.create({
        amount_off: parseInt(discount.amount * 100, 10),
        currency: 'usd',
        duration: 'once',
      }, 
      function(err, result) {
        done(err, result);
      });
    });

    if (stripeResp.err || !stripeResp.result) {
      console.log(stripeResp);
      throw new Meteor.Error("Couldn't create the Stripe Coupon.", stripeResp);
    }

    var coupon = stripeResp.result;

    // Apply stripe "coupon" to actual customer 
    stripeResp = Async.runSync(function(done) {
      stripe.customers.update(thisSub.billing_info.autopay.customer.id, {
        coupon: coupon.id,
      }, 
      function(err, result) {
        done(err, result);
      });
    });

    if (stripeResp.err || !stripeResp.result) {
      console.log(stripeResp);
      throw new Meteor.Error("Couldn't apply coupon to customer", stripeResp);
    }

    return {
      coupon: coupon,
      discount: discount
    }
  },

  getBillingData: function() {
    var result = {};
    var startOfBilling = moment.tz(FRSettings.billing.firstDayOfBilling, 'America/Los_Angeles')
      .startOf('month')
      .add(1, 'days');
    var cursor = moment(startOfBilling);
    var allSubs = Subscribers.find({}).fetch();
    var subsBilling = []
    _.each(allSubs, function(sub) {
      if (sub.status === 'connected' || sub.status === 'disconnected') {
        subsBilling.push({
          sub: sub,
          billing: FRMethods.calculatePayments(sub, 30)
        });
      }
    });

    while (cursor.isBefore(moment.tz())) {
      var monthName = cursor.format('MMM');
      result[monthName] = {
        totalInvoice: 0,
        subscriptions: 0,
        installations: 0,
        equipmentSold: 0,
        tax: {}, // Needs to be by jurisdiction
        totalChanges: {
          totalInvoice: 0,
          subscriptions: 0,
          installations: 0,
          equipmentSold: 0,
          tax: {}, // Needs to be by jurisdiction
        }
      };

      _.each(subsBilling, function(subBillingObj) {
        var sub = subBillingObj.sub;
        var subBilling = subBillingObj.billing;
        _.each(subBilling.monthlyPayments, function(monthlyPayment) {
          if (moment(monthlyPayment.startDate).isBefore(cursor) &&
              moment(monthlyPayment.endDate).isAfter(cursor)) {

            result[monthName].subscriptions += monthlyPayment.amount;
          }
        });

        if (typeof sub.activation_date !== 'undefined' && 
            moment(sub.activation_date).isValid() &&
            cursor.isSame(moment(sub.activation_date), 'month')) {

          if (FRMethods.isNumber(subBilling.installation.totalInstallationAmount)) {
            result[monthName].installations += subBilling.installation.totalInstallationAmount;
          }
          if (typeof subBilling.installation.additional_equipment === 'object' &&
              subBilling.installation.additional_equipment.length > 0) {
            
            _.each(subBilling.installation.additional_equipment, function(equipment) {
              result[monthName].equipmentSold += equipment.hardwareObj.price;
            });
            var community;
            if (typeof sub.community === 'string') {
              community = sub.community;
            } else if (typeof sub.city === 'string') {
              community = sub.city;
            } else {
              community = 'unknown';
            }

            if (!FRMethods.isNumber(result[monthName].tax[community])) {
              result[monthName].tax[community] = 0;
            }
            result[monthName].tax[community] += subBilling.installation.totalTax;
          }
        }
      });

      cursor.add(1, 'months');
    }

    _.each(result, function(monthlyResult) {
      monthlyResult.subscriptions = Math.round10(monthlyResult.subscriptions, 2);
      monthlyResult.installations = Math.round10(monthlyResult.installations, 2);
      monthlyResult.equipmentSold = Math.round10(monthlyResult.equipmentSold, 2);
      _.each(monthlyResult.tax, function(amount) {
        amount = Math.round10(amount, 10);
      });
      monthlyResult.totalInvoice = Math.round10(monthlyResult.subscriptions + monthlyResult.installations, 2);

    });
    return result;
  },

  getEmailsList: function(query, headerSort) {
    var result = Subscribers.find(query, {sort: headerSort} ).fetch();

    _.each(result, function(sub) {
      var payments = FRMethods.calculatePayments(sub);

      sub.billing_info = sub.billing_info || {};
      sub.billing_info.needsPayment = false;

      if (payments.dueToDate.required && payments.dueToDate.amount > 0) {
        sub.billing_info.needsPayment = true;
      }

      sub.billing_info.pastDue = false;

      if (typeof payments.dueToDate.payments === 'object' && payments.dueToDate.payments.length > 1) {
        _.each(payments.dueToDate.payments, function(payment) {
          var startOfMonth = moment().tz('America/Los_Angeles').startOf('month');
          if (startOfMonth.add(-1, 'months').isAfter(moment(payment.endDate))) {
            sub.billing_info.pastDue = true;
          }
        });
      }
    });
    return result;
  }
});
