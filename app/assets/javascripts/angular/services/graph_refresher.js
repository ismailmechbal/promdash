angular.module("Prometheus.services").factory('GraphRefresher',
                                              ["$http",
                                               "$q",
                                               "VariableInterpolator",
                                               function($http,
                                                        $q,
                                                        VariableInterpolator) {
  return function($scope) {
    function loadGraphData(idx, expression, server, expressionID, allData) {
      var rangeSeconds = Prometheus.Graph.parseDuration($scope.graph.range);
      var url = document.createElement('a');
      url.href = server.url;
      url.pathname = 'api/query_range'
      return $http.get(url.href, {
        params: {
          expr: expression,
          range: rangeSeconds,
          end: Math.floor($scope.graph.endTime / 1000),
          step: Math.max(Math.floor(rangeSeconds / 250))
        },
        cache: false
      }).success(function(data, status) {
        switch(data.Type) {
          case 'error':
            var errMsg = "Expression " + (idx + 1) + ": " + data.Value;
            $scope.errorMessages.push(errMsg);
            break;
          case 'matrix':
            allData[idx] = {
              'exp_id': expressionID,
              'data': data
            };
            break;
          default:
            var errMsg = 'Expression ' + (idx + 1) + ': Result type "' + data.Type + '" cannot be graphed."';
            $scope.errorMessages.push(errMsg);
        }
      }).error(function(data, status, b) {
        var errMsg = "Expression " + (idx + 1) + ": Server returned status " + status + ".";
        $scope.errorMessages.push(errMsg);
      });
    }

    return function() {
      var deferred = $q.defer();
      var promises = [];
      var allData = [];
      $scope.errorMessages = [];
      for (var i = 0; i < $scope.graph.expressions.length; i++) {
        var exp = $scope.graph.expressions[i];
        var server = $scope.serversById[exp['serverID']];
        if (server == undefined) {
          console.log('No server selected for expression, skipping.');
          continue;
        }
        var expression = VariableInterpolator(exp.expression, $scope.vars);
        $scope.requestsInFlight = true;
        promises.push(
          loadGraphData(i, expression, server, exp.id, allData)
        );
      }
      $q.all(promises).then(function() {
        $scope.requestsInFlight = false;
        deferred.resolve(allData);
      });
      return deferred.promise;
    };
  };
}]);
