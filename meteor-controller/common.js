GenerateHeaderSort = function(sort_fields, sort_fields_to_label) {
  var SortFieldToSpec = function(sort_field) {
    return [sort_fields_to_label[sort_field], Session.get(sort_field) == 1 ? "asc" : "desc"];
  };

  var sort_spec = [];
  var primary_sort_field = Session.get("primary_sort_field");
  sort_spec.push(SortFieldToSpec(primary_sort_field));
  for (s in sort_fields) {
    if (sort_fields[s] != primary_sort_field) {
      sort_spec.push(SortFieldToSpec(sort_fields[s]));
    }
  }

  console.log(JSON.stringify(sort_spec));
  return sort_spec;
};

Handlebars.registerHelper('json', function(obj) {
  return JSON.stringify(obj);
});
