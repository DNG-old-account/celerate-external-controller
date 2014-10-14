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

  getPictures: function(site) {
    if (typeof site.pictures !== 'object') {
      return;
    } 
    var results = [];

    _.each(site.pictures, function(pictureObj) {
      results.push({
        url: Meteor.call('getS3Url', pictureObj.key),
        label: pictureObj.label
      });
    });

    return results;
  },

  getS3Url: function(key) {
    var params = {
      Bucket: 'celerate-external-controller-uploads', 
      Key: key, 
      Expires: 600
    };
    var url = s3.getSignedUrl('getObject', params);
    return url;
  },

  signS3Upload: function(file, key) {

    var params = {
      Bucket: 'celerate-external-controller-uploads',
      Key: key,
      Expires: 600, // 10 min
      ContentType: file.type,
      ACL: 'private'
    };

    signedUrl = s3.getSignedUrl('putObject', params);

    return signedUrl;
  }
});
