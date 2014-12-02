// We need to do a small database migration
// If a monthly payment is missing an associated charge, look through the 
// subscribers charges for a matching payment and add it to the monthly 
// payments object
if (Meteor.isServer) {
  Meteor.startup(function () {
    var subscribers = Subscribers.find();
    subscribers.forEach(function(sub) {

      if (typeof sub.billing_info === 'object' &&
          typeof sub.billing_info.monthly_payments === 'object') {

        _.each(sub.billing_info.monthly_payments, function(payment) {
          var startDate = moment(payment.start_date);
          var endDate = moment(payment.end_date);
          var startDateString = startDate.format('MM/DD/YYYY');
          var endDateString = endDate.format('MM/DD/YYYY');
          if (typeof payment.charge !== 'object') {
            if (typeof sub.billing_info.charges === 'object') {
              _.each(sub.billing_info.charges, function(charge) {
                if (charge.description.indexOf(endDateString) !== -1) {

                  payment.charge = charge;
                  // Now we have to push this back to the db
                  Subscribers.update({"_id": sub._id, 'billing_info.monthly_payments.end_date': endDate.toISOString()}, {$set: {"billing_info.monthly_payments.$.charge": charge}});  
                }
              });
            }
          }
        });
      }
    });
  });
}
