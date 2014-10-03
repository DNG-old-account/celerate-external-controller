#!/bin/sh
export MONGO_URL="mongodb://localhost:3001/meteor"
meteor -p 3002 --settings ../settings.js 
