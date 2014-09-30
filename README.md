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
mongorestore -h localhost --port 3001 -d appdb meteor/
```


# Documenting steps for running parallel Meteor instances #
Adding mongod.js to server/ with the proper environment variables allows us to set the environment variables.

Also - ./mongod.conf is an example of a configuration file which sets mongodb correctly. It's likely necessary to change paths slightly
```
/opt/celerate-external-controller/meteor-controller# mongod --replSet meteor --dbpath .meteor/local/db/ --port 3001 --bind_ip 127.0.0.1
```

./settings.js.example has settings for the variety of server settings necessary. Copy this into ./settings.js and enter the appropriate information.

For each meteor instance, you can run:
```
meteor --settings ../settings.js -p 3000
```

Where you would substitute 3000 for the port you would like meteor to run on

