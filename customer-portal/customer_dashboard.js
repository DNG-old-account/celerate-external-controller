if (Meteor.isServer) {

}
if (Meteor.isClient) {

  Template.customer_dashboard.subscriberInfo = function() {
    return Session.get('subscriber');
  };

  Template.customer_dashboard.events({
    'click': function (evt) {
      console.log(evt);
      console.log(this);
      var thisSub = this;
      if (evt.target.id === "submit-to-terms") {
        evt.preventDefault();
        if (!$('#agree-to-terms').prop('checked')) {
          console.log("need to check agree to terms box.");
          return false;
        }
        dbUpdate = {};
        dbUpdate.agreed_to_terms = true;
        thisSub.agreed_to_terms = true; // TODO: Feels a little hacky - maxb
        Subscribers.update(thisSub._id, {$set: dbUpdate}); 
        Session.set('subscriber', thisSub);
      }
    }
  });

}
