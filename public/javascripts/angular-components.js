angular.module('celerate', ['ngAnimate', 'mgcrea.ngStrap'])
.config(function($typeaheadProvider) { angular.extend($typeaheadProvider.defaults, { minLength: 6, limit: 4 });
})
.controller('MainCtrl', function($scope) { });

'use strict';

angular.module('celerate')
.controller('TypeaheadCtrl', function($scope, $templateCache, $http) {
  $scope.address = '';

  $scope.initHiddenFields = function() {
    $scope.hide_lookup_button = false;
    $scope.hide_signup_button = true;
    $scope.hide_unavailable = true;
    $scope.hide_address_alert = true;
  };
  $scope.initHiddenFields();
  
  $scope.getAddress = function(viewValue) {
    var params = {address: viewValue, sensor: false};
    return $http.get('https://maps.googleapis.com/maps/api/geocode/json', {params: params})
  .then(function(res) {
    return res.data.results;
  });
  };


  $scope.lookupAddress = function() {
    var params = {address: $scope.address, sensor: false};
    $scope.initHiddenFields();

    $http.get('https://maps.googleapis.com/maps/api/geocode/json', {params: params})
         .then(function(res) {
           address_info = res.data.results;

           if (address_info[0].types[0] != "street_address") {
             $scope.hide_address_alert = false;
           } else {
             loc = address_info[0].geometry['location'];

             $scope.processLocation(loc, address_info[0]);
           }
         });
  };

  $scope.processLocation = function(loc, address_info) {
    var dist_limit = 50;
    var berkeley = {lat : 37.859684, lng : -122.253026};
    var soledad = {lat : 36.424547, lng : -121.326271};
    var english_hill = {lat : 38.34629, lng : -122.862105};
    var manchester = {lat : 38.9699164, lng : -123.6869288};

    var dist_from_soledad = $scope.calculateDistance(loc, soledad);
    var dist_from_english_hill = $scope.calculateDistance(loc, english_hill);
    var dist_from_manchester = $scope.calculateDistance(loc, manchester);

    if (dist_from_soledad < dist_limit) {
      console.log("Soledad");
    }

    if (dist_from_english_hill < dist_limit) {
      console.log("English Hill");
    }

    if (dist_from_manchester < dist_limit) {
      console.log("Manchester");
    }

    var min_dist = Math.min(dist_from_soledad, dist_from_english_hill, dist_from_manchester);
    if (min_dist < dist_limit) {
      $scope.hide_signup_button = false;
      $scope.hide_unavailable = true;

      // Parse out the street address.
      var components = address_info['address_components']; 
      var street_number = "";
      var street_name = "";
      var city = "";
      var state = "";
      for (c in components) {
        if (components[c]['types'][0] == 'street_number') {
          street_number = components[c]['long_name'];
        }
        if (components[c]['types'][0] == 'route') {
          street_name = components[c]['long_name'];
        }
        if (components[c]['types'][0] == 'locality') {
          city = components[c]['long_name'];
        }
        if (components[c]['types'][0] == 'administrative_area_level_1') {
          state = components[c]['short_name'];
        }
      }
      $("#streetAddress").val(street_number + " " + street_name);
      $("#city").val(city);
      $("#state").val(state);
    } else {
      $scope.hide_signup_button = true;
      $scope.hide_unavailable = false;
    }
  };

  // Returns distance in km between the two given locations.
  $scope.calculateDistance = function(loc1, loc2) {
    var lat1 = loc1.lat;
    var lon1 = loc1.lng;
    var lat2 = loc2.lat;
    var lon2 = loc2.lng;

    var R = 6371; // Radius of the earth in km
    var dLat = (lat2 - lat1) * Math.PI / 180;  // deg2rad below
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = 
      0.5 - Math.cos(dLat)/2 + 
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      (1 - Math.cos(dLon))/2;

    return R * 2 * Math.asin(Math.sqrt(a));
  };

});

