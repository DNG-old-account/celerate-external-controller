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
      "community - $30 off": function(amount) {
        var newAmt = amount - 40;
        return (newAmt > 0) ? newAmt : 0;
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
      },
      "community - $0": function(amount) {
        return 0;
      },
      "annual discount - 1/12 off": function(amount) {
        var newAmt = amount - (amount / 12);
        return Math.round10(newAmt, 2);
      }
    },

    plans: {
      "hold": {
        "label": "On Hold",
        "monthly": 20,
        "details": "Subscription on hold"
      },
      "disconnected": {
        "label": "Disconnected",
        "monthly": 0,
        "details": "Sorry to see you go"
      },
      "limited": {
        "label": "Limited",
        "monthly": 30,
        "details": "Burst speeds up to 4Mbps",
        "type": "residential"
      },
      "essential": {
        "label": "Essential",
        "monthly": 70,
        "details": "Min: 4Mbps Typical: 8Mbps",
        "type": "residential"
      },
      "performance": {
        "label": "Performance",
        "monthly": 100,
        "details": "Min: 8Mbps Typical: 15Mbps",
        "type": "residential"
      },
      "ultra": {
        "label": "Ultra",
        "monthly": 130,
        "details": "Min: 15Mbps Typical: 30Mbps",
        "type": "residential"
      },
      "silver": {
        "label": "Silver",
        "monthly": 130,
        "details": "Min: 15Mbps Typical: 30Mbps",
        "type": "business"
      },
      "gold": {
        "label": "Gold",
        "monthly": 200,
        "details": "Min: 40Mbps Typical: 60Mbps",
        "type": "business"
      }
    },

    "taxRates": {
      "Point Arena": 8.125,
      "Elk": 7.625,
      "Manchester": 7.625,
      "Gualala": 7.625
    }
  },
  helpers: {
  }
};

