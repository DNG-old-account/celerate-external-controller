// Write your package code here!
FRSettings = {
  email: {
    retries: 3,
    notificationEmails: 'support@furtherreach.net, max@denovogroup.org, barath@denovogroup.org'
  },
  billing: {
    installmentNum: 6,
    additionalHourCost: 50,
    firstDayOfBilling: '2014-10-01',
    endOfBetaInstallation: '2014-09-15',
    discounts: {
      "nonprofit": function(amount) {
        return 0;
      },
      "relay": function(amount) {
        var newAmt = amount - 40;
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
        "details": "Burst speeds up to 4Mbps"
      },
      "essential": {
        "label": "Essential",
        "monthly": 70,
        "details": "Min: 4Mbps Typical: 8Mbps"
      },
      "performance": {
        "label": "Performance",
        "monthly": 100,
        "details": "Min: 8Mbps Typical: 15Mbps"
      },
      "ultra": {
        "label": "Ultra",
        "monthly": 130,
        "details": "Min: 15Mbps Typical: 30Mbps"
      },
      "silver": {
        "label": "Silver",
        "monthly": 130,
        "details": "Min: 15Mbps Typical: 30Mbps"
      },
      "gold": {
        "label": "Gold",
        "monthly": 200,
        "details": "Min: 40Mbps Typical: 60Mbps"
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
  },

  isNumber: function (n) {
    return typeof n !== 'undefined' && !isNaN(parseFloat(n)) && isFinite(n);
  },

  calculatePayments: function(sub) {
    var result = {};
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
      if (typeof sub.plan === 'string' && sub.plan.trim() !== '') {

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
  }
};

FREmails = {
  firstOfMonth: {
    slug: 'first-of-month',
    label: 'First Of Month',
    from: 'Further Reach Billing <billing@furtherreach.net>',
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
             'Plan: ' + (context.plan.slice(0, 1).toUpperCase() + context.plan.slice(1)) + '\n' + // TODO: This is just capitalizing the first letter - we should move this to helpers
             'Account Number: ' + accountNum + '\n' + 
             'User ID: ' + context.prior_email + '\n' + 
             'Due Date: ' + context.billingDate + '\n' + //TODO: add due date!!!
             '\n\n\nThank you for choosing FurtherReach!' + 
             '\n\nQuestions about your bill? Send us an email at billing@furtherreach.net\n\n';
    }
  },
  billingReminder: {
    slug: 'billing-reminder',
    label: 'Billing Reminder',
    from: 'Further Reach Billing <billing@furtherreach.net>',
    subject: function(context) {
      return 'A Reminder from Further Reach about your Monthly Bill';
    },
    body: function(context, userLink, accountNum) {
      context.first_name = (typeof context.first_name === 'string') ? context.first_name : '';
      context.last_name = (typeof context.last_name === 'string') ? context.last_name : '';
      context.prior_email = (typeof context.prior_email === 'string') ? context.prior_email : '';
      context.plan = (typeof context.plan === 'string') ? context.plan : '';
      return 'Dear ' + context.first_name + ' ' + context.last_name + 
             '\n\nA bill for your further reach account was sent out at the beginning of this month. The link to make a payment is here:\n' + 
             userLink + 
             '\n\nPlan: ' + (context.plan.slice(0, 1).toUpperCase() + context.plan.slice(1)) + '\n' + // TODO: This is just capitalizing the first letter - we should move this to helpers
             'Account Number: ' + accountNum + '\n' + 
             'User ID: ' + context.prior_email + '\n' + 
             'Due Date: ' + context.billingDate + '\n' + 
             '\n\n\nThank you for choosing FurtherReach!' + 
             '\n\nQuestions about your bill? Send us an email at billing@furtherreach.net\n\n';
    }
  }
};

(function(){

  /**
   * Decimal adjustment of a number.
   *
   * @param {String}  type  The type of adjustment.
   * @param {Number}  value The number.
   * @param {Integer} exp   The exponent (the 10 logarithm of the adjustment base).
   * @returns {Number}      The adjusted value.
   */
  function decimalAdjust(type, value, exp) {
    // If the exp is undefined or zero...
    if (typeof exp === 'undefined' || +exp === 0) {
      return Math[type](value);
    }
    value = +value;
    exp = +exp;
    // If the value is not a number or the exp is not an integer...
    if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
      return NaN;
    }
    // Shift
    value = value.toString().split('e');
    value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
    // Shift back
    value = value.toString().split('e');
    return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
  }

  // Decimal round
  if (!Math.round10) {
    Math.round10 = function(value, exp) {
      return decimalAdjust('round', value, exp);
    };
  }
  // Decimal floor
  if (!Math.floor10) {
    Math.floor10 = function(value, exp) {
      return decimalAdjust('floor', value, exp);
    };
  }
  // Decimal ceil
  if (!Math.ceil10) {
    Math.ceil10 = function(value, exp) {
      return decimalAdjust('ceil', value, exp);
    };
  }
  // Adds formatMoney to Number prototypes
  // Usage:
  // (123456789.12345).formatMoney(2, '.', ',');
  // returns:
  // 123,456,789.12
  // c: number of decimals
  // d: decimal separator
  // t: thousands separator
  Number.prototype.formatMoney = function(c, d, t){
    var n = this, 
        c = isNaN(c = Math.abs(c)) ? 2 : c, 
        d = d == undefined ? "." : d, 
        t = t == undefined ? "," : t, 
        s = n < 0 ? "-" : "", 
        i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "", 
        j = (j = i.length) > 3 ? j % 3 : 0;
    return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
  };

})();
