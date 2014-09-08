var MonitorWrapper = Npm.require('/opt/celerate-external-controller/monitor-wrapper/wrapper.js');
if (Meteor.isServer) {
  SyncedCron.add({
    name: 'Poll icinga status',
    schedule: function(parser) {
      // parser is a later.parse object
      return parser.text('every 10 seconds');
    }, 
    job: function() {
      MonitorWrapper.getStatus(function(nodes) {
        console.log("nodes: " , nodes);
      });
    }
  });
  Meteor.startup(function () {
    Meteor.methods({ 
      updateMonitoring: MonitorWrapper.update,
      monitoringStatus: MonitorWrapper.getStatus
    });
    SyncedCron.start();
  });
}
