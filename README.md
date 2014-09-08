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

After you have those, the following should install the package
```
cd celerate-external-controller/monitor-wrapper
npm install
cd ../
meteor
```

If you'd like to import the sample data, you can do the following from the package root directory while meteor is running
```
./dbinit/initdb.sh
```

## Icinga w/ Docker ##
Hopefully all we'll need to do is some sort of 
```
docker build
docker run
```
(not there yet....)

