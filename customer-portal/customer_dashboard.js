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
      if (evt.target.id === "submit-to-terms") {
        evt.preventDefault();
        if (!$('#agree-to-terms').prop('checked')) {
          console.log("need to check agree to terms box.");
          return false;
        }
        dbUpdate = {};
        dbUpdate.agreed_to_terms = true;
        Subscribers.update(this._id, {$set: dbUpdate}); 
      }
    }
  });

}
