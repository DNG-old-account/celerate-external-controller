#!/bin/bash
MONGO_URL="mongodb://localhost:3001/meteor"

if [[ "$1" == "dev" ]]; then 
  export ROOT_URL="http://localhost:3002"
else
  export ROOT_URL="http://celerate-controller.furtherreach.net:3002"
fi

meteor -p 3002 --settings ../settings.js 
