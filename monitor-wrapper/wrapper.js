fs = require('fs');
handlebars = require('handlebars');
var sys = require('sys')
var exec = require('child_process').exec;
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
  get: function() {
    console.log('list node status');
  },
};
