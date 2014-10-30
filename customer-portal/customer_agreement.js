if (Meteor.isServer) {

}
if (Meteor.isClient) {
  Template.customer_agreement.dashboardLink = function() {
    var authToken = Session.get('authToken');
    return '/' + authToken;
  };

  Template.order_form.subscriberInfo = Template.customer_agreement.subscriberInfo = function() {
    var authToken = Session.get('authToken');
    Meteor.call('getSubscriber', authToken, function(err, result) {
      if (!err && typeof result === 'object') {
        if (typeof result.terms === "object" && result.terms.agreed) {
          result.agreedToTerms = true;
        }
        Session.set('subscriber', result);
      } else if (err){
        Router.go('/error/' + authToken);
      }
    });
    return Session.get('subscriber');

  };

  Template.order_form.billingInfo = function() {
    var authToken = Session.get('authToken');
    Meteor.call('billingInfo', authToken, function(err, result) {
      if (!err && typeof result === 'object') {
        Session.set('billingInfo', result);
      } else if (err){
        Router.go('/error/' + authToken);
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
      } else if (err){
        Router.go('/error/' + authToken);
      }
    });
    return Session.get('planInfo');
  };

  Template.customer_agreement.events({
    'click #agree-to-terms-button': function (evt) {
      console.log(evt);
      console.log(this);
      var authToken = Session.get('authToken');
      evt.preventDefault();
      if (!$('#agree-to-terms').prop('checked')) {
        bootbox.alert("Need to agree to terms");
        return false;
      }
      Meteor.call('agreeToTerms', authToken, function(err, result) {
        if (err) {
          bootbox.alert('There seems to have been an error. If this persists, please contact support@furtherreach.net');
          $('.btn').on('click', function(evt) {
            window.location.reload(true);
          });
        } else {
          var authToken = Session.get('authToken');
          Router.go('/' + authToken);
        }
      });
    }
  });

}
