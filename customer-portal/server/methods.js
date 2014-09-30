// In your server code: define a method that the client can call
Meteor.methods({
  sendEmail: function (to, from, subject, text) {
    check([to, from, subject, text], [String]);

    // Let other method calls from the same client start running,
    // without waiting for the email sending to complete.
    this.unblock();

    Email.send({
      to: to,
      from: from,
      subject: subject,
      text: text
    });
  },


  // I envisioned this function taking the encrypted string
  // and returning a subscriber object with the relevant fields
  // Right now I'm just passing in subscriber ids and returning
  // the relevant info - you should be able to substitute the actual
  // authentication steps fairly easily?
  authorize: function (hash) {
    var subId = new Meteor.Collection.ObjectID(hash);
    var sub = Subscribers.findOne(subId);
    return sub;
  }
});
