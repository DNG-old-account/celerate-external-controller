if (Meteor.isServer) {

}
if (Meteor.isClient) {

  Template.subscriber_info.subscriberInfo = Template.customer_dashboard.subscriberInfo = function() {
    var authToken = Session.get('authToken');
    Meteor.call('getSubscriber', authToken, function(err, result) {
      if (!err && typeof result === 'object') {
        if (typeof result.terms === "object" && result.terms.agreed) {
          result.agreedToTerms = true;
        }
        result.billing_info = _.omit(result.billing_info, 'charges');
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

  Template.payments_info.showCharges = function() {
    console.log(this);
    var paymentInfo = Session.get('paymentInfo');
    return (typeof paymentInfo === 'object' && typeof paymentInfo.charges === 'object');
  };

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
    Meteor.call('planInfo', authToken, function(err, result) {
      var thisSub = Session.get('subscriber');
      if (!err && typeof result === 'object' && 
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
