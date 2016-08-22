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
    //var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);

    var latLng = new google.maps.LatLng(80, 0);
    var mapOptions = {
        center: latLng,
        zoom: 1,
        mapTypeId: 'terrain'
    };

    var map = new google.maps.Map(document.getElementById("map"), mapOptions);
//    google.maps.event.addListenerOnce($scope.map, 'idle', function(){
//
//        var marker = new google.maps.Marker({
//            map: $scope.map,
//            animation: google.maps.Animation.DROP,
//            position: latLng
//        })
//
//        var infoWindow = new google.maps.InfoWindow({
//        content: "Current Location"
//        });
//
//        google.maps.event.addListener(marker, 'click', function () {
//        infoWindow.open($scope.map, marker);
//        });
//
//    })
    var latLngArray = []
    var mapFunc = function(data){
        data.forEach(function(d){
            latLngArray.push({
                lat: +d.lat,
                lng: +d.lon
            });
        });
    };
    var shipTrack = new google.maps.Polyline({
        path: latLngArray,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2
    });
    shipTrack.setMap(map);
    
    var chartDiv = document.getElementById('chart-div');
    var divHeight = chartDiv.offsetHeight;
    var divWidth = chartDiv.offsetWidth;
    
    var padding = "30";
    
    //Initialise distance calculating function:
//    var getDistance = function(latlon){
//        var lat_point = latlon[0];
//        var lon_point = latlon[1];
//        var deg2rad = Math.pi/180;
//        
//        for(i = 0; i = (latlon[0].length - 1); i++){
//            console.log((i*100/latlon[0].length) + "%");
//            
//            //phi = 90 - lat
//            var phi1 = (90.0 - lat_point[i]) * deg2rad;
//            var phi2 = (90.0 - lat_point[i-1]) * deg2rad;
//            
//            //theta = lon
//            var theta1 = lon_point[i] * deg2rad;
//            var theta2 = lon_point[i-1] * deg2rad;
//            
//            var cos = (Math.sin(phi1) * Math.sin(phi2) * Math.cos(theta1 - theta2)) + (Math.cos(phi1) * Math.cos(phi2));
//            var arc = Math.acos(cos)*6371; //Radius of Earth.
//            latlon[2].push(arc);
//        };
//        
//        for(i = 1; i = (latlon[0].length - 1); i++){
//            var x = latlon[3][i-1] + latlon[2][i];
//            latlon[3].push(x);
//        };
//        console.log(latlon[3]);
//    };
    
    var plotFunc = function(data){
        //Initialise 2D array for lat, lon, dist., cum. dist.
        var route_array_scientific = [[],[]];
        
        //append appropriate data to array
        data.forEach(function(d){
            if(d.thick >= 0){
                route_array_scientific[1].push(d.cumdist);
                route_array_scientific[0].push(d.thick);
            } else {
                
            }
        });
        
        var xData = route_array_scientific[1];
        var yData = route_array_scientific[0];
        
        var vis = d3.select("#visualisation"),
            WIDTH = divWidth,
            HEIGHT = divHeight,
            MARGINS = {
                top: 15,
                right: 20,
                bottom: 50,
                left: 60
            },
            xScale = d3.scaleLinear()
            .range([MARGINS.left, WIDTH - MARGINS.right])
            .domain([0, Math.max(...xData)]),

            yScale = d3.scaleLinear()
            .range([HEIGHT - MARGINS.bottom, MARGINS.top])
            .domain([0, Math.max(...yData)]),

            xAxis = d3.axisBottom().scale(xScale).tickArguments([20, "s"]),
            yAxis = d3.axisLeft().scale(yScale).tickArguments([5, "s"]);

        vis.append("svg:g")
            .attr("class","axis")
            .attr("transform", "translate(0," +(HEIGHT - (MARGINS.bottom))+ ")")
            .call(xAxis);

            vis.append("svg:g")
            .attr("class","axis")
            .attr("transform", "translate(" + (MARGINS.left) + ",0)")
            .call(yAxis);

        var lineGen = d3.line().x(function(d, i) {
                return xScale(xData[i]);
            })
            .y(function(d, i) {
                return yScale(yData[i]);
            });

        // Add the valueline path.
        vis.append("svg:path")
        .attr("class", "line")
        .attr("stroke", "#00376d")
        .attr('stroke-width', 1)
        .attr("d", lineGen(xData))
        .attr("fill", "none");
        
        vis.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "middle")
        .attr("x", MARGINS.left + (WIDTH-MARGINS.left-MARGINS.right)/2)
        .attr("y", HEIGHT-(MARGINS.bottom/3))
        .text("Distance along route (m)");
        
        vis.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "middle")
        .attr("y", MARGINS.left/2.5)
        .attr("x", -MARGINS.top-(HEIGHT-MARGINS.top-MARGINS.bottom)/2)
        .attr("transform", "rotate(-90)")
        .text("life expectancy (years)");

    };
    
    d3.csv("res/scientific_route.csv", function(d){
        plotFunc(d);
        mapFunc(d);
    });
        

})

.controller('mapsCtrl2', function($scope, $state, $cordovaGeolocation, $rootScope, $window) {	
    

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

	  	$scope.isRecording = false;

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
	  			if($scope.isRecording){
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
                    $scope.isRecording = true;
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
                    $scope.isRecording = false;
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
