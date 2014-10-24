if (Meteor.isServer) {

}
if (Meteor.isClient) {

  Template.payments.subscriberInfo = function() {
    var authToken = Session.get('authToken');
    Meteor.call('getSubscriber', authToken, function(err, result) {
      if (!err && typeof result === 'object') {
        Session.set('subscriber', result);
      }
    });
    return Session.get('subscriber');

  };

  Template.payments.billingInfo = function() {
    var authToken = Session.get('authToken');
    Meteor.call('billingInfo', authToken, function(err, result) {
      if (!err && typeof result === 'object') {
        Session.set('billingInfo', result);
      }
    });
    return Session.get('billingInfo');
  };

  Template.payments.rendered = function() {
    $.getScript('https://checkout.stripe.com/checkout.js', function() {

    });
  };

  Template.payments.events({
    'click': function (evt) {
      evt.preventDefault();
      var thisSub = Session.get('subscriber');
      var billingInfo = Session.get('billingInfo');
      var authToken = Session.get('authToken');
      if (evt.target.id === 'make-payment') {
        var stripeConfig = {
          name: 'Further Reach',
          description: 'Standard Installation',
          allowRememberMe: false,
          email: billingInfo.contact.email,
          amount: (billingInfo.billingDetails.installation.standard_installation * 100) // Stripe does it by cents
        };

        var handler = StripeCheckout.configure({
          key: Meteor.settings.public.stripe.publicKey,
          image: '/FurtherReachLogo.png',
          token: function(stripeToken) {
            Meteor.call('chargeCard', authToken, stripeToken, stripeConfig, 'installation', function(err, result) {
              console.log(err);
              console.log(result);
              if (err || result.error) {
                bootbox.alert('There seems to have been an error processing your card.');
              } else {
                bootbox.alert('Your payment has been processed. An email has been sent to you for your records');
                $('.btn').on('click', function(evt) {
                  window.close();
                });
              }
            });
          }
        });
        handler.open(stripeConfig);
      }
    }
  });

}
