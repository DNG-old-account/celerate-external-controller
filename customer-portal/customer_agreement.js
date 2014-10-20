if (Meteor.isServer) {

}
if (Meteor.isClient) {

  Template.order_form.subscriberInfo = Template.customer_agreement.subscriberInfo = function() {
    var authToken = Session.get('authToken');
    Meteor.call('getSubscriber', authToken, function(err, result) {
      if (!err && typeof result === 'object') {
        if (typeof result.terms === "object" && result.terms.agreed) {
          result.agreedToTerms = true;
        }
        Session.set('subscriber', result);
      }
    });
    return Session.get('subscriber');

  };

  Template.order_form.billingInfo = function() {
    var authToken = Session.get('authToken');
    Meteor.call('billingInfo', authToken, function(err, result) {
      if (!err && typeof result === 'object') {
        Session.set('billingInfo', result);
      }
    });
    return Session.get('billingInfo');
  };

  Template.order_form.planInfo = function() {
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

  Template.customer_agreement.events({
    'click': function (evt) {
      console.log(evt);
      console.log(this);
      var thisSub = this;
      if (evt.target.id === 'pay-for-installation') {
        evt.preventDefault();
        if (!$('#agree-to-terms').prop('checked')) {
          bootbox.alert("Need to agree to terms");
          return false;
        }
        dbUpdate = {};
        dbUpdate.terms = {
          agreed: true,
          date: new Date()
        };
        thisSub.terms = dbUpdate.terms; // TODO: Feels a little hacky - maxb
        Subscribers.update(thisSub._id, {$set: dbUpdate}); 
        Session.set('subscriber', thisSub);
        var authToken = Session.get('authToken');
        Router.go('/payments/' + authToken);
      }
    }
  });

}
