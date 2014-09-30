Meteor.startup(function () {
  process.env.MAIL_URL = 'smtp://' + Meteor.settings.smtp.address + ':' + Meteor.settings.smtp.password + '@' + Meteor.settings.smtp.server + ':' + Meteor.settings.port;
});
