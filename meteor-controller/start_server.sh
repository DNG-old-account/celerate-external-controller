#!/bin/bash

if [[ "$1" == "dev" ]]; then 
  export ROOT_URL="http://localhost:3000"
  echo "Starting main celerate controller in dev mode at: " $ROOT_URL
elif [[ "$1" == "staging" ]]; then
  export ROOT_URL="http://staging.furtherreach.net:3000"
  echo "Starting main celerate controller in staging mode at: " $ROOT_URL
else
  export ROOT_URL="http://celerate-controller.furtherreach.net:3000"
  echo "Starting main celerate controller in prod mode at: " $ROOT_URL
fi

meteor -p 3000 --settings ../settings.js 
