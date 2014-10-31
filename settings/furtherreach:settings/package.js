Package.describe({
  name: 'furtherreach:settings',
  summary: 'Settings for the Controller and Customer Portal',
  version: '1.0.0',
});

Package.onUse(function(api) {
  api.versionsFrom('0.9.0');
  api.addFiles('furtherreach:settings.js');
  api.export('FRSettings');
  api.export('FRMethods');
  api.export('FREmails');
});

Package.onTest(function(api) {
  api.use('tinytest');
  api.use('furtherreach:settings');
  api.addFiles('furtherreach:settings-tests.js');
});
