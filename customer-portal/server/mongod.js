Meteor.startup(function () {
  process.env.MONGO_URL = Meteor.settings.mongo.mongoUrl;
  process.env.OPLOG_URL = Meteor.settings.mongo.oplogUrl;
});