FRMethods = {
  // Generates a shortened auth token as a hex string given a subscriber id as a hex string and a server encryption key and MAC key as base64 strings.
  // Returns null on failure.
  generateAuthToken: function (subscriber_id, encryptionKey, MACKey) {
    var crypto = Npm.require('crypto');

    if (!subscriber_id) {
      console.log("generateAuthToken subscriber_id is invalid: " + subscriber_id);
      return null;
    }

    // Create plaintext JSON object.
    var expiryday = moment().add(Meteor.settings.serverAuthToken.tokenDaysValid, 'days');
    var expiryday_str = expiryday.format('YYYY-MM-DD');
    var message = {"subscriber_id" : subscriber_id, "expiryday": expiryday_str};
    // console.log("plaintext message " + message);
    var plaintext = new Buffer(JSON.stringify(message), 'ascii');
    var iv = new Buffer(crypto.randomBytes(16), 'binary');

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
    var result = { 'iv': iv.toString('hex'), 'token': ciphertext, 'tag': tag };

    // Shorten the auth token by hashing it.
    var hash = crypto.createHash(Meteor.settings.serverAuthToken.hashMode);
    hash.update(JSON.stringify(result), 'ascii');
    var short_token = hash.digest('hex');

    // Store the shortened auth token.
    db_update = result;
    db_update['short_token'] = short_token;
    db_update['expiry_day'] = expiryday_str;
    ShortAuthTokens.insert(db_update);

    return short_token;
  },
  processAuthToken: function(short_token, encryptionKey, MACKey) {
    var crypto = Npm.require('crypto');

    // Reverse the auth token shortening.
    var long_token = ShortAuthTokens.findOne({'short_token': short_token});
    if (!long_token) {
      console.log("ShortAuthToken " + short_token + " not found.");
      return { 'err': 'Token/tag invalid', 'subscriber_id': '' };
    }

    // console.log("Long token: " + JSON.stringify(long_token));

    var iv = long_token.iv;
    var token = long_token.token;
    var tag = long_token.tag;

    // Set up HMAC and check tag.
    var hmac = crypto.createHmac(Meteor.settings.serverAuthToken.hashMode,
                                 new Buffer(MACKey, 'base64'));
    hmac.update(token);
    if (tag !== hmac.digest('hex')) {
      console.log("MAC tag " + tag + " doesn't match " + hmac.digest('hex'));
      return { 'err': 'Token/tag invalid', 'subscriber_id': '' };
    }

    var iv = new Buffer(iv, 'hex');

    // Decrypt token.
    var decipher = crypto.createDecipheriv(Meteor.settings.serverAuthToken.encryptionMode,
                                           new Buffer(encryptionKey, 'base64'),
                                           iv);

    var plaintext = decipher.update(token, input_encoding='hex', output_encoding='ascii');
    plaintext += decipher.final(output_encoding='ascii');
    // console.log("got plaintext [" + plaintext + "]");

    var m = JSON.parse(plaintext);
    if (!m || !m['subscriber_id'] || !m['expiryday']) {
      return { 'err': 'Unable to decode/decrypt embedded message properly.', 'subscriber_id': '' };
    }

    // Check expiration.
    var expiryday = moment(m.expiryday);
    if (expiryday.diff(moment(), 'days') < 0) {
      return { 'err': 'Token expired on ' + expiryday.format('YYYY-MM-DD'), 'subscriber_id': '' };
    }

    // Token is valid, return subscriber id.
    var result = { 'err': null, 'subscriber_id': m.subscriber_id };
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

  isValidEmail: function(email) {
    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(email);
  },

  createBillingProperties: function(sub) {
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
        discounts: [],
        monthly_payments: []
      };
      dbUpdate = {};
      dbUpdate['billing_info'] = billing;
      Subscribers.update(sub._id, {$set: dbUpdate}); 

      sub = Subscribers.findOne(sub._id);
    }
    return sub;
  },

  calculatePayments: function(sub, fastForward) {
    var result = {};
    // If a subscriber doesn't have billing info yet, we can just create it here
    sub = FRMethods.createBillingProperties(sub);

    result.monthlyPayments = [];
    result.required = false;

    fastForward = (typeof fastForward === 'number') ? fastForward : 1;
    // Will show users the billing info one day before the 1st of the month
    var startOfThisMonth = moment().tz('America/Los_Angeles').add(fastForward, 'days').startOf('month'); 
    var activationDate;

    if ((sub.status === 'connected' || sub.status === 'disconnected') && 
        moment(sub.activation_date).isValid()) {

      // Want to mark any user connected before the beta period end as paid
      var endOfBetaInstallation = moment.tz(FRSettings.billing.endOfBetaInstallation, 'America/Los_Angeles');
      activationDate = moment.tz(sub.activation_date, 'America/Los_Angeles');
      if (activationDate.isBefore(endOfBetaInstallation) || activationDate.isSame(endOfBetaInstallation, 'day')) {
        Subscribers.update(sub._id, {$set: {'billing_info.installation.paid': true}});
      }

      // Calculate monthly payments
      if (typeof sub.plan === 'string' && sub.plan.trim() !== '') {

        var iterateDates = function(first, last, plan) {
          var hasChange = false;

          if (first.isBefore(activationDate) || first.isSame(activationDate, 'day')) {
            first = moment(activationDate);
          }         

          if (typeof sub.billing_info.plan_activity === 'object' && _.size(sub.billing_info.plan_activity) > 0) {
            
            var thisPeriodsActivity = _.filter(sub.billing_info.plan_activity, function(change) {;
              var changeDate = moment(change.date).tz('America/Los_Angeles');
              return (changeDate.isAfter(first) && !changeDate.isSame(first, 'day') && 
                      changeDate.isBefore(last) && !changeDate.isSame(last, 'day'));
          });

            thisPeriodsActivity = _.sortBy(thisPeriodsActivity, function(change) {
              return moment(change.date).unix();
            });

            _.each(thisPeriodsActivity, function(change, index, planActivity) {
              var changeDate = moment(change.date).tz('America/Los_Angeles');
              if (changeDate.isAfter(first) && !changeDate.isSame(first, 'day') && 
                  changeDate.isBefore(last) && !changeDate.isSame(last, 'day')) {
                hasChange = true;
                if (planActivity.length === 1) {
                  iterateDates(first, changeDate, change.previousPlan);
                  iterateDates(changeDate, last, change.newPlan);
                } else if (planActivity.length === 2){
                  if (index === 0) {
                    iterateDates(first, changeDate, change.previousPlan);
                    iterateDates(changeDate, moment(planActivity[index + 1].date).tz('America/Los_Angeles'), change.newPlan);
                  } else {
                    iterateDates(changeDate, last, change.newPlan);
                  }
                } else {
                  if (index === 0) {
                    iterateDates(first, changeDate, change.previousPlan);
                  } else if (index === planActivity.length - 1) {
                    iterateDates(changeDate, last, change.newPlan);
                  } else {
                    iterateDates(moment(planActivity[index - 1].date).tz('America/Los_Angeles'), changeDate, change.previousPlan);
                    iterateDates(changeDate, moment(planActivity[index + 1].date).tz('America/Los_Angeles'), change.newPlan);
                  }
                }
              }
            });
          } 
          if(!hasChange) {
            var numDiffDays = 999999; // Essentially max days
            if (typeof plan !== 'string') {
              // Find the nearest plan activity and then find out if before or after
              // then use previousPlan or newPlan 
              if (typeof sub.billing_info.plan_activity === 'object' && _.size(sub.billing_info.plan_activity) > 0) {
                _.each(sub.billing_info.plan_activity, function(change) {
                  var diff;
                  var changeDate = moment(change.date).tz('America/Los_Angeles');
                  if (changeDate.isAfter(last)) {
                    diff = Math.abs(changeDate.diff(last, 'days'));
                    if (diff < numDiffDays) {
                      plan = change.previousPlan;
                    }
                  } else {
                    diff = Math.abs(changeDate.diff(first, 'days'));
                    if (diff < numDiffDays) {
                      plan = change.newPlan;
                    }
                  }

                });
              } else {
                plan = sub.plan;
              }
            }
            result.monthlyPayments.push(calcAmount(first, last, plan));
          }
        }

        var calcAmount = function(first, last, plan) {
          var monthlyPayment = {};
          monthlyPayment.required = true;
          monthlyPayment.startDate = moment(first);
          monthlyPayment.endDate = moment(last);
 
          monthlyPayment.plan = FRSettings.billing.plans[plan];

          // Make sure we have the most up to date subscriber object
          sub = Subscribers.findOne(sub._id);

          // TODO: Maxb - It would be nice to have a better, stricter check here!
          //       but due to plans being able to be split, we need to be flexible
          if (typeof sub.billing_info.monthly_payments === 'object') {
            _.each(sub.billing_info.monthly_payments, function(payment) {
              if ((moment(payment.startDate).isValid() && 
                  monthlyPayment.startDate.isSame(moment(payment.start_date), 'day')) ||
                  (moment(payment.endDate).isValid() && 
                  monthlyPayment.endDate.isSame(moment(payment.end_date), 'day'))) {
                monthlyPayment.required = false;
                monthlyPayment.startDate = moment(payment.start_date).tz('America/Los_Angeles');
                monthlyPayment.endDate = moment(payment.end_date).tz('America/Los_Angeles');
              }
            });
          }

          var monthlyPaymentAmount = Math.round10(parseFloat(monthlyPayment.plan.monthly), 2);
          
          var startOfBilling = moment(monthlyPayment.startDate).startOf('month');
          var numberOfBillingDays = Math.abs(monthlyPayment.startDate.diff(monthlyPayment.endDate, 'days')) + 1;
          var daysInMonth = startOfBilling.daysInMonth();
          monthlyPayment.amount = monthlyPaymentAmount * (numberOfBillingDays / daysInMonth);
          monthlyPayment.amount = Math.round10(monthlyPayment.amount, 2);

          // Check for and apply monthly discount
          // TODO: probably want to do discounts by month and not sub-month period
          // ie. if subs plan is $70 and the discount is $30, we don't want to apply that $30 discount twice
          if (typeof sub.discount === 'string' && 
              typeof FRSettings.billing.discounts[sub.discount] === 'function') {
            var newAmount = FRSettings.billing.discounts[sub.discount](monthlyPayment.amount);
            monthlyPayment.discount = {
              label: sub.discount,
              previousAmount: monthlyPayment.amount,
              amount: monthlyPayment.amount - newAmount
            };
            monthlyPayment.amount = Math.round10(newAmount, 2);
          }

          monthlyPayment.startDate = monthlyPayment.startDate.toISOString();
          monthlyPayment.endDate = monthlyPayment.endDate.toISOString();
          return monthlyPayment;
        }

        var dateCursor = moment(startOfThisMonth);
        var firstDayOfBilling = moment.tz(FRSettings.billing.firstDayOfBilling, 'America/Los_Angeles');

        if (activationDate.isAfter(firstDayOfBilling) || 
            activationDate.isSame(firstDayOfBilling, 'day')) {
          var firstMonthEver = moment(activationDate).startOf('month');
        } else {
          var firstMonthEver = moment(firstDayOfBilling);
        }

        var startDate;
        var endDate;
        while (dateCursor.isAfter(firstMonthEver) && !dateCursor.isSame(firstMonthEver, 'day')) {
          
          startDate = moment(dateCursor).subtract(1, 'months');
          endDate = moment(dateCursor).subtract(1, 'days');

          iterateDates(startDate, endDate)
          // We have to translate back into Date obj for Meteor client <--> server
          dateCursor.subtract(1, 'months');
        }


        // Lets find out what this person would owe for the next month
        var first = moment(startOfThisMonth);
        var last = moment(startOfThisMonth).add(1, 'months').add(-1, 'days');
        result.nextMonthsPayment = calcAmount(first, last, sub.plan);
      }
    }

    _.each(result.monthlyPayments, function(payment) {
      if (payment.required) {
        // If any bill is older than 1 month and is $0, mark it as "paid"
        if (moment(payment.endDate).isBefore(moment(startOfThisMonth).add(-1, 'months'))) {
          var total = parseFloat(payment.amount);
          // Are there any outstanding discounts?
          _.each(sub.billing_info.discounts, function(discount) {
            var newTotal;
            if (!discount.used) {
              newTotal = total - discount.amount;
              if (newTotal > 0) {
                discount.leftover = 0;
                total = newTotal;
              } else {
                discount.leftover = Math.abs(newTotal);
                total = 0;
              }
              discount.toBeUsed = true;
            }
          });
          if (total === 0) {
            _.each(sub.billing_info.discounts, function(discount) {
              if (discount.toBeUsed) {
                // If there is leftover amount on this discount, create a copy of this one with 
                // the remaining amount and a note
                if (discount.leftover !== 0) {
                  var newDiscount = _.extend({}, discount);
                  newDiscount._id = new Meteor.Collection.ObjectID();
                  newDiscount.amount = discount.leftover;
                  newDiscount.dateCreated = new Date();
                  delete newDiscount.lefover;
                  delete newDiscount.toBeUsed;
                  newDiscount.notes = 'Leftover from ' + discount.dateCreated + '. ' + newDiscount.notes;

                  Subscribers.update(sub._id, {$push: {'billing_info.discounts': newDiscount }});
                } 

                var updatedDiscount = _.extend({}, discount);
                delete updatedDiscount.lefover;
                delete updatedDiscount.toBeUsed;
                updatedDiscount.used = true;
                updatedDiscount.dateUsed = new Date();

                Subscribers.update(sub._id, {$pull: {'billing_info.discounts': {'_id': discount._id}}});
                Subscribers.update(sub._id, {$push: {'billing_info.discounts': updatedDiscount }});
              }

            });

            payment.required = false;
            var monthlyPayment = {
              amount: 0,
              start_date: payment.startDate,
              end_date: payment.endDate,
            };
            Subscribers.update(sub._id, {$push: {'billing_info.monthly_payments': monthlyPayment}});         
          }
        }
      }
    });

    // Lets sort monthlyPayments by date
    result.monthlyPayments = _.sortBy(result.monthlyPayments, function(payment) {
      return moment(payment.endDate).unix();
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
    dueToDate.amount = Math.round10(dueToDate.amount, 2);
    result.dueToDate = dueToDate;

    result.installation = sub.billing_info.installation;
    result.installation.standard_installation = Math.round10(parseFloat(result.installation.standard_installation), 2);

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
        equipment.hardwareObj.taxCost = Math.round10((parseFloat(equipment.hardwareObj.tax) / 100) * parseFloat(equipment.hardwareObj.price), 2);
        result.installation.totalInstallationAmount += equipment.hardwareObj.taxCost + parseFloat(equipment.hardwareObj.price);
        result.installation.taxableAmount += parseFloat(equipment.hardwareObj.price);
        result.installation.totalTax += equipment.hardwareObj.taxCost;
      });
    }

    if (FRMethods.isNumber(result.installation.additional_labor) && 
        result.installation.additional_labor > 0) {

      result.installation.showAdditionalLabor = true;
      result.installation.additionalLaborCost = Math.round10(result.installation.additional_labor * FRSettings.billing.additionalHourCost, 2);
      result.installation.totalInstallationAmount += FRSettings.billing.additionalHourCost * parseFloat(result.installation.additional_labor);
      result.installation.additionalLaborHourCost = FRSettings.billing.additionalHourCost;
    }

    if (result.installation.installments) {
      result.installation.totalPaid = _.reduce(result.installation.installment_payments, function(sum, payment) {
        return sum + parseFloat(payment.amount);
      }, 0);
      result.installation.remaining_amount = Math.round10(result.installation.totalInstallationAmount - result.installation.totalPaid, 2);
    }

    if (!result.installation.paid) {
      result.required = true;
    }

    if (result.dueToDate.required) {
      result.required = true;
    }

    // Check for any overall discounts and apply them
    if (typeof sub.billing_info.discounts === 'object') {
      result.discounts = [];
      _.each(sub.billing_info.discounts, function(discount) {
        if (!discount.used) {
          result.discounts.push(discount);
        }
      });
    }
    return result;
  },

  // Because we need to actually change the discount state for required payments, we 
  // need to add an optional parameter which if true will return the modified requiredPayments 
  // object.
  calcTotalPayment: function(sub, installmentAmount, returnRequiredPayments, fastForward) {
    var requiredPayments = FRMethods.calculatePayments(sub, fastForward);
    var total = 0;
    if (requiredPayments.required) {
      if (!requiredPayments.installation.paid) {
        if (FRMethods.isNumber(installmentAmount)) {
          total += parseFloat(installmentAmount);
        } else {
          if (requiredPayments.installation.installments && !isNaN(parseFloat(requiredPayments.installation.remaining_amount))) {
            total += parseFloat(requiredPayments.installation.remaining_amount);
          } else {
            total += parseFloat(requiredPayments.installation.totalInstallationAmount);
          }
        }
      }
      if (requiredPayments.dueToDate.required && !isNaN(parseFloat(requiredPayments.dueToDate.amount))) {
        total += parseFloat(requiredPayments.dueToDate.amount);
      }
    } 

    if (typeof requiredPayments.discounts === 'object') {
      _.each(requiredPayments.discounts, function(discount) {
        var newTotal;
        if (!discount.used) {
          newTotal = total - discount.amount;
          if (newTotal > 0) {
            discount.leftover = 0;
            total = newTotal;
          } else {
            discount.leftover = Math.abs(newTotal);
            total = 0;
          }
          discount.toBeUsed = true;
        }
      });
    }

    total = total.formatMoney(2, '.', '');
    if (returnRequiredPayments) {
      return {
        total: total,
        requiredPayments: requiredPayments
      } 
    } else {
      return total;
    }
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
      context.email = (typeof context.email === 'string') ? context.email : '';
      context.plan = (typeof context.plan === 'string') ? context.plan : '';
      return 'Dear ' + context.first_name + ' ' + context.last_name + 
             '\n\nA new bill for your Further Reach account is ready for viewing on the customer portal:\n' + 
             userLink + 
             '\nThere you can view your bill details, payment history, make a payment, and more.\n\n' +
             'Please click on the link above to make a payment. ' + 
             'Note, if this is your first time accessing the customer portal please take the time to review and sign the Terms and Conditions, and verify your contact information.\n\n' +
             'We are glad to announce that we now support Auto-Pay! Just go to Manage Autopay and click On, enter your debit/credit card information and click Submit. That\'s it, done! You\'re card will automatically get billed on the first of each month.  As a reminder, we have taken extra steps to secure your information and deferred all handling of the credit card information to Stripe (https://stripe.com) that specializes in handling credit card transactions securely. We do not retain any of your financial information on our site. Note, Stripe has been certified as a PCI Level 1 Service Provider, the most stringent level of certification available. PCI, for those not familiar is the data security standard that the payment card industry relies on.\n\n' + 
             'Plan: ' + (context.plan.slice(0, 1).toUpperCase() + context.plan.slice(1)) + '\n' + // TODO: This is just capitalizing the first letter - we should move this to helpers
             'Account Number: ' + accountNum + '\n' + 
             'User ID: ' + context.email + '\n' + 
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
      return 'Your Further Reach bill is past due!';
    },
    body: function(context, userLink, accountNum) {
      context.first_name = (typeof context.first_name === 'string') ? context.first_name : '';
      context.last_name = (typeof context.last_name === 'string') ? context.last_name : '';
      context.email = (typeof context.email === 'string') ? context.email : '';
      context.plan = (typeof context.plan === 'string') ? context.plan : '';
      return 'Dear ' + context.first_name + ' ' + context.last_name + 
             '\n\nYour bill for your Further Reach account is past due! Please go to the customer portal link and make a payment as soon as possible:\n' + 
             userLink + 
             '\n\nOn the portal you can also view your contact details, bill details, payment history and more.' + 
             '\n\nNote, if this is your first time accessing the customer portal please take the time to review and sign the Terms and Conditions, and verify your contact information.' + 
             '\n\nPlan: ' + (context.plan.slice(0, 1).toUpperCase() + context.plan.slice(1)) + '\n' + // TODO: This is just capitalizing the first letter - we should move this to helpers
             'Account Number: ' + accountNum + '\n' + 
             'User ID: ' + context.email + '\n' + 
             'Due Date: ' + context.billingDate + '\n' + 
             '\n\nThank you for choosing FurtherReach!' + 
             '\n\nQuestions about your bill? Send us an email at billing@furtherreach.net\n\n';
    }
  },

  emailProblems: {
    slug: 'payment-problems',
    label: 'Payment Problems',
    from: 'Further Reach Billing <billing@furtherreach.net>',
    subject: function(context) {
      return 'Further Reach Message - Clarification on accessing the customer portal';
    },
    body: function(context, userLink, accountNum) {
      context.first_name = (typeof context.first_name === 'string') ? context.first_name : '';
      context.last_name = (typeof context.last_name === 'string') ? context.last_name : '';
      context.email = (typeof context.email === 'string') ? context.email : '';
      context.plan = (typeof context.plan === 'string') ? context.plan : '';
      return 'Dear ' + context.first_name + ' ' + context.last_name + 
             '\n\nWe have noticed a few subscribers had difficulty in accessing the customer portal in order to make a payment. The recurring theme is that those subscribers are using older versions of their browsers. We therefore ask that each subscriber download the latest version of either Chrome, FireFox, Safari or Internet Explorer. For your convenience we included the download links:\n' + 
             'Chrome - https://www.google.com/intl/en/chrome/browser/desktop/index.html \n' +
             'FireFox - https://www.mozilla.org/en-US/firefox/new/ \n' +
             'Safari - http://support.apple.com/downloads/#safari \n' +
             'Internet Explorer - http://windows.microsoft.com/en-us/internet-explorer/download-ie+ \n\n' +
             'Please also make sure that Javascript is enabled on the browser you are using. \n\n' + 
             'Lastly, for security reasons, the link to the customer portal sent each month with your monthly bill has an expiration set to one month so if you try to access it afterward it will not work. Typically we send a bill reminder if your bill is overdue so make sure to access the link from the latest email.\n' +
             userLink +
             '\n\nPlan: ' + (context.plan.slice(0, 1).toUpperCase() + context.plan.slice(1)) + '\n' + // TODO: This is just capitalizing the first letter - we should move this to helpers
             'Account Number: ' + accountNum + '\n' + 
             'User ID: ' + context.email + '\n' + 
             '\n\n\nThank you for choosing FurtherReach!' + 
             '\n\nQuestions about your bill? Send us an email at billing@furtherreach.net\n\n';
    }
  },
  serviceProblem: {
    slug: 'service-problems',
    label: 'Service Problems',
    from: 'Yahel <yahel@furtherreach.net>',
    subject: function(context) {
      return 'Further Reach Message - Apologies for network downtime today';
    },
    body: function(context, userLink, accountNum) {
      context.first_name = (typeof context.first_name === 'string') ? context.first_name : '';
      context.last_name = (typeof context.last_name === 'string') ? context.last_name : '';
      context.email = (typeof context.email === 'string') ? context.email : '';
      context.plan = (typeof context.plan === 'string') ? context.plan : '';
      return 'Dear subscribers,' + 
             '\n\nAs many of you may have noticed, we had a pretty bad Internet day today...\n' +
             'Since around noon, until about 3:40pm, many of you experienced intermittent connectivity.\n' + 
             'This is due to an upgrade operation that has gone bad.' + 
             '\n\nWorse - I had replied to some that the interruptions were shorter and fewer than it actually was, this is was false information I received from the system being upgraded..\n\n' + 
             'We now have all the reasons to believe that everything is really back to normal.\n\n' + 
             'Apologies for these interruptions - the growing pains of a young network, that is getting better and better every day.\n\n' + 
             'Yahel Ben-David';
    }
  },

  notifyRemoveHold: {
    slug: 'notify-remove-hold',
    label: 'Notification of Hold Removal',
    from: 'Further Reach Billing <billing@furtherreach.net>',
    subject: function(context) {
      return 'Your service has been resumed';
    },
    body: function(context, userLink, accountNum) {
      context.first_name = (typeof context.first_name === 'string') ? context.first_name : '';
      context.last_name = (typeof context.last_name === 'string') ? context.last_name : '';
      context.email = (typeof context.email === 'string') ? context.email : '';
      context.plan = (typeof context.plan === 'string') ? context.plan : '';
      return 'Dear ' + context.first_name + ' ' + context.last_name + 
             '\n\nYour service has been resumed and you can now access the internet. ' +
             'The next monthly bill will be pro-rated according to your plan. \n\n' +
             'Account Number: ' + accountNum + '\n' + 
             'User ID: ' + context.email + '\n' + 
             '\n\n\nThank you for choosing FurtherReach!' + 
             '\n\nQuestions? Send us an email at billing@furtherreach.net\n\n';
    }
  },

  notifyHold: {
    slug: 'notify-hold',
    label: 'Notify of Hold',
    from: 'Further Reach Billing <billing@furtherreach.net>',
    subject: function(context) {
      return 'Your service has been put on hold';
    },
    body: function(context, userLink, accountNum) {
      context.first_name = (typeof context.first_name === 'string') ? context.first_name : '';
      context.last_name = (typeof context.last_name === 'string') ? context.last_name : '';
      context.email = (typeof context.email === 'string') ? context.email : '';
      context.plan = (typeof context.plan === 'string') ? context.plan : '';
      return 'Dear ' + context.first_name + ' ' + context.last_name + 
             '\n\nYour plan has been put on hold. The account maintenance cost while on hold is $20/month. ' + 
             'You can resume your service at any time, at which point your original service plan will be restored. ' +
             'Please give as at least a few days heads up before you would like your service resumed. \n\n' +
             'Account Number: ' + accountNum + '\n' + 
             'User ID: ' + context.email + '\n' + 
             '\n\n\nThank you for choosing FurtherReach!' + 
             '\n\nQuestions? Send us an email at billing@furtherreach.net\n\n';
    }
  },

};

(function(){

  // Decimal round
  if (!Math.round10) {
    Math.round10 = function(value, exp) {
      var exp10 = Math.pow(10, exp);
      return Math.round(value * exp10) / exp10;
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
