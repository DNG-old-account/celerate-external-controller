#!/bin/sh


export MONGO_URL="mongodb://localhost:3001/meteor"
export MONGO_OPLOG_URL="mongodb://localhost:3001/local"
echo $MONGO_URL
echo $MONGO_OPLOG_URL
meteor -p 3002 --settings ../settings.js 
