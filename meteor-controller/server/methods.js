// In your server code: define a method that the client can call

var sendEmail = function (to, from, subject, text, tries) {
  var numTries = FRSettings.email.retries;
  tries = (typeof tries !== 'undefined') ? tries : 0;

  check([to, from, subject, text], [String]);

  try {
    Email.send({
      to: to,
      from: from,
      subject: subject,
      text: text
    });
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
        sendEmail(to, from, subject, text, tries);
      }, 1000);
    } else {
      var errorSubject = 'Error Sending Email to: ' + to;
      Email.send({
        to: FRSettings.emails.notificationEmails,
        from: from,
        subject: subject,
        text: text
      });
    }
  }
};

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
        label: pictureObj.label
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
      var userLink = Meteor.settings.public.urls.customerPortal + authToken.iv + "+" + authToken.token + "+" + authToken.tag;
      var subject = emailObj.subject(sub);
      var accountId = FRMethods.generateSubscriberAccountId(subId);

      //TODO: In order to test appropriately I've 
      //      set it up to start billing 10 days early of the next month
      var startOfThisMonth = moment().add(10, 'days').startOf('month'); 
      var billingDate = (startOfThisMonth.month() + 1) + '/15/' + startOfThisMonth.year();

      sub.billingDate = billingDate;

      var body = emailObj.body(sub, userLink, accountId); 

      if (typeof sub.prior_email === 'string') {
        sendEmail(sub.prior_email, emailObj.from, subject, body);
      }

      if (typeof sub.contacts === 'object') {
        _.each(sub.contacts, function(c) {
          contactObj = Contacts.findOne(c.contact_id);
          if (contactObj.type === 'billing' && typeof contactObj.email === 'string') {
            sendEmail(contactObj.email, subject, body);
          }
        });
      }
    });
    return true;
  }
});
