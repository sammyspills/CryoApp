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
    
    var topoDiv = document.getElementById("topo-div");
    var topoHeight = topoDiv.offsetHeight;
    var topoWidth = topoDiv.offsetWidth;
    
    var topoFunc = function(data){
        
        var route_points = [[],[]];
        data.forEach(function(d){
            route_points[0].push(d.lat);
            route_points[1].push(d.lon);
        });
        
        var vis = d3.select("#topo-vis"),
            WIDTH = topoWidth,
            HEIGHT = topoHeight,
            PADDING = 0;
        
        var minDim = Math.min(WIDTH, HEIGHT);
        var maxDim = Math.max(WIDTH, HEIGHT);
        var Arctic = {
                          "type": "Feature",
                          "geometry": {
                            "type": "MultiPoint",
                            "coordinates": [[0,60],[180,60]]
                          },
                          "properties": {
                            "name": "Arctic"
                          }
                    };
        
        var projection = d3.geoStereographic()
            .rotate([0, -90])
            .center([0, 90])
            .fitSize([WIDTH,HEIGHT],Arctic)
            .precision(1);
        
        vis.append("svg")
            .attr("width", WIDTH)
            .attr("height", HEIGHT);
        
        vis.append("svg:image")
            .attr('width', WIDTH)
            .attr('height', HEIGHT)
            .attr('x','-4%')
            .attr('y','-4%')
            .attr("transform", "scale(1.08)")
            .attr("xlink:href","img/ice_thickness/28_spring_2016.png");
        
        var path = d3.geoPath()
            .projection(projection);
        
        var graticule = d3.geoGraticule();
        
        vis.append("path")
            .datum(graticule)
            .attr("class", "graticule")
            .attr("d", path);
        
        for(var i=0, len=route_points[0].length-1;i<len;i++){
            var start_point = [route_points[1][i], route_points[0][i]];
            var end_point = [route_points[1][i+1], route_points[0][i+1]];
            
            var route = {
                type: "LineString",
                coordinates: [
                    start_point,
                    end_point
                ]
            };
            vis.append("path")
                .datum(route)
                .attr("class", "arc")
                .attr("d", path);
        };
        
        var g = vis.append("g");
        
        d3.json("json/world-110m.json", function(error, world) {
              if (error) throw error;

            vis.insert("path", ".graticule")
                .datum(topojson.feature(world, world.objects.land))
                .attr("class", "land")
                .attr("d", path);

            vis.insert("path", ".graticule")
                .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
                .attr("class", "boundary")
                .attr("d", path);
        });
        
        return vis;
    };
    
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
    
    var scatterFunc = function(data){
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
        .attr('stroke-width', .5)
        .attr("d", lineGen(xData))
        .attr("fill", "none");
        
        vis.selectAll(".dot")
        .data(xData)
        .enter().append("circle")
        .attr('class', 'dot')
        .attr('cx', function(d, i) { return xScale(xData[i]); })
        .attr('cy', function(d, i) { return yScale(yData[i]); })
        .attr('r', .8)
        
        vis.append("text")
        .attr("class", "legend")
        .attr("text-anchor", "middle")
        .attr("x", MARGINS.left + (WIDTH-MARGINS.left-MARGINS.right)/2)
        .attr("y", HEIGHT-(MARGINS.bottom/3))
        .text("Distance Along Route (m)");
        
        vis.append("text")
        .attr("class", "legend")
        .attr("text-anchor", "middle")
        .attr("y", MARGINS.left/2.5)
        .attr("x", -MARGINS.top-(HEIGHT-MARGINS.top-MARGINS.bottom)/2)
        .attr("transform", "rotate(-90)")
        .text("Sea Ice Thickness (m)");

    };
    
    d3.csv("res/scientific_route.csv", function(d){
        scatterFunc(d);
        vis = topoFunc(d);
    });
        

})
   
.controller('marineTrafficCtrl', function($scope) {

})

.controller('seaIceCtrl', function($scope, $state){
    var mapDiv = document.getElementById("sea-ice-div");
    var mapHeight = mapDiv.offsetHeight;
    var mapWidth = mapDiv.offsetWidth;
    
    var mapFunc = function(data){
        
        var vis = d3.select("#sea-ice-vis"),
            WIDTH = mapWidth,
            HEIGHT = mapHeight,
            PADDING = 0;
        
        var minDim = Math.min(WIDTH, HEIGHT);
        var maxDim = Math.max(WIDTH, HEIGHT);
        var Arctic = {
                          "type": "Feature",
                          "geometry": {
                            "type": "MultiPoint",
                            "coordinates": [[0,60],[180,60]]
                          },
                          "properties": {
                            "name": "Arctic"
                          }
                    };
        
        var projection = d3.geoStereographic()
            .rotate([0, -90])
            .center([0, 90])
            .fitSize([WIDTH,HEIGHT],Arctic)
            .precision(1);
        
        vis.append("svg")
            .attr("width", WIDTH)
            .attr("height", HEIGHT);
        
        vis.append("svg:image")
            .attr('width', WIDTH)
            .attr('height', HEIGHT)
            .attr('x','-4%')
            .attr('y','-4%')
            .attr("transform", "scale(1.08)")
            .attr("xlink:href","img/ice_thickness/28_spring_2016.png");
        
        var path = d3.geoPath()
            .projection(projection);
        
        var graticule = d3.geoGraticule();
        
        vis.append("path")
            .datum(graticule)
            .attr("class", "graticule")
            .attr("d", path);
        
        var g = vis.append("g");
        
        d3.json("json/world-110m.json", function(error, world) {
              if (error) throw error;

            vis.insert("path", ".graticule")
                .datum(topojson.feature(world, world.objects.land))
                .attr("class", "land")
                .attr("d", path);

            vis.insert("path", ".graticule")
                .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
                .attr("class", "boundary")
                .attr("d", path);
        });
        
        return vis;
    };
    
    d3.csv("res/scientific_route.csv", function(d){
        vis = mapFunc(d);
    });
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

.controller('aboutCtrl', function($scope, $ionicPlatform){
	$scope.leedsSite = function(){
		window.open("http://cpom.leeds.ac.uk", '_system');
	};
	$scope.uclSite = function(){
		window.open("http://www.cpom.ucl.ac.uk/csopr/seaice.html", '_system');
	};
    
//    $ionicPlatform.ready(function(){
//        cordova.plugins.email.isAvailable(function(isAvailable){
//            if(isAvailable){
//                var bodyText = "<h1 style='text-align:center; color:lightgrey; font-family:sans-serif'>Feedback about CPOM App!</h1>"
//                console.log('[SendMail] Email plugin is available');
//                $scope.feedbackMail = function(){
//                    cordova.plugins.email.open({
//                        to: ["py14sts@leeds.ac.uk"],
//                        cc: null,
//                        bcc: null,
//                        attachments: null,
//                        subject: "Feedback about CPOM App!",
//                        body: bodyText,
//                        isHtml: true,
//                    }, function(){
//                        console.log('[SendMail] Email window closed.');
//                    });
//                };
//                
//                $scope.cpomMail = function(mailAddress){
//                    cordova.plugins.email.open({
//                        to: [mailAddress],
//                        cc: null,
//                        bcc: null,
//                        attachments: null,
//                        subject: "Email from user of CPOM App!",
//                        body: null,
//                        isHtml: true,
//                    }, function(){
//                        console.log('[SendMail] Email window closed.');
//                    });
//                }
//            } else {
//                console.log('[SendMail] Email plugin is not available');
//            };
//        });
//    });
    
})

.controller('settingsCtrl', function($scope){
	
})
