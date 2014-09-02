var dblib = require('./dblib');
var uP = require('micropromise');
var url = require('url');

// TODO(barath): Enable this to enable creating a zendesk ticket when a lead
//               comes in via this call.
var enableZenDesk = false;

// Set up a zendesk client.
var zendesk = require('node-zendesk');
var client = zendesk.createClient({
  username:  'barath@denovogroup.org',
  token:     'WNqdztarJYV7WUq9b7MSgFu8kAk0KJeNKaO958P5',
  remoteUri: 'https://furtherreach.zendesk.com/api/v2'
});

// Generates and returns the body of the zendesk ticket based upon the new lead
// request.
function generateUserTicketBody(requestBody) {
  var bodyStr = "";
  bodyStr += "Full Name: " + requestBody["full name"] + "\n";
  bodyStr += "Street Address: " + requestBody["location"]["street address"] + "\n";
  bodyStr += "City: " + requestBody["location"]["city"] + "\n";
  bodyStr += "Phone: " + requestBody["phone"] + "\n";
  bodyStr += "Time to Call: " + requestBody["timetocall"] + "\n";
  bodyStr += "Plan: " + requestBody["plan"] + "\n";
  if ("email" in requestBody) {
    bodyStr += "Email: " + requestBody["email"] + "\n\n";
  }
  bodyStr += "Map: https://maps.google.com/maps?q=" + escape(requestBody["location"]["street address"] + " " + requestBody["location"]["city"]);
  
  return bodyStr;
}

// Add a new lead based upon the given request.
function handleNewLead(req, res) {
  // Change the subscribed string to a boolean if needed.
  if (req.body.subscribed == "false") {
    req.body.subscribed = false;
  } else if (req.body.subscribed == "true") {
    req.body.subscribed = true;
  }

  console.log("got new lead POST " + JSON.stringify(req.body));
 
  // Create a ZenDesk ticket.
  if (enableZenDesk) {
    var ticket = { ticket: { 
      requester: { name : "Web User", email : "barath@denovogroup.org" },
      subject: "New User Signup: " + req.body["full name"],
      priority: "high",
      tags: "do_not_email",
      comment: { body: generateUserTicketBody(req.body) },
    }};

    client.tickets.create(ticket, function(err, req, result) {
      if (err) {
        res.json(404, "But we had an error -- please try again.");
        return;
      }

      console.log(JSON.stringify(result, null, 2, true));
      res.json(200, "We'll be in touch!");
    });
  }

  // Add an entry in our local lead/user DB.
  newLeadUser = {
    'full name' : req.body["full name"],
    'location' : { 'street address' : req.body["location"]["street address"], 'city' : req.body["location"]["city"] },
    'plan' : req.body["plan"],
    'contact' : { 'email' : req.body["email"], 'mobile' : req.body["phone"] },
    'subscribed' : false
  };
  dblib.db.document.create('subscriber', newLeadUser).then(function(result) {
    console.log("Added new lead from web to DB: " + JSON.stringify(newLeadUser));
  }, function(err) {
      console.log("Error: " + err);
  });
}

exports.handle = function(req, res) {
  handleNewLead(req, res);
};
