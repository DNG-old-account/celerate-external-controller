if (Meteor.isClient) {

  Meteor.startup(function() {
    Session.set('loading', true);
    Session.set('hasError', false);
    Session.set('errorMsg', '');
    Meteor.call('getBillingData', function (err, result) {
      if (err) {
        console.log('getBillingData call failed: ' + err);
        Session.set('loading', false);
        Session.set('errorMsg', 'getBillingData call failed: ' + err);
      } else {
        if (!result) {
          console.log("getBillingData call failed");
          Session.set('loading', false);
          Session.set('errorMsg', 'getBillingData call failed');
        }
        Session.set('billingData', result);
        Session.set('loading', false);
      }
    });
  });

  Template.billingData.helpers({
    loading: function() {
      return (Session.get('loading')) ? '' : 'hidden';
    },
    billingData: function() {
      return Session.get('billingData');
    },
    errorMsg: function() {
      return Session.get('errorMsg');
    },
  });

  Template.billingData.events({
    'change #see-past-due': function (evt) {
      if ($(evt.target).prop('checked')) {
        Session.set('seePastDue', true);
      } else {
        Session.set('seePastDue', false);
      }
    }
  });
}
