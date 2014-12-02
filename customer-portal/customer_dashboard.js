if (Meteor.isServer) {

}
if (Meteor.isClient) {

  Template.customer_dashboard.hideDashboardContainer = function() {
    var sub = Session.get('subscriber');
    return (Session.get('loading') || typeof sub === 'undefined') ? 'hidden' : '';
  };

  Template.customer_dashboard.showThrobber = function() {
    var sub = Session.get('subscriber');
    return (Session.get('loading') || typeof sub === 'undefined') ? '' : 'hidden';
  };

  Template.subscriber_info.connected = Template.customer_dashboard.connected = function() {
    var sub = Session.get('subscriber');

    if (typeof sub === 'object' && sub.status === 'connected' && moment(sub.activation_date).isValid()) {
      return true;
    }
    return false;
  };
    
  Template.subscriber_info.subscriberInfo = Template.customer_dashboard.subscriberInfo = function() {
    var authToken = Session.get('authToken');
    Meteor.call('getSubscriber', authToken, function(err, result) {
      if (!err && typeof result === 'object') {
        if (typeof result.terms === "object" && result.terms.agreed) {
          result.agreedToTerms = true;
        }
        //result.billing_info = _.omit(result.billing_info, 'charges');
        Session.set('subscriber', result);
      } else {
        Router.go('/error/' + authToken);
      }
    });
    return Session.get('subscriber');
  };

  Template.payment_history.paymentInfo = Template.required_payments.paymentInfo = function() {
    var authToken = Session.get('authToken');
    Meteor.call('getSubscriber', authToken, function(err, result) {
      if (!err && typeof result === 'object') {
        if (typeof result.terms === "object" && result.terms.agreed) {
          result.agreedToTerms = true;
        }
        var billingInfo = result.billing_info;
        if (typeof billingInfo.charges === 'object') {
          _.each(billingInfo.charges, function(charge) {
            // Stripe hands us date created in ms and moment wants seconds
            var dateString = moment(charge.created * 1000).format('M/D/YYYY');
            charge.dateCreatedString = dateString;
            charge.dollarAmount = (charge.amount / 100).formatMoney(2, '.', ',');
          });
        }
        Session.set('paymentInfo', result.billing_info);
      } else {
        Router.go('/error/' + authToken);
      }
    });
    return Session.get('paymentInfo');
  };

  Template.required_payments.installationTotalPayment = function() {
    var requiredPayments = Session.get('requiredPayments');
    var installmentAmount = Session.get('instalmentAmount');

    var installments = ($('#installment-choices').val() === 'installment' || 
                        requiredPayments.installation.installments) ? 
                        true : false;

    if (installments) {
      return installmentAmount;
    } else {
      return requiredPayments.installation.totalInstallationAmount;
    }
  };

  Template.required_payments.installmentNum = function() {
    return FRSettings.billing.installmentNum;
  };

  Template.required_payments.alreadyPaid = function() {
    var requiredPayments = Session.get('requiredPayments');
    return parseFloat(requiredPayments.installation.totalPaid).formatMoney(2, '.', ',');
  };

  Template.required_payments.installmentAmount = function() {
    var requiredPayments = Session.get('requiredPayments');
    var installmentAmount = Math.round10((requiredPayments.installation.totalInstallationAmount / FRSettings.billing.installmentNum), 2);
    Session.set('installmentAmount', installmentAmount);
    return installmentAmount;
  };

  var calcTotalPayment = function() {
    var thisSub = Session.get('subscriber');
    var authToken = Session.get('authToken');
    if (typeof thisSub === 'object') {
      var installmentAmount = $('#installment-choices').val() === 'installment' ? Session.get('installmentAmount') : undefined;
      Meteor.call('calculateTotalPayments', authToken, installmentAmount, function(err, result) {
        if (!err && typeof result !== 'undefined') {
          Session.set('totalPayment', result);
        } else {
          Router.go('/error/' + authToken);
        }
      });
    }
  }

  Template.required_payments.totalPayment = function() {
    calcTotalPayment();
    return Session.get('totalPayment');
  };


  Template.required_payments.paymentNeeded = function() {
    return Session.get('totalPayment') > 0;
  };

  Template.required_payments.requiredPayments = function() {
    var authToken = Session.get('authToken');
    Meteor.call('requiredPayments', authToken, function(err, result) {
      if (!err && typeof result === 'object') {
        Session.set('requiredPayments', result);
      } else {
        Router.go('/error/' + authToken);
      }
    });
    return Session.get('requiredPayments');
  };

  Template.payment_history.showCharges = Template.required_payments.showCharges = function() {
    var paymentInfo = Session.get('paymentInfo');
    return (typeof paymentInfo === 'object' && 
            typeof paymentInfo.charges === 'object' &&
            paymentInfo.charges.length > 0);
  };

  Template.required_payments.rendered = function() {
    var authToken = Session.get('authToken');
    Meteor.call('billingInfo', authToken, function(err, result) {
      if (!err && typeof result === 'object') {
        Session.set('billingInfo', result);
      } else if (err){
        Router.go('/error/' + authToken);
      }
    });
    $.getScript('https://checkout.stripe.com/checkout.js', function() {
    });
    $.getScript('https://js.stripe.com/v2/', function() {
      Stripe.setPublishableKey(Meteor.settings.public.stripe.publicKey);
    });
  };

  Template.required_payments.events({ 
    'change #installment-choices': function(evt) {
      calcTotalPayment();
    },

    'click #make-payment': function (evt) {
      var thisSub = Session.get('subscriber');
      var billingInfo = Session.get('billingInfo');
      var requiredPayments = Session.get('requiredPayments');
      var authToken = Session.get('authToken');
      var typeOfCharge;
      var typesOfCharges = [];
      var amount = Session.get('totalPayment');

      var stripeConfig = {
          name: 'Further Reach',
          allowRememberMe: false,
          email: billingInfo.contact.email,
          description: '',
          requiredPayments: requiredPayments,
          installmentAmount: Session.get('installmentAmount')
      }
      if (requiredPayments.dueToDate.required) {
        typesOfCharges.push('monthly');
        var billingPeriodEndDate = requiredPayments.dueToDate.endDate;
        var billingPeriodStartDate = requiredPayments.dueToDate.startDate;

        stripeConfig.description += 'Monthly payment for period of ' + 
                        moment(billingPeriodStartDate).format('MM/DD/YYYY') + ' to ' + 
                        moment(billingPeriodEndDate).format('MM/DD/YYYY') + '';
        stripeConfig.billingPeriodStartDate = billingPeriodStartDate;
        stripeConfig.billingPeriodEndDate = billingPeriodEndDate;
        stripeConfig.monthlyCharges = requiredPayments.dueToDate.payments;
      } 
      if (!requiredPayments.installation.paid) { 
        stripeConfig.description += (stripeConfig.description.trim() === '') ? '' : '; ';

        if ($('#installment-choices').val() === 'installment') {
          typesOfCharges.push('installment');
          stripeConfig.description += 'Installation Installment Payment';

        } else {
          typesOfCharges.push('installation');
          stripeConfig.description += 'Standard Installation';
        }
      }
      
      var stripeAmount = Math.round(amount * 100); // Stripe does it by cents
      stripeConfig.amount = parseInt(stripeAmount, 10); 

      var handler = StripeCheckout.configure({
        key: Meteor.settings.public.stripe.publicKey,
        image: '/FR_stripe_logo.png',
        token: function(stripeToken) {
          Session.set('loading', true);
          Meteor.call('chargeCard', authToken, stripeToken, stripeConfig, typesOfCharges, function(err, result) {
            Session.set('loading', false);
            Template.required_payments.requiredPayments();
            if (err || result.error) {
              bootbox.alert('There seems to have been an error processing your card. If this persists, please contact support@furtherreach.net');
              $('.btn').on('click', function(evt) {
                window.location.reload(true);
              });
            } else {
              var notification = 'Your payment has been processed. An email has been sent to you for your records.'
              if (typeof result.receipt_number === "string") {
                notification += 'Your receipt number is ' + result.receipt_number;
              }
              bootbox.alert(notification);
            }
          });
        }
      });
      handler.open(stripeConfig);
    }
  });

  Template.contact_snippet.showEmail = function() {
    return (typeof this.prior_email === 'string' || typeof this.email === 'string');
  };

  Template.contact_snippet.showAddress = function() {
    return typeof this.street_address === 'string' && 
           typeof this.city === 'string' &&
           typeof this.state === 'string' &&
           typeof this.zip_code === 'string';
  };

  Template.contact_snippet.showName = function() {
    return !(_.has(this, 'contactInfo')) 
  };

  Template.plan_info.planInfo = function() {
    var authToken = Session.get('authToken');
    var thisSub = Session.get('subscriber');
    Meteor.call('planInfo', authToken, function(err, result) {
      if (!err && typeof result === 'object' && 
          typeof thisSub === 'object' && 
          typeof thisSub.plan !== 'undefined') {

        Session.set('planInfo', result);
      } else {
        Router.go('/error/' + authToken);
      }
    });
    return Session.get('planInfo');
  };

  Template.agreement_info.events({ 
    'click button.terms-conditions': function (evt) {
      var authToken = Session.get('authToken');
      Router.go('/customer_agreement/' + authToken);
    }
  });

  Template.customer_dashboard.events({
    'click': function (evt) {
      var thisSub = this;
      var authToken = Session.get('authToken');
    }
  });

  Template.manage_autopay.autoPayContainerClass = function() {
    return Session.get('autoPayLoading') ? 'hidden' : '';
  };

  Template.manage_autopay.autoPayThrobberClass = function() {
    return Session.get('autoPayLoading') ? '' : 'hidden';
  };

  Template.manage_autopay.autoPayConfig = function() {
    var autoPayConfig = Session.get('autoPayConfig');
    var cardId = autoPayConfig.customer.default_card;
    var cardObj = _.find(autoPayConfig.customer.cards.data, function(card) {
      return card.id === cardId;
    });
    autoPayConfig.defaultCard = cardObj;
    return autoPayConfig;
  };
  
  Template.manage_autopay.autoPaySetup = function() {
    var authToken = Session.get('authToken');
    Meteor.call('autoPayConfig', authToken, function(err, result) {
      if (!err && typeof result === 'object') {
        if (result.on) {
          Session.set('autoPayOn', true);
          Session.set('autoPaySetup', true);
        }
        Session.set('autoPayConfig', result);
      } else {
        Router.go('/error/' + authToken);
      }
    });

    return Session.get('autoPaySetup');
  };

  Template.manage_autopay.autoPayOn = function() {
    var autoPayOn = Session.get('autoPayOn');
    return autoPayOn;
  };

  Template.manage_autopay.creditCardHidden = function() {
    var autoPayOn = Session.get('autoPayOn');
    if (autoPayOn) {
      $('#credit-card-cvc').payment('formatCardCVC');
      $('#credit-card-exp-date').payment('formatCardExpiry');
      $('#credit-card-number').payment('formatCardNumber');
    }
    return autoPayOn ? '' : 'hidden';
  };

  Template.manage_autopay.rendered = function() {
    var creditNum = $('#credit-card-number');
  };

  Template.manage_autopay.events({ 
    'click .autopay-button.toggle-on': function(evt) {
      Session.set('autoPayOn', true);
    },
    'click .autopay-button.toggle-off': function(evt) {
      bootbox.confirm("Are you sure you want to turn off autopay?", function(result) {
        var authToken = Session.get('authToken');
        if (result) {
          Session.set('autoPayLoading', true);
          Meteor.call('setupAutoPay', authToken, false, undefined, function(err, result) {
            if (!err && typeof result === 'object') {
              Session.set('autoPayConfig', result);
              Session.set('autoPayLoading', false);
              Session.set('autoPayOn', false);
              Session.set('autoPaySetup', false);
            } else {
              Router.go('/error/' + authToken);
            }
          });
        }
      });
    },
    'click #submit-autopay-config': function(evt) {
      evt.preventDefault();
      bootbox.confirm("Turning on autopay will automatically charge your card when monthly bill is due.", function(result) {
        if (result) {
          $('.autopay-details .has-error').removeClass('has-error');

          var creditNum = $('#credit-card-number');
          var cvc = $('#credit-card-cvc');
          var expDate = $('#credit-card-exp-date');
          var expDateObj = $.payment.cardExpiryVal(expDate.val());
          var valid = true;
          if (!$.payment.validateCardNumber(creditNum.val())) {
            creditNum.parent().addClass('has-error');
            valid = false;
          }
          if (!$.payment.validateCardExpiry(expDateObj.month, expDateObj.year)) {
            expDate.parent().addClass('has-error');
            valid = false;
          }
          if (!$.payment.validateCardCVC(cvc.val())) {
            cvc.parent().addClass('has-error');
            valid = false;
          }

          if (valid) {
            var billingObj = {
              cardNum: creditNum.val(),
              expDate: expDateObj,
              cvc: cvc.val()
            }

            Session.set('autoPayLoading', true);

            Stripe.card.createToken({
              number: billingObj.cardNum,
              cvc: billingObj.cvc,
              exp_month: billingObj.expDate.month,
              exp_year: billingObj.expDate.year,
            }, function(status, response) {
              if (response.error) {
                // Show the errors on the form
                Session.set('autoPayLoading', false);
                $('.autopay-details .payment-errors').text(response.error.message);
              } else {
                billingObj.token = response.id;

                // Don't send the actual card number to our servers
                delete billingObj.number;

                var authToken = Session.get('authToken');

                Meteor.call('setupAutoPay', authToken, true, billingObj, function(err, result) {
                  if (!err && typeof result === 'object') {
                    
                    Session.set('autoPayConfig', result);
                    Session.set('autoPayOn', true);
                    Session.set('autoPaySetup', true);
                    Session.set('autoPayLoading', false);
                    Template.required_payments.requiredPayments();
                    Template.payment_history.paymentInfo();
                  } else {
                    Router.go('/error/' + authToken);
                  }
                });
              }
            });
          }
        }
      });
    },
  });

}
