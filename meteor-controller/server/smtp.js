Meteor.startup(function () {
  process.env.MAIL_URL = 'smtp://' + encodeURIComponent(Meteor.settings.smtp.address) + ':' + encodeURIComponent(Meteor.settings.smtp.password) + '@' + encodeURIComponent(Meteor.settings.smtp.server) + ':' + Meteor.settings.smtp.port + '/';
});
