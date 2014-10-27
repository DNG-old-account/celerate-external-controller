if (Meteor.isServer) {

}
if (Meteor.isClient) {

  Template.customer_dashboard.loading = function() {
    return Session.get('loading');
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
      }
    });
    return Session.get('subscriber');
  };

  Template.payment_history.paymentInfo = Template.required_payments.paymentInfo = function() {
    console.log(this);
    var authToken = Session.get('authToken');
    Meteor.call('getSubscriber', authToken, function(err, result) {
      if (!err && typeof result === 'object') {
        if (typeof result.terms === "object" && result.terms.agreed) {
          result.agreedToTerms = true;
        }
        var billingInfo = result.billing_info;
        if (typeof billingInfo.charges === 'object') {
          _.each(billingInfo.charges, function(charge) {
            var dateString = moment(billingInfo.created).format('M/D/YYYY');
            charge.dateCreatedString = dateString;
            charge.dollarAmount = (charge.amount / 100).formatMoney(2, '.', ',');;
          });
        }
        Session.set('paymentInfo', result.billing_info);
      }
    });
    return Session.get('paymentInfo');
  };

  Template.required_payments.installmentAmount = function() {
    return FRSettings.billing.installmentAmount;
  };

  var calcTotalPayment = function() {
    var requiredPayments = Session.get('requiredPayments');
    var total = 0;
    if (requiredPayments.required) {
      if (!requiredPayments.installation.paid) {
        if ($('#installment-choices').val() === 'installment') {
          total += FRSettings.billing.installmentAmount;
        } else {
          if (requiredPayments.installation.installments && !isNaN(parseFloat(requiredPayments.installation.remaining_amount))) {
            total += parseFloat(requiredPayments.installation.remaining_amount);
          } else {
            total += parseFloat(requiredPayments.installation.standard_installation);
          }
        }
      }
      if (requiredPayments.dueToDate.required && !isNaN(parseFloat(requiredPayments.dueToDate.total))) {
        total += parseFloat(requiredPayments.dueToDate.total);
      }
    } 
    Session.set('totalPayment', total);
  };

  Template.required_payments.totalPayment = function() {
    calcTotalPayment();
    var totalPayment = Session.get('totalPayment');
    return totalPayment;
  }

  Template.required_payments.requiredPayments = function() {
    var authToken = Session.get('authToken');
    Meteor.call('requiredPayments', authToken, function(err, result) {
      if (!err && typeof result === 'object') {
        Session.set('requiredPayments', result);
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
      }
    });
    $.getScript('https://checkout.stripe.com/checkout.js', function() {

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
      }
      if (requiredPayments.dueToDate.required) {
        typesOfCharges.push('monthly');
        var billingPeriodEndDate = requiredPayments.dueToDate.endDate;
        var billingPeriodStartDate = requiredPayments.dueToDate.startDate;

        stripeConfig.description += 'Monthly payment for period of ' + 
                        moment(billingPeriodStartDate).format('MM/DD/YYYY') + ' to ' + 
                        moment(billingPeriodEndDate).format('MM/DD/YYYY') + '. \n';
        stripeConfig.billingPeriodStartDate = billingPeriodStartDate;
        stripeConfig.billingPeriodEndDate = billingPeriodEndDate;

      } 
      if (!requiredPayments.installation.paid) { 
        var installationAmount;

        if ($('#installment-choices').val() === 'installment') {
          typesOfCharges.push('installment');
          installationAmount = parseFloat(FRSettings.billing.installmentAmount);
          stripeConfig.description += 'Standard Installation Installment';

        } else {
          typesOfCharges.push('installation');
          installationAmount = parseFloat(requiredPayments.installation.standard_installation);
          stripeConfig.description += 'Standard Installation';
        }
      }

      //TODO: figure out better description stuff

      stripeConfig.amount = parseInt(amount * 100, 10); // Stripe does it by cents

      var handler = StripeCheckout.configure({
        key: Meteor.settings.public.stripe.publicKey,
        image: '/FurtherReachLogo.png',
        token: function(stripeToken) {
          Session.set('loading', true);
          Meteor.call('chargeCard', authToken, stripeToken, stripeConfig, typesOfCharges, function(err, result) {
            Session.set('loading', false);
            console.log(err);
            console.log(result);
            if (err || result.error) {
              bootbox.alert('There seems to have been an error processing your card.');
              $('.btn').on('click', function(evt) {
                window.location.reload(true);
              });
            } else {
              bootbox.alert('Your payment has been processed. An email has been sent to you for your records');
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
          typeof thisSub.plan !== 'undefined' && 
          result[thisSub.plan] !== 'undefined') {

        Session.set('planInfo', result[thisSub.plan]);
      }
    });
    return Session.get('planInfo');
  };

  Template.agreement_info.events({ 
    'click button.terms-conditions': function (evt) {
      console.log(this);
      console.log(evt);
      var authToken = Session.get('authToken');
      Router.go('/customer_agreement/' + authToken);
    }
  });

  Template.customer_dashboard.events({
    'click': function (evt) {
      console.log(evt);
      console.log(this);
      var thisSub = this;
      var authToken = Session.get('authToken');
    }
  });

}
