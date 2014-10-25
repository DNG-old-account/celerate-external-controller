if (Meteor.isServer) {

}
if (Meteor.isClient) {

  Template.customer_dashboard.loading = function() {
    return Session.get('loading');
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

  Template.payments_info.paymentInfo = function() {
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

  Template.payments_info.requiredPayments = function() {
    var authToken = Session.get('authToken');
    Meteor.call('requiredPayments', authToken, function(err, result) {
      if (!err && typeof result === 'object') {
        Session.set('requiredPayments', result);
      }
    });
    return Session.get('requiredPayments');
  };

  Template.payments_info.showCharges = function() {
    var paymentInfo = Session.get('paymentInfo');
    return (typeof paymentInfo === 'object' && 
            typeof paymentInfo.charges === 'object' &&
            paymentInfo.charges.length > 0);
  };

  Template.payments_info.rendered = function() {
    var authToken = Session.get('authToken');
    Meteor.call('billingInfo', authToken, function(err, result) {
      if (!err && typeof result === 'object') {
        Session.set('billingInfo', result);
      }
    });
    $.getScript('https://checkout.stripe.com/checkout.js', function() {

    });
  };

  Template.payments_info.events({ 
    'click button.pay-with-card': function (evt) {
      var thisSub = Session.get('subscriber');
      var billingInfo = Session.get('billingInfo');
      var requiredPayments = Session.get('requiredPayments');
      var authToken = Session.get('authToken');
      var typeOfCharge;
      //TODO: figure out charges amount and dates!!
      if (evt.target.id === 'pay-monthly') {
        typeOfCharge = 'monthly';
        var index = $(evt.target).data('index');
        var amount = requiredPayments.monthlyPayments[index].amount;
        var billingPeriodEndDate = requiredPayments.monthlyPayments[index].endDate;
        var billingPeriodStartDate = requiredPayments.monthlyPayments[index].startDate;

        var stripeConfig = {
          name: 'Further Reach',
          description: 'Monthly payment for period of ' + 
                        moment(billingPeriodStartDate).format('MM/DD/YYYY') + ' to ' + 
                        moment(billingPeriodEndDate).format('MM/DD/YYYY'),
          allowRememberMe: false,
          email: billingInfo.contact.email,
          billingPeriodStartDate: billingPeriodStartDate,
          billingPeriodEndDate: billingPeriodEndDate,
          amount: (amount * 100) // Stripe does it by cents
        };
      } else if (evt.target.id === 'pay-installation') {
        typeOfCharge = 'installation';
        var amount = requiredPayments.installation.standard_installation;
        var stripeConfig = {
          name: 'Further Reach',
          description: 'Standard Installation',
          allowRememberMe: false,
          email: billingInfo.contact.email,
          amount: (amount * 100) // Stripe does it by cents
        };
      } else if (evt.target.id === 'pay-installation-installment') {
        typeOfCharge = 'installation-installment';
        var amount = FRSettings.billing.installmentAmount;
        var stripeConfig = {
          name: 'Further Reach',
          description: 'Standard Installation Installment',
          allowRememberMe: false,
          email: billingInfo.contact.email,
          amount: (amount * 100) // Stripe does it by cents
        };
      }

      var handler = StripeCheckout.configure({
        key: Meteor.settings.public.stripe.publicKey,
        image: '/FurtherReachLogo.png',
        token: function(stripeToken) {
          Session.set('loading', true);
          Meteor.call('chargeCard', authToken, stripeToken, stripeConfig, typeOfCharge, function(err, result) {
            Session.set('loading', false);
            console.log(err);
            console.log(result);
            if (err || result.error) {
              bootbox.alert('There seems to have been an error processing your card.');
              window.location.reload(true);
            } else {
              bootbox.alert('Your payment has been processed. An email has been sent to you for your records');
            }
            $('.btn').on('click', function(evt) {
              //window.location.reload(true);
            });
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
