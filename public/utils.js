// convenient utility function by Ashley Ford http://papermashup.com/read-url-get-variables-withjavascript/
(function(exports){

exports.getUrlVars = function () {
  var vars = {};
  var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
    vars[key] = value;
  });
  return vars;
}


})(typeof exports === 'undefined'? this['utils']={}: exports);
