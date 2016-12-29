angular.module('app.services', [])

.service('routeService', [function(){
    this.selectedRoute;
    this.selectedIce;
    this.type;
    this.iceData;
    this.selectedQuad;
    this.iceSeason;
    this.intervalTime;
}])

.factory('BlankFactory', [function(){

}]);

// .factory('bgGeoService',function($rootScope){
//   return {
  
//   initialize : function($scope, $cordovaBackgroundGeolocation, $cordovaFile, routeService){

//   var bgGeo = window.plugins.backgroundLocationServices;
//   console.log(JSON.stringify(window.plugins));

//     /**
//     * This callback will be executed every time a geolocation is recorded in the background.
//     */
//     var callbackFn = function(location, taskId) {
//         var coords = location.coords;
//         var lat    = coords.latitude;
//         var lng    = coords.longitude;

//         console.log("[BackgroundGeo] Location updated - Position:  " + JSON.stringify(location));
//         var coordEntry = '{"lat":' + parseFloat(lat) + ',"lon":' + parseFloat(lng) + '},';
//         $cordovaFile.writeExistingFile($scope.fileDir, $scope.fileName, coordEntry, true);

//         bgGeo.finish(taskId);
//     };

//     var failureFn = function(error) {
//         console.log('BackgroundGeoLocation error');
//     }

//     // BackgroundGeoLocation is highly configurable.
//     bgGeo.configure(callbackFn, failureFn, {
//         // Geolocation config
//         desiredAccuracy: 20,
//         stationaryRadius: 0,
//         distanceFilter: 0,
//         disableElasticity: false, // <-- [iOS] Default is 'false'.  Set true to disable speed-based distanceFilter elasticity
//         locationUpdateInterval: routeService.intervalTime,
//         minimumActivityRecognitionConfidence: 10,   // 0-100%.  Minimum activity-confidence for a state-change 
//         fastestLocationUpdateInterval: routeService.intervalTime,
//         activityRecognitionInterval: 1,
//         stopDetectionDelay: 1,  // Wait x minutes to engage stop-detection system
//         stopTimeout: 1,  // Wait x miutes to turn off location system after stop-detection
//         activityType: 'AutomotiveNavigation',

//         // Application config
//         debug: true, // <-- enable this hear sounds for background-geolocation life-cycle.
//         forceReloadOnLocationChange: false,  // <-- [Android] If the user closes the app **while location-tracking is started** , reboot app when a new location is recorded (WARNING: possibly distruptive to user) 
//         forceReloadOnMotionChange: false,    // <-- [Android] If the user closes the app **while location-tracking is started** , reboot app when device changes stationary-state (stationary->moving or vice-versa) --WARNING: possibly distruptive to user) 
//         forceReloadOnGeofence: false,        // <-- [Android] If the user closes the app **while location-tracking is started** , reboot app when a geofence crossing occurs --WARNING: possibly distruptive to user) 
//         stopOnTerminate: false,              // <-- [Android] Allow the background-service to run headless when user closes the app.
//         startOnBoot: true,                   // <-- [Android] Auto start background-service in headless mode when device is powered-up.

//         // HTTP / SQLite config
//         url: 'https://www.somerandomurl.com1234',
//         method: 'POST',
//         batchSync: false,       // <-- [Default: false] Set true to sync locations to server in a single HTTP request.
//         autoSync: true,         // <-- [Default: true] Set true to sync each location to server as it arrives.
//         maxDaysToPersist: 1  ,  // <-- Maximum days to persist a location in plugin's SQLite database when HTTP fails
//         // headers: {
//         //     "X-FOO": "bar"
//         // },
//          //params: {
//              // Add your parameters here 
//          //}
//        });

//   bgGeo.changePace(true); // Setting pace to fast to enable aggresive tracking as soon as the plugin is started
//                           // Comment it to enable default behaviour
   
  
//   $rootScope.bgGeo = bgGeo;
//     // Turn ON the background-geolocation system.  The user will be tracked whenever they suspend the app.
//     // bgGeo.start();

//     // If you wish to turn OFF background-tracking, call the #stop method.
//     // bgGeo.stop()

//     },
//   start : function(){
//       $rootScope.bgGeo.start();
//     },
//   stop : function(){
//       $rootScope.bgGeo.stop();  
//     }
  
//     }
// })
