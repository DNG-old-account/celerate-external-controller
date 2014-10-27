#!/bin/bash
export MONGO_URL="mongodb://localhost:3001/meteor"

if [[ "$1" == "dev" ]]; then 
  export ROOT_URL="http://localhost:3002"
  echo "Starting celerate customer portal in dev mode at: " $ROOT_URL
elif [[ "$1" == "staging" ]]; then
  export ROOT_URL="http://staging.furtherreach.net:3002"
  echo "Starting celerate customer portal in staging mode at: " $ROOT_URL
else
  export ROOT_URL="https://celerate-controller.furtherreach.net"
  echo "Starting celerate customer portal in prod mode at: " $ROOT_URL
fi

meteor -p 3002 --settings ../settings.js 
