#!/bin/bash

if [[ "$1" == "dev" ]]; then 
  ROOT_URL="http://localhost:3002"
else
  ROOT_URL="http://celerate-website.furtherreach.net:3000"
fi

meteor -p 3000 --settings ../settings.js 
