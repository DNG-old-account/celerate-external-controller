// In your server code: define a method that the client can call

var authenticate = function(token) {
  return token;
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
    return sub;
  },

  chargeCard: function(token, stripeToken, stripeConfig) {
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
        receipt_email: stripeConfig.email
      }, function(err, charge) {
        done(err, charge);
      });
    });

    console.log(result);
    if (!result.error && !result.result.err) {
      Subscribers.update(thisSub._id, {$set: {'billing_info.installation.paid': true }});
      Subscribers.update(thisSub._id, {$push: {'billing_info.charges': result.result}});
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
    var plans = {
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
        "details": "Min: 4Mb/s Max: 8Mb/s"
      },
      "performance": {
        "label": "Performance",
        "monthly": 100,
        "details": "Min: 8Mb/s Max: 15Mb/s"
      },
      "ultra": {
        "label": "Ultra",
        "monthly": 130,
        "details": "Min: 15Mb/s Max: 30Mb/s"
      },
      "silver": {
        "label": "Silver",
        "monthly": 130,
        "details": "Min: 15Mb/s Max: 30Mb/s"
      },
      "gold": {
        "label": "Gold",
        "monthly": 200,
        "details": "Min: 40Mb/s Max: 60Mb/s"
      },
    }
    return plans;
  }
});
