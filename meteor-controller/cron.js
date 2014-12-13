if (Meteor.isServer) {

  
  Meteor.startup(function () {
    SyncedCron.add({
      name: 'Backup Database to S3',
      schedule: function(parser) {
        // parser is a later.parse object
        return parser.text('at 3:00 am');
        // return parser.text('every 2 minutes');
      }, 
      job: function() {
        if (Meteor.settings.aws) {
      
          var config = {
            s3: {
              key: Meteor.settings.aws.accessKeyId,
              secret: Meteor.settings.aws.secretAccessKey,
              bucket: Meteor.settings.aws.backupsBucket,
              destination: "/"
            },
            mongodb: {
              "host": "localhost",
              "port": 3001,
              "username": false,
              "password": false,
              "db": "meteor"
            },
          }

          var backup = Meteor.npmRequire('mongodb_s3_backup');

          backup.sync(config.mongodb, config.s3, function(err) {
            if (err) {
              console.log('Error backing up mongodb to s3');
            } else {
              console.log('Successfully backed up mongodb to s3');
            }
          });
        } else {
          console.warn("AWS settings missing");
        }
      }
    });
    SyncedCron.start();
  });
}
