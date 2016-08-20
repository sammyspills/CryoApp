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

.controller('mapsCtrl2', function($scope, $state, $cordovaGeolocation, $rootScope, $window) {

//	TESTER = document.getElementById('test-chart');
//	Plotly.plot(TESTER, [{
//		x: [1, 2, 3, 4, 5],
//		y: [1, 2, 4, 8, 16] }], {
//			margin: {t:0}});	
    
    var innerHeight = $window.innerHeight;
    var innerWidth = $window.innerWidth;
    var padding = "30";
    console.log(innerHeight + ',  ' + innerWidth)
    
    var data = [{
    "sale": "202",
    "year": "2000"
    }, {
    "sale": "215",
    "year": "2001"
    }, {
    "sale": "179",
    "year": "2002"
    }, {
    "sale": "199",
    "year": "2003"
    }, {
    "sale": "134",
    "year": "2003"
    }, {
    "sale": "176",
    "year": "2010"
    }];
    
    var data2 = [{
    "sale": "152",
    "year": "2000"
    }, {
    "sale": "189",
    "year": "2002"
    }, {
    "sale": "179",
    "year": "2004"
    }, {
    "sale": "199",
    "year": "2006"
    }, {
    "sale": "134",
    "year": "2008"
    }, {
    "sale": "176",
    "year": "2010"
    }];

    var vis = d3.select("#visualisation"),
        WIDTH = innerWidth,
        HEIGHT = 600,
        MARGINS = {
            top: 20,
            right: 20,
            bottom: 20,
            left: 50
        },
        xScale = d3.scaleLinear().range([MARGINS.left, WIDTH - MARGINS.right]).domain([2000,2010]),
        yScale = d3.scaleLinear().range([HEIGHT - MARGINS.top, MARGINS.bottom]).domain([134,215]),
        xAxis = d3.axisBottom().scale(xScale),
        yAxis = d3.axisLeft().scale(yScale);
    
    vis.append("svg:g")
    .attr("class","axis")
    .attr("transform", "translate(0," +(HEIGHT - MARGINS.bottom)+ ")")
    .call(xAxis);
    
    vis.append("svg:g")
    .attr("class","axis")
    .attr("transform", "translate(" + (MARGINS.left) + ",0)")
    .call(yAxis);
    
    var lineGen = d3.line()
        .x(function(d) {
            return xScale(d.year);
        })
        .y(function(d) {
            return yScale(d.sale);
        })
        .curve(d3.curveBasis);
    
    vis.append('svg:path')
        .attr('d', lineGen(data))
        .attr('stroke', 'green')
        .attr('stroke-width', 2)
        .attr('fill', 'none');
    
    vis.append('svg:path')
      .attr('d', lineGen(data2))
      .attr('stroke', 'blue')
      .attr('stroke-width', 2)
      .attr('fill', 'none');

})
   
.controller('marineTrafficCtrl', function($scope) {

})

.controller('seaIceCtrl', function($scope){

})

.controller('routeTrackCtrl', function($scope, $ionicPlatform, $cordovaToast, $ionicPopup, $window, $cordovaGeolocation, $interval){

	$scope.lat_geo = "Loading Lat...";
  	$scope.long_geo = "Loading Long...";

  	$ionicPlatform.ready(function(){
  		console.log("[IONIC PLATFORM IS NOW READY]");

  		var bgGeo = window.plugins.backgroundLocationServices;

  		var optionsGeo = {
	  		enableHighAccuracy: true,
	  		timeout: 10000
	  	};

  		$cordovaGeolocation.getCurrentPosition(optionsGeo).then(function(position){
	  		console.log('[GEOLOCAL JS1] Location from Geolocation.');
	  		$scope.lat_geo = position.coords.latitude;
	  		$scope.long_geo = position.coords.longitude;
	  	});

	  	var isRecording = false;

	  	// TODO: Set interval to 1 hour. Set debug = false.
	  	bgGeo.configure({
	     	//Both
	     	desiredAccuracy: 20, // Desired Accuracy of the location updates (lower means more accurate but more battery consumption)
	     	distanceFilter: 0, // (Meters) How far you must move from the last point to trigger a location update
	     	debug: true, // <-- Enable to show visual indications when you receive a background location update
	     	interval: 5000, // (Milliseconds) Requested Interval in between location updates.
	     	useActivityDetection: false, // Uses Activitiy detection to shut off gps when you are still (Greatly enhances Battery Life)

	     	//Android Only
	     	notificationTitle: 'CryoSat Application', // customize the title of the notification
	     	notificationText: 'Location tracking enabled.', //customize the text of the notification
	     	fastestInterval: 5000 // <-- (Milliseconds) Fastest interval your app / server can handle updates

		});

		bgGeo.registerForLocationUpdates(function(location) {
	     	console.log("[BackgroundGeo] Location updated - Position:  " + JSON.stringify(location));
		}, function(err) {
	     	console.log("[BackgroundGeo] Error: Didnt get an update.", err);
		});

  		var onPause = function(){

  			console.log('[BackgroundGeo] onPause success.')

		};

		var onResume = function(){

	  		var getLocation = function(){
	  			if(isRecording){
	  				$cordovaGeolocation.getCurrentPosition(optionsGeo).then(function(position){
	  					console.log('[ForegroundGeo] Location updated - Position: latitude - ' + position.coords.latitude + ', longitude - ' + position.coords.longitude);
	  					$scope.lat_geo = position.coords.latitude;
	  					$scope.long_geo = position.coords.longitude;
	  				})
	  			} else {
	  				console.log('[ForegroundGeo] getLocation called, location tracking disabled.')
	  			}	  			

	  		};

	  		console.log('[ForegroundGeo] onResume success.');
	  		$interval(getLocation, 5000);

		};

		document.addEventListener("pause", onPause, false);
  		document.addEventListener("resume", onResume, false);

  		$scope.startGeolocation = function(){
			var confirmPopup = $ionicPopup.confirm({
		     	title: 'Location Tracking',
		     	template: 'Do you want to begin recording your location?'
		   	});
		   	confirmPopup.then(function(res) {
		   		if(res){
		   			bgGeo.start();
		   			isRecording = true;
		            console.log('[BackgroundGeo] Tracking started.');
		            onResume();
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
		   			bgGeo.stop();
		   			isRecording = false;
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
    