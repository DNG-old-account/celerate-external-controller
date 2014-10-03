#!/bin/sh
export MONGO_URL="mongodb://localhost:3001/meteor"
meteor -p 3000 --settings ../settings.js 
