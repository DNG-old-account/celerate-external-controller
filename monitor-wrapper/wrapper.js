var fs = require('fs');
var handlebars = require('handlebars');
var http = require('http');
var sys = require('sys');
var exec = require('child_process').exec;
var request = require('request');
var querystring = require('querystring');
require('request').debug = true;
module.exports = {
  update: function(nodes) {
    fs.readFile('/opt/celerate-external-controller/monitor-wrapper/icinga_nodes_template.cfg', {encoding: 'utf-8'}, function (err, data) {
      if (err) throw err;
      handlebarsString = data;

      var context = {
        nodes: nodes
      };
          
      compiled = handlebars.compile(handlebarsString)(context);
      console.log(compiled);
      fs.writeFile('/etc/icinga/objects/furtherreach_nodes_test_icinga.cfg', compiled, function (err) {
        if (err) throw err;
        console.log('Updated');

        function puts(error, stdout, stderr) { sys.puts(stdout) }
        exec("service icinga restart", puts);
      });
    });
  },
  getStatus: function(callback) {
    var postData = {
      target: 'host',
      authkey: 'auth_key',
      columns: 'HOST_NAME|HOST_CURRENT_STATE'
    }
    var postString = querystring.stringify(postData);
    var contentLength = postString.length;
    var url = 'http://localhost/icinga-web/web/api/authkey=auth_key/json';
    request.post({
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': contentLength
      },
      uri: url,
      body: postString,
      method: 'POST',
    },
    function requestCallback (err, httpResponse, body) {
      if (err) {
        return console.error('failed: ', err);
      }
      console.log('results: ', body);
      callback(body.result);
    });
  },
};
