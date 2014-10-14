if (Meteor.isServer) {
  Meteor.startup(function () {
    if (Meteor.settings.aws) {
      AWS.config.update({
        accessKeyId: Meteor.settings.aws.accessKeyId,
        secretAccessKey: Meteor.settings.aws.secretAccessKey
      });
    } else {
      console.warn("AWS settings missing");
    }
    s3 = new AWS.S3();
  });
}
