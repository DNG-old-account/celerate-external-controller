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
    var list = s3.listObjectsSync({
      Bucket: 'celerate-external-controller-uploads',
      Prefix: 'configurations'
    });
    console.log(list);
    
    _.each(list, function(item) {
      console.log(item);
    });

    var params = {Bucket: 'celerate-external-controller-uploads', Key: 'configurations/manchester_af24_mib', Expires: 600};
    var url = s3.getSignedUrl('getObject', params);
    console.log('The URL is', url); // expires in 60 seconds
  });
}
