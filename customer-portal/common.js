// Generates a MongoDB sort specification given fields to sort on.
GenerateHeaderSort = function(sort_fields, sort_fields_to_label, primary_sort_field_key) {
  var SortFieldToSpec = function(sort_field) {
    return [sort_fields_to_label[sort_field], Session.get(sort_field) == 1 ? "asc" : "desc"];
  };

  var sort_spec = [];
  var primary_sort_field = Session.get(primary_sort_field_key);
  sort_spec.push(SortFieldToSpec(primary_sort_field));
  for (s in sort_fields) {
    if (sort_fields[s] != primary_sort_field) {
      sort_spec.push(SortFieldToSpec(sort_fields[s]));
    }
  }

  return sort_spec;
};

Handlebars.registerHelper('toupper', function(obj) {
  console.log(obj.toUpperCase());
  return obj.toUpperCase();
});

Handlebars.registerHelper('capitalize', function(obj) {
  if (typeof obj !== "string") {
    return obj
  }
  obj = obj.trim();
  return obj.slice(0, 1).toUpperCase() + obj.slice(1);
});

Handlebars.registerHelper('json', function(obj) {
  function syntaxHighlight(json) {
    if (typeof json != 'string') {
      json = JSON.stringify(json, undefined, 2);
    }
    if (typeof json === 'string') {
      json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
        if (/:$/.test(match)) {
          cls = 'key';
        } else {
          cls = 'string';
        }
        } else if (/true|false/.test(match)) {
          cls = 'boolean';
        } else if (/null/.test(match)) {
          cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
        });
    }
  }
  var str = JSON.stringify(obj, undefined, 4);
  return syntaxHighlight(str);
});

Handlebars.registerHelper('key_value', function(context, options) {
  var result = [];
  _.each(context, function(value, key, list){
    result.push({key:key, value:value});
  })
  return result;
});

Handlebars.registerHelper('key_value', function(context, options) {
  var result = [];
  _.each(context, function(value, key, list){
    result.push({key:key, value:value});
  })
  return result;
});

Handlebars.registerHelper('selected_if_equal', function(val1, val2) {
  if (val1 == val2) return "selected";
  return "";
});

Handlebars.registerHelper('selected_if_empty', function(val) {
  if (!val || val == "") return "selected";
  return "";
});

Handlebars.registerHelper("formatMoney", function(amount) {
  return parseFloat(amount).formatMoney(2, '.', ',');
});

Handlebars.registerHelper("formatDate", function(datetime, format) {
  return moment(datetime).format(format);
});

