mongoexport -h localhost --port 3001 --jsonArray -d "meteor" -c "subscribers" -q "{}" --fields "_id,street_address,city" > subscribers_location.json
