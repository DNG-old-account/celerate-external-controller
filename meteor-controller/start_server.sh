#!/bin/bash
export MONGO_OPLOG_URL="mongodb://localhost:3001/local"

EXTRA_PARAMS=""

if [[ "$1" == "dev" ]]; then 
  export ROOT_URL="http://localhost:3000"
  echo "Starting main celerate controller in dev mode at: " $ROOT_URL
elif [[ "$1" == "staging" ]]; then
  export ROOT_URL="http://staging.furtherreach.net:3000"
  echo "Starting main celerate controller in staging mode at: " $ROOT_URL
else
  export ROOT_URL="http://celerate-controller.furtherreach.net:3000"
  EXTRA_PARAMS="$EXTRA_PARAMS --production"
  echo "Starting main celerate controller in prod mode at: " $ROOT_URL
fi

meteor $EXTRA_PARAMS -p 3000 --settings ../settings.js 
