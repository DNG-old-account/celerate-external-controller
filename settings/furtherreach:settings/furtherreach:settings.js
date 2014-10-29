// Write your package code here!
FRSettings = {
  "billing": {
    "installmentAmount": 25,
    "firstDayOfBilling": '2014-10-01',
    "plans": {
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
        "details": "Burst speeds up to 4Mb/s"
      },
      "essential": {
        "label": "Essential",
        "monthly": 70,
        "details": "Min: 4Mb/s Typical: 8Mb/s"
      },
      "performance": {
        "label": "Performance",
        "monthly": 100,
        "details": "Min: 8Mb/s Typical: 15Mb/s"
      },
      "ultra": {
        "label": "Ultra",
        "monthly": 130,
        "details": "Min: 15Mb/s Typical: 30Mb/s"
      },
      "silver": {
        "label": "Silver",
        "monthly": 130,
        "details": "Min: 15Mb/s Typical: 30Mb/s"
      },
      "gold": {
        "label": "Gold",
        "monthly": 200,
        "details": "Min: 40Mb/s Typical: 60Mb/s"
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
    console.log("plaintext message " + message);
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
    console.log('generateAuthToken returning: ' + JSON.stringify(result));
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
    console.log("got plaintext [" + plaintext + "]");

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
    console.log("processAuthToken result " + JSON.stringify(result));

    return result;
  }
};
