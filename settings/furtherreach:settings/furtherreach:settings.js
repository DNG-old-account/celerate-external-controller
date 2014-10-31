// Write your package code here!
FRSettings = {
  email: {
    retries: 3,
    notificationEmails: 'support@furtherreach.net, max@denovogroup.org, barath@denovogroup.org'
  },
  billing: {
    installmentAmount: 25,
    firstDayOfBilling: '2014-10-01',
    endOfBetaInstallation: '2014-09-15',
    discounts: {
      "nonprofit": function(amount) {
        return 0;
      },
      "relay": function(amount) {
        var newAmt = amount - 30;
        return (newAmt > 0) ? newAmt : 0;
      },
      "core-site": function(amount) {
        return 0;
      },
      "landuse": function(amount) {
        return 0;
      }
    },

    plans: {
      "beta-free": {
        "label": "Beta Free",
        "monthly": 0,
      },
      "nonprofit-free": {
        "label": "Non-profit Free",
        "monthly": 0,
      },
      "relay-free": {
        "label": "Relay Free",
        "monthly": 0,
      },
      "landuse-free": {
        "label": "Landuse Free",
        "monthly": 0,
      },
      "limited": {
        "label": "Limited",
        "monthly": 30,
        "details": "Burst speeds up to 4Mbs"
      },
      "essential": {
        "label": "Essential",
        "monthly": 70,
        "details": "Min: 4Mbs Typical: 8Mbs"
      },
      "performance": {
        "label": "Performance",
        "monthly": 100,
        "details": "Min: 8Mbs Typical: 15Mbs"
      },
      "ultra": {
        "label": "Ultra",
        "monthly": 130,
        "details": "Min: 15Mbs Typical: 30Mbs"
      },
      "silver": {
        "label": "Silver",
        "monthly": 130,
        "details": "Min: 15Mbs Typical: 30Mbs"
      },
      "gold": {
        "label": "Gold",
        "monthly": 200,
        "details": "Min: 40Mbs Typical: 60Mbs"
      },
    }
  },
  helpers: {
  }
};

FRMethods = {
  // Generates an authentication token and a MAC tag (encrypt-then-MAC) as hex strings given a subscriber id as a hex string and a server encryption key and MAC key as base64 strings.
  generateAuthToken: function (subscriber_id, encryptionKey, MACKey) {
    var crypto = Npm.require('crypto');

    if (!subscriber_id) {
      console.log("generateAuthToken subscriber_id is invalid: " + subscriber_id);
    }

    // Create plaintext JSON object.
    var expiryday = moment().add(Meteor.settings.serverAuthToken.tokenDaysValid, 'days');
    var message = subscriber_id + "+" + expiryday.format('YYYY-MM-DD');
    // console.log("plaintext message " + message);
    var plaintext = new Buffer(message, 'ascii');
    var rand = new Buffer(crypto.randomBytes(8), 'binary');
    var iv = new Buffer([0, 0, 0, 0,
                         0, 0, 0, 0,
                         0, 0, 0, 0,
                         0, 0, 0, 0]);

    rand.copy(iv);

    // Set up encryption.
    var cipher = crypto.createCipheriv(Meteor.settings.serverAuthToken.encryptionMode,
                                       new Buffer(encryptionKey, 'base64'),
                                       iv);

    // Encrypt plaintext.
    var ciphertext = cipher.update(plaintext, '', 'hex');
    ciphertext += cipher.final('hex');

    // Set up HMAC.
    var hmac = crypto.createHmac(Meteor.settings.serverAuthToken.hashMode,
                                 new Buffer(MACKey, 'base64'));
    hmac.update(ciphertext);
    var tag = hmac.digest('hex');

    var result = { 'iv': rand.toString('hex'), 'token': ciphertext, 'tag': tag.substr(0, 16) };
    // console.log('generateAuthToken returning: ' + JSON.stringify(result));
    return result;
  },
  processAuthToken: function(truncated_iv, token, tag, encryptionKey, MACKey) {
    var crypto = Npm.require('crypto');

    // Set up HMAC and check tag.
    var hmac = crypto.createHmac(Meteor.settings.serverAuthToken.hashMode,
                                 new Buffer(MACKey, 'base64'));
    hmac.update(token);
    if (tag !== hmac.digest('hex').substr(0, 16)) {
      return { 'err': 'Token/tag invalid', 'subscriber_id': '' };
    }

    var trunc = new Buffer(truncated_iv, 'hex');
    var iv = new Buffer([0, 0, 0, 0,
                         0, 0, 0, 0,
                         0, 0, 0, 0,
                         0, 0, 0, 0], 'binary');
    trunc.copy(iv);

    // Decrypt token.
    var decipher = crypto.createDecipheriv(Meteor.settings.serverAuthToken.encryptionMode,
                                           new Buffer(encryptionKey, 'base64'),
                                           iv);

    var plaintext = decipher.update(token, input_encoding='hex', output_encoding='ascii');
    plaintext += decipher.final(output_encoding='ascii');
    // console.log("got plaintext [" + plaintext + "]");

    var m = plaintext.split("+");
    if (m.length != 2) {
      return { 'err': 'Unable to decode/decrypt embedded message properly.', 'subscriber_id': '' };
    }

    // Check expiration.
    var expiryday = moment(m[1]);
    if (expiryday.diff(moment(), 'days') < 0) {
      return { 'err': 'Token expired on ' + expiryday.format('YYYY-MM-DD'), 'subscriber_id': '' };
    }

    // Token is valid, return subscriber id.
    var result = { 'err': null, 'subscriber_id': m[0] };
    // console.log("processAuthToken result " + JSON.stringify(result));

    return result;
  },
  generateSubscriberAccountId: function(subscriber_id) {
    // Given a subscriber_id string, returns a likely-unique account ID string.
    var crypto = Npm.require('crypto');

    var hash = crypto.createHash(Meteor.settings.serverAuthToken.hashMode);
    hash.update(subscriber_id, 'ascii');

    var account_id = hash.digest('hex').substr(0,10);

    return account_id;
  }
};

FREmails = {
  firstOfMonth: {
    slug: 'first-of-month',
    label: 'First Of Month',
    from: 'support@denovogroup.org',
    subject: function(context) {
      return 'Your Further Reach bill is ready to be viewed';
    },
    body: function(context, userLink, accountNum) {
      context.first_name = (typeof context.first_name === 'string') ? context.first_name : '';
      context.last_name = (typeof context.last_name === 'string') ? context.last_name : '';
      context.prior_email = (typeof context.prior_email === 'string') ? context.prior_email : '';
      context.plan = (typeof context.plan === 'string') ? context.plan : '';
      return 'Dear ' + context.first_name + ' ' + context.last_name + 
             '\n\nA new bill for your Further Reach account is ready for viewing on the customer portal:\n' + 
             userLink + 
             '\nThere you can view your bill details, payment history, make a payment, and more.\n\n' +
             'Please click on the link above to make a payment. ' + 
             'Note, if this is your first time accessing the customer portal please take the time to review and sign the Terms and Conditions, and verify your contact information.\n\n' +
             'Plan: ' + context.plan + '\n' + 
             'Account Number: ' + accountNum + '\n' + 
             'User ID: ' + context.prior_email + '\n' + 
             'Due Date: ' + context.billingDate + '\n' + //TODO: add due date!!!
             '\n\n\nThank you for choosing FurtherReach!' + 
             '\n\nQuestions about your bill? Send us an email at billing@furtherreach.net\n\n';
    }
  }
};
