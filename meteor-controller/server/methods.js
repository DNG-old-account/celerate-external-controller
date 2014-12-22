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
      Meteor.setTimeout(function() {
        sendEmail(to, from, subject, text, tries, bcc);
      }, 1000);
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
  if (typeof sub.prior_email === 'string' &&
      FRMethods.isValidEmail(sub.prior_email)) {
    return sub.prior_email
  } else {
    if (typeof sub.contacts === 'object') {
      _.each(sub.contacts, function(c) {
        if (c.type === 'billing') {
          contactObj = Contacts.findOne(c.contact_id);
          if (typeof contactObj.email === 'string' &&
              contactObj.email.trim() !== '' &&
              FRMethods.isValidEmail(contactObj.email)) {

            return contactObj.email;
          }
        }
      });
    }
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
  }
});
