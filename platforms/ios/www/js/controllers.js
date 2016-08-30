angular.module('app.controllers', [])
  
.controller('homeCtrl', function($scope) {

	$scope.cryosatSite = function(){
		window.open("http://www.esa.int/Our_Activities/Observing_the_Earth/CryoSat/Facts_and_figures", '_system');
	}

	$scope.blogSite = function(){
		window.open("http://cpom.leeds.ac.uk/cpom-blog/", '_system');
	}

})
   
.controller('mapsCtrl', function($scope, $state, $cordovaGeolocation) {

		var options = {timeout: 10000, enableHighAccuracy: true};
 
		$cordovaGeolocation.getCurrentPosition(options).then(function(position){

			var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
 
			var mapOptions = {
				center: latLng,
				zoom: 15,
				mapTypeId: google.maps.MapTypeId.ROADMAP
			};
 
		$scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);
		google.maps.event.addListenerOnce($scope.map, 'idle', function(){

			var marker = new google.maps.Marker({
				map: $scope.map,
				animation: google.maps.Animation.DROP,
				position: latLng
			})

			var infoWindow = new google.maps.InfoWindow({
      		content: "Current Location"
  			});
 
  			google.maps.event.addListener(marker, 'click', function () {
      		infoWindow.open($scope.map, marker);
  			});

		})
 
	}, function(error){
		console.log("Could not get location");
	});
})

.controller('mapsCtrl2', function($scope, $state, $cordovaGeolocation, $rootScope) {

	

})
   
.controller('marineTrafficCtrl', function($scope) {

})

.controller('seaIceCtrl', function($scope){

})

.controller('routeTrackCtrl', function($scope, $ionicPlatform, $cordovaToast, $ionicPopup, $cordovaBackgroundGeolocation, $window, $cordovaGeolocation){

	$scope.lat_geo = "Loading Lat...";
  	$scope.long_geo = "Loading Long...";

  	$ionicPlatform.ready(function(){
  		console.log("[IONIC PLATFORM IS NOW READY]");

  		var options = {
	    	enableHighAccuracy : true,
	    	desiredAccuracy: 10,
	    	stationaryRadius: 0,
	    	distanceFilter: 0,
	    	notificationTitle: 'CryoSat Application', // <-- android only, customize the title of the notification
	    	notificationText: 'Location tracking enabled.', // <-- android only, customize the text of the notification
	    	activityType: 'AutomotiveNavigation',
	    	debug: true, // <-- enable this hear sounds for background-geolocation life-cycle.
	    	stopOnTerminate: false // <-- enable this to clear background location settings when the app terminates
  		};

  		var optionsGeo = {
  			enableHighAccuracy: true,
  			timeout: 10000
  		};

  		$cordovaGeolocation.getCurrentPosition(optionsGeo).then(function(position){
  			console.log('[GEOLOCAL JS1] Location from Geolocation.');
  			$scope.lat_geo = position.coords.latitude;
  			$scope.long_geo = position.coords.longitude;
  		});
  	
	  	var callbackFn = function(location) {
	        console.log('[BackgroundGeoLocation] Update callback:  ' + location.latitude + ',' + location.longitude);
	        console.log('[BG CALLBACK DUDE]');
	        var alertPopup = $ionicPopup.alert({
	        	title: 'Location Update Successful',
	        	template: 'The location updated successfully and has been saved to the database.'
	        });
	        alertPopup.then(function(res){
	        });
	    };

	  	var failureFn = function(error) {
	        console.log('[BackgroundGeoLocation] Error: '+error);
	        var alertPopup = $ionicPopup.alert({
	        	title: 'Location Update Failed',
	        	template: 'There was an error attempting to update the location. Error code: ' + error
	        });
	        alertPopup.then(function(res){
	        });
	    };

	    $cordovaBackgroundGeolocation.configure(callbackFn, failureFn, options);
	    $cordovaBackgroundGeolocation.stop();

		$scope.startGeolocation = function(){
			var confirmPopup = $ionicPopup.confirm({
	     		title: 'Location Tracking',
	     		template: 'Do you want to begin recording your location?'
	   		});
	   		confirmPopup.then(function(res) {
	   			if(res){
	   				$cordovaBackgroundGeolocation.start();
	            	console.log('[BackgroundGeo] Tracking started.');
	        	} else {
	        		//return
	        		console.log('[BackgroundGeo] Begin tracking cancelled by user.');
	        	}
	        });
			
		};

		$scope.stopGeolocation = function(){
			var confirmPopup = $ionicPopup.confirm({
	     		title: 'Location Tracking',
	     		template: 'Are you sure you want to stop recording your location?'
	   		});
	   		confirmPopup.then(function(res) {
	   			if(res){
	   				$cordovaBackgroundGeolocation.stop();
	            	console.log('[BackgroundGeo] Tracking stopped.');
	        	} else {
	        		//return
	        		console.log('[BackgroundGeo] End tracking cancelled by user.');
	        	}
	        });
			
		};

  	});



})

.controller('aboutCtrl', function($scope){
	$scope.leedsSite = function(){
		window.open("http://cpom.leeds.ac.uk", '_system');
	}
	$scope.uclSite = function(){
		window.open("http://www.cpom.ucl.ac.uk/csopr/seaice.html", '_system');
	}
})

.controller('settingsCtrl', function($scope){
	
})
    