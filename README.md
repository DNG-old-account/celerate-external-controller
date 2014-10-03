celerate-external-controller
============================

This is the external controller for [Further Reach](http://furtherreach.net).

It provides crm functionality, allows us to add nodes in the field, integrates monitoring and inventory, and provides info about the network.


# Download #

```
git clone https://github.com/denovogroup/celerate-external-controller.git
```

# Install dependencies #

You'll need to install meteor. From the [docs](http://docs.meteor.com/):
```
curl https://install.meteor.com | /bin/sh
```

You'll also need to install mongodb. Exhaustive instructions are at [http://docs.mongodb.org/manual/installation/](http://docs.mongodb.org/manual/installation/). 
Make sure to get mongodb-org-tools or your distros equivalent - you'll need mongoimport at the least.

If you'd like to import backup data. cd into the location of your backup while mongo is running
```
cd backup_location
mongorestore -h localhost --port 3001 -d meteor meteor/
```


# Documenting steps for running parallel Meteor instances #

./settings.js.example has settings for the variety of server settings necessary. Copy this into ./settings.js and enter the appropriate information.


