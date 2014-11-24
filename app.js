var auth = 'Basic ZGVtb0B0aW55LW1lc2guY29tOksyOjEwbVMuMw==';
angular.module('CarControl', ['tmCloudClient', 'angular-loading-bar'], function($provide) {
      $provide.value('endpoint', 'http://31.169.50.34:8080');
      //$provide.value('endpoint', 'http://localhost:4000');
   })
	.config(function($httpProvider, $provide) {
		$httpProvider.interceptors.push(function($q) {
			return {
				request: function(config, headers) {
					config.headers['Authorization'] = auth;
					return config || $q.when(config);
				}
			};
		});
	})
   .config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
   }])
   .controller('AppController', function($scope, $location, $q,
         tmNet, tmMsg, tmUser, tmMsgStreamQuery) {

		$scope.Math = Math;
		$scope.user = tmUser.get();
      $scope.collapseNets = false;
      $scope.net = undefined;
      $scope.$location = $location;
		var eventsrc = undefined;

		$scope.setGPIOs = function(network, device, gpio) {
			new tmMsg({"proto/tm": {
				"type": "command",
			 	"command": "set_output",
			 	"gpio": gpio
		 	}}).$create({network: network, device: device});
		};

      $scope.setNet = function(k, nosearch) {
			if (eventsrc) {
				eventsrc.close();
			};

         nosearch || $location.search('network', k);
         tmNet.get({id: k}).$promise.then(function(net) {
            $scope.net = angular.copy(net);
            $scope.collapseNets = true;
         });
      };

		$scope.reset = function(dev) {
			new tmMsg({"proto/tm": {
				"type": "command",
			 	"command": "force_reset",
		 	}}).$create({network: $scope.net.key, device: dev});
		};

		$scope.connect = function(mapping) {
			// for demo lights
			var mapping = {
				"1XOfiz0fly": "qM109ONk0",
				"qM109ONk0": "1XOfiz0fly",
			};
			var state = {
				"1XOfiz0fly": false,
				"qM109ONk0": false,
			};
			$scope.players = ["1XOfiz0fly", "qM109ONk0"];
			$scope.state = {
				"1XOfiz0fly": 0,
				"qM109ONk0": 0
			};
			$scope.util = {
				"1XOfiz0fly": 0,
				"qM109ONk0": 0
			};

			var i = 1;
			$scope.reset($scope.players[0]);
			$scope.reset($scope.players[1]);

			$scope.eventsrc = tmMsgStreamQuery({network: $scope.net.key, authorization: auth});
			$scope.eventsrc.addEventListener('msg', function(e) {
				var data = JSON.parse(e.data);
				if (data['proto/tm'] && 'io_change' === data['proto/tm'].detail) {
				   var target = mapping[data.selector[1]];
					state[target] = !state[target];
					$scope.setGPIOs(data.selector[0], mapping[data.selector[1]], {"gpio_0": state[target]});
				}

				if (data['proto/tm'] && 'ima' === data['proto/tm'].detail) {
					$scope.$apply(function() {
						var prev = $scope.state[data.selector[1]],
							 diff = data['proto/tm'].data - prev;
						$scope.state[data.selector[1]] = data['proto/tm'].data;
						$scope.util[data.selector[1]] = (diff/ 100) * 100;

						if (0 === i++ % 2) {
							if ($scope.util[$scope.players[0]] > $scope.util[$scope.players[1]]) {
								$scope.message = "Player #1 Moves ahead!!!!!";
								$scope.forward();
							} else if ($scope.util[$scope.players[0]] < $scope.util[$scope.players[1]]) {
								$scope.message = "Player #2 WINS!!!!!";
								$scope.backward();
							} else {
								$scope.message = "It's a tie!!!";
								$scope.stop();
							}

						}
					});
				}
			});
		};

		$scope.disconnect = function() {
			$scope.stop();
			$scope.eventsrc.close();
			delete $scope.eventsrc;
		};

      if ($location.search().network) {
         $scope.setNet($location.search().network, true);
      }

		 $scope.provision = function(sel) {
         var msg = new tmMsg();
         msg["proto/tm"] = {
            "type": "command",
            "command": "set_config",
            "config": {
               "gpio_0": {"config": 4},
               "gpio_1": {"config": 4},
               "gpio_4": {"config": 1, trigger: 2},
               "gpio_6": {"config": 4},
               "gpio_7": {"config": 3}
            }
           };

           msg.$create({network: sel[0],
                        device: sel[1]});
      };

		// Forover: GPIO 1 = 1, default = 0
		// Bakover: GPIO 0 = 1,  default= 0
		// Baklys på: GPIO 6 = 1, default = 0
		// Dim: GPIO 7, default  = 0

		$scope.car = "2cmdPzQQab";
		$scope.putpwm = function(pwm) {
			if (pwm < 0 || pwm > 100) return;

			new tmMsg({"proto/tm": {
				"type": "command",
			 	"command": "set_pwm",
			 	"pwm": Math.abs(pwm - 100),
		 	}}).$create({network: $scope.net.key, device: $scope.car});
		};

		$scope.backward = function() {
			$scope.setGPIOs($scope.net.key, $scope.car, {"gpio_0": true, "gpio_1": false, "gpio_6":false})
			setTimeout(function(){
				$scope.stop(true);
			}, 00);
		};

		$scope.forward = function() {
			$scope.setGPIOs($scope.net.key, $scope.car, {"gpio_0": false, "gpio_1": true, "gpio_6":false})
			setTimeout(function(){
				$scope.stop(true);
			}, 00);
		};

		$scope.stop = function(t) {
			t = undefined === t ? true : t;
			$scope.setGPIOs($scope.net.key, $scope.car, {"gpio_0": t, "gpio_1": t, "gpio_6":true})
		};

   })
   .directive('modal', function () {
      return {
         template: '<div class="modal fade">' +
            '<div class="modal-dialog">' +
               '<div class="modal-content">' +
                  '<div class="modal-header">' +
//                     '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>' + 
                     '<h4 class="modal-title">{{ title }}</h4>' +
                  '</div>' +
                  '<div class="modal-body" ng-transclude></div>' +
                  '</div>' +
               '</div>' +
            '</div>',
            restrict: 'E',
            transclude: true,
            replace:true,
            scope:true,
            link: function postLink(scope, element, attrs) {
               scope.title = attrs.title;

               scope.$watch(attrs.visible, function(value) {
                  if(value == true)
                     $(element).modal('show');
                  else
                     $(element).modal('hide');
               });

               $(element).on('shown.bs.modal', function(){
                     scope.$parent[attrs.visible] = true;
               });

               $(element).on('hidden.bs.modal', function(){
                     scope.$parent[attrs.visible] = false;
               });
            }
      };
   });
