Meteor.startup(function () {
  /**
   * Setup Raven integration on server/browser start.
   */
  if (Meteor.isClient
    && typeof Meteor.settings.public.sentry !== 'undefined'
    && typeof Meteor.settings.public.sentry.dsn !== 'undefined'
    ) {
    RavenLogger.initialize({
      client: Meteor.settings.public.sentry.dsn
    });
  }
  if (Meteor.isServer && typeof Meteor.settings.sentry !== 'undefined') {
    RavenLogger.initialize({
      server: Meteor.settings.sentry.dsn
    });
  }
})

