if (Meteor.isServer) {
  Meteor.startup(function () {
    var MonitorWrapper = Npm.require('/opt/celerate-external-controller/monitor-wrapper/wrapper.js');
    Meteor.methods({ 
      updateMonitoring: MonitorWrapper.update
    });
  });
}
