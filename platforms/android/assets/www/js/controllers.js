angular.module('app.controllers', ['angular-loading-bar'])

.config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider){
    cfpLoadingBarProvider.includeSpinner = false;
    cfpLoadingBarProvider.parentSelector = '#bar-cont';
}])
  
.controller('homeCtrl', function($scope, $state, $ionicHistory) {

    $scope.trackScreen = function(){
        $ionicHistory.nextViewOptions({
          disableBack: true
        });
        $state.go('menu.routeTrack');
    };
    $scope.iceScreen = function(){
        $ionicHistory.nextViewOptions({
          disableBack: true
        });
        $state.go('menu.seaIce');
    };
    $scope.aboutScreen = function(){
        $ionicHistory.nextViewOptions({
            disableBack: true
        });
        $state.go('menu.about');
    };

})
   
.controller('mapsCtrl', function($scope, $state, $ionicPlatform, $ionicLoading, routeService, $cordovaFile, $http) { 
    
    //Object to store options for drop-down selector
    $scope.iceOptions = [];
    
    //Get dimens of map div
    var topoDiv = document.getElementById("topo-div");
    var topoHeight = topoDiv.offsetHeight;
    var topoWidth = topoDiv.offsetWidth;

    //Function to display map
    var topoFunc = function(data){

        //Read data to arrays from JSON
        var route_points = [[],[]];
        data.forEach(function(d){
            route_points[0].push(d.lat);
            route_points[1].push(d.lon);
        });
        
        //Get start and end coords
        var startPoint = [route_points[1][0], route_points[0][0]],
            endPoint = [route_points[1][route_points[1].length - 1], route_points[0][route_points[0].length - 1]];

        //Init svg container
        var vis = d3.select("#topo-vis"),
            WIDTH = topoWidth,
            HEIGHT = topoHeight,
            PADDING = 0;
        
        //Clear all current SVG elements. Ensures JSON land shows on new ice data selection
        vis.selectAll("svg > *").remove();

        //Determine which of the dimensions is largest/smallest
        var minDim = Math.min(WIDTH, HEIGHT),
            maxDim = Math.max(WIDTH, HEIGHT);
        
        //Arctic object holds coords of Arctic area, used to fitSize
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

        //Init projection
        var projection = d3.geoStereographic()
            .rotate([0, -90])
            .center([0, 90])
            .fitSize([WIDTH,HEIGHT],Arctic)
            .precision(1);

        //Add SVG element
        vis.append("svg")
            .attr("width", WIDTH)
            .attr("height", HEIGHT);

        //Add background ice image
        try {
            vis.append("svg:image")
                .attr('width', WIDTH)
                .attr('height', HEIGHT)
                .attr('x','-3.9%')
                .attr('y','-3.9%')
                .attr("transform", "scale(1.08)")
                .attr("xlink:href","img/ice_thickness/" + routeService.selectedIce);

            console.log("Image used: img/ice_thickness/" + routeService.selectedIce);
        } catch(err) {
            console.log("No image selected");    
        };

        //D3 Path Generator
        var path = d3.geoPath()
            .projection(projection);

        //D3 Graticule Generator
        var graticule = d3.geoGraticule();

        vis.append("path")
            .datum(graticule)
            .attr("class", "graticule")
            .attr("d", path);

        //Draw lines between every point in route
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
        
        //Add Start/End text
        console.log(projection(startPoint));
        console.log(projection(endPoint));
        
        vis.selectAll("circle")
            .data([startPoint,endPoint]).enter()
            .append("text")
            .attr("cx", function (d) { console.log(projection(d)); return projection(d)[0]; })
            .attr("cy", function (d) { return projection(d)[1]; })
            .attr("r","8px")
            .attr("fill","red");

        var g = vis.append("g");

        //Add JSON land data
        d3.json("json/world-110m.json", function(error, world) {
            if (error){ console.log(error) };
            console.log('json called');

            vis.insert("path", ".graticule")
                .datum(topojson.feature(world, world.objects.land))
                .attr("class", "land")
                .attr("d", path);
            
            console.log('JSON Features added.');

            vis.insert("path", ".graticule")
                .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
                .attr("class", "boundary")
                .attr("d", path);
        });

        return vis;
    };

    //Get dimens of Ice Thickness chart div
    var chartDiv = document.getElementById('chart-div');
    var divHeight = chartDiv.offsetHeight;
    var divWidth = chartDiv.offsetWidth;
    var padding = "30";

    //Function to draw scatter plot
    var scatterFunc = function(data){
        
        //Initialise 2D array for thickness, cum. dist.
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

        //Init SVG container, scales, axes
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

            xAxis = d3.axisBottom().scale(xScale).tickArguments([10, "s"]),
            yAxis = d3.axisLeft().scale(yScale).tickArguments([5, "s"]);
        
        //Clear all SVG elements. Ensures new chart drawn on new ice data selection.
        vis.selectAll("svg > *").remove();

        vis.append("svg:g")
            .attr("class","axis")
            .attr("transform", "translate(0," +(HEIGHT - (MARGINS.bottom))+ ")")
            .call(xAxis);

        vis.append("svg:g")
            .attr("class","axis")
            .attr("transform", "translate(" + (MARGINS.left) + ",0)")
            .call(yAxis);

        //Function to draw points. Transforms from data value to SVG coordinate using set scale.
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
        .attr('stroke-width', 0.5)
        .attr("d", lineGen(xData))
        .attr("fill", "none");
        
        //Add labels, points, thickness label
        var div = vis.append("text")
            .attr("x", WIDTH - MARGINS.right)
            .attr("y", MARGINS.top * 2)
            .attr("class", "tooltip")
            .attr("text-anchor", "end")
            .html("Click a point to view thickness!");
        
        var distText = vis.append("text")
                .attr('x', WIDTH - MARGINS.right)
                .attr('y', (MARGINS.top * 2) + 17)
                .attr("class", "tooltip")
                .attr("text-anchor", "end");

        vis.selectAll(".dot")
        .data(xData)
        .enter().append("circle")
        .attr('class', 'dot')
        .attr('cx', function(d, i) { return xScale(xData[i]); })
        .attr('cy', function(d, i) { return yScale(yData[i]); })
        .style("stroke", "rgba(0, 55, 109, 0)")
        .style("fill", "rgba(0, 55, 109, 0)")
        .attr('r', 6);
        
        //On point click, highlight point and display thickness at that point
        var points = vis.selectAll(".dot");
        points.on("click", function(d, i){
            
            points.attr('r', 6)
                .style("fill", "rgba(0, 55, 109, 0)")
                .style("stroke", "rgba(0, 55, 109, 0)");
            
            thickness = +yData[i];
            distance = +xData[i];
            
            div.text("Thickness: " + thickness.toPrecision(4) + "m");
            distText.text("Distance: " + distance.toPrecision(4) + "km")
            
            d3.select(this)
                .attr('r', 5)
                .style("fill", "#ffffff")
                .style("stroke", "#ff0707");
            
        });

        vis.append("text")
        .attr("class", "legend")
        .attr("text-anchor", "middle")
        .attr("x", MARGINS.left + (WIDTH-MARGINS.left-MARGINS.right)/2)
        .attr("y", HEIGHT-(MARGINS.bottom/3))
        .text("Distance Along Route (km)");

        vis.append("text")
        .attr("class", "legend")
        .attr("text-anchor", "middle")
        .attr("y", MARGINS.left/2.5)
        .attr("x", -MARGINS.top-(HEIGHT-MARGINS.top-MARGINS.bottom)/2)
        .attr("transform", "rotate(-90)")
        .text("Sea Ice Thickness (m)");
        
        console.log('Done loading')
        //$ionicLoading.hide();

    };
    
    var scatterFuncUser = function(data){
        //Initialise 2D array for thickness, cum. dist.
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

        //Init SVG container, scales, axes
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

            xAxis = d3.axisBottom().scale(xScale).tickArguments([10, "s"]),
            yAxis = d3.axisLeft().scale(yScale).tickArguments([5, "s"]);
        
        //Clear all SVG elements. Ensures new chart drawn on new ice data selection.
        vis.selectAll("svg > *").remove();

        vis.append("svg:g")
            .attr("class","axis")
            .attr("transform", "translate(0," +(HEIGHT - (MARGINS.bottom))+ ")")
            .call(xAxis);

        vis.append("svg:g")
            .attr("class","axis")
            .attr("transform", "translate(" + (MARGINS.left) + ",0)")
            .call(yAxis);

        //Function to draw points. Transforms from data value to SVG coordinate using set scale.
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
        .attr('stroke-width', 0.5)
        .attr("d", lineGen(xData))
        .attr("fill", "none");
        
        //Add labels, points, thickness label
        var div = vis.append("text")
            .attr("x", WIDTH - MARGINS.right)
            .attr("y", MARGINS.top * 2)
            .attr("class", "tooltip")
            .attr("text-anchor", "end")
            .html("Click a point to view thickness!");
        
        var distText = vis.append("text")
                .attr('x', WIDTH - MARGINS.right)
                .attr('y', (MARGINS.top * 2) + 17)
                .attr("class", "tooltip")
                .attr("text-anchor", "end");

        vis.selectAll(".dot")
        .data(xData)
        .enter().append("circle")
        .attr('class', 'dot')
        .attr('cx', function(d, i) { return xScale(xData[i]); })
        .attr('cy', function(d, i) { return yScale(yData[i]); })
        .style("fill", "rgba(0, 55, 109, 0)")
        .style("stroke", "rgba(0, 55, 109, 0)")
        .attr('r', 6);
        
        //On point click, highlight point and display thickness at that point
        var points = vis.selectAll(".dot");
        points.on("click", function(d, i){
            
            points.attr('r', 6)
                .style("fill", "rgba(0, 55, 109, 0)")
                .style("stroke", "rgba(0, 55, 109, 0)");
            
            thickness = +yData[i];
            distance = +xData[i];
            
            div.text("Thickness: " + thickness.toPrecision(4) + "m");
            distText.text("Distance: " + distance.toPrecision(4) + "km")
            
            d3.select(this)
                .attr('r', 5)
                .style("fill", "#ffffff")
                .style("stroke", "#ff0707");
            
        });

        vis.append("text")
        .attr("class", "legend")
        .attr("text-anchor", "middle")
        .attr("x", MARGINS.left + (WIDTH-MARGINS.left-MARGINS.right)/2)
        .attr("y", HEIGHT-(MARGINS.bottom/3))
        .text("Distance Along Route (km)");

        vis.append("text")
        .attr("class", "legend")
        .attr("text-anchor", "middle")
        .attr("y", MARGINS.left/2.5)
        .attr("x", -MARGINS.top-(HEIGHT-MARGINS.top-MARGINS.bottom)/2)
        .attr("transform", "rotate(-90)")
        .text("Sea Ice Thickness (m)");
        
        console.log('Done loading')
        //$ionicLoading.hide();

    };
        
    $ionicPlatform.ready(function(){
        
        $scope.iceName = "Spring 2012";
        $scope.fileDir = cordova.file.dataDirectory;
        //Check for ice-options file
        $cordovaFile.checkFile($scope.fileDir, "iceFile.json").then(function(success){
            //On success, parse to iceOptions object
            $cordovaFile.readAsText($scope.fileDir, "iceFile.json").then(function(success){
                var json_data = '[' + success + ']';
                $scope.iceOptions = JSON.parse(json_data);
                mapInit();
            });
            
        }, function(error){
            //On fail, create file, write initial entry, parse to iceOptions object
            $cordovaFile.createFile($scope.fileDir, "iceFile.json", true).then(function(){
                
                var initialEntry = '{"name":"Spring 2012","file":"spring_2012.png"}, {"name":"Spring 2016","file":"28_spring_2016.png"}';
                $cordovaFile.writeFile($scope.fileDir, "iceFile.json", initialEntry, true).then(function(){
                    
                    $cordovaFile.readAsText($scope.fileDir, "iceFile.json").then(function(success){
                        
                        var json_data = '[' + success + ']';
                        $scope.iceOptions = JSON.parse(json_data);
                        mapInit();
                        
                    });
                    
                });
                
            });
            
        });
        
        //Service to handle selected route and ice between views
        var mapInit = function(){
            var routeFile = routeService.selectedRoute.file;
            console.log(routeFile);
            
            //If route is user route, needs processing
            if(routeService.type == "usr"){
                $scope.fileDir = cordova.file.dataDirectory;
                //Read route file and parse to JSON object
                $cordovaFile.readAsText($scope.fileDir, routeFile).then(function(success){
                    var route_data = JSON.parse(success);
                    //Check if it already has thickness data
                    if(route_data[0].hasOwnProperty($scope.iceName)){
                        //TODO: Add function for if already processed.
                        console.log(route_data[0][$scope.iceName]);
                    } else {
                        //Read ice data, x-process.
                        console.log("Ice data not found in route file");
                        console.log(JSON.stringify($scope.iceOptions));
                    };
//                    vis = topoFunc(data);
//                    scatterFuncUser(data);
//                    $ionicLoading.hide();

                }, function(error){
                    console.log("Error: " + JSON.stringify(error));
                });
            } else if(routeService.type == "eg"){
                d3.json("res/" + routeFile, function(error, data){
                    if(error){ console.log(error) };

                    scatterFunc(data);
                    vis = topoFunc(data);
                    $ionicLoading.hide();

                });
            };
        };
        
        $scope.selectedSeaIce = function(mySelect){

            console.log(JSON.stringify(mySelect));
            var routeFile = routeService.selectedRoute.file;
            console.log(routeFile);
            routeService.selectedIce = mySelect.file;
            routeService.iceData = mySelect.loc + mySelect.data;
            $scope.iceName = mySelect.name;
            
            //On new ice data selected, read route data file, show loading screen, draw charts, hide loading screen.
            if(routeService.type == "usr"){
                $scope.fileDir = cordova.file.dataDirectory;
                $cordovaFile.readAsText($scope.fileDir, routeFile).then(function(success){
                    var data = JSON.parse(success);
                    vis = topoFunc(data);
                    scatterFuncUser(data);
                    $ionicLoading.hide();

                }, function(error){
                    console.log("Error: " + JSON.stringify(error));
                });
            } else if(routeService.type == "eg"){
                d3.json("res/" + routeFile, function(error, data){
                    if(error){ console.log(error) };

                    scatterFunc(data);
                    vis = topoFunc(data);
                    $ionicLoading.hide();

                });
            };
        };

    });
    
    //Initial plot before sea ice data change
//    d3.csv("res/" + routeFile, function(d){
//        scatterFunc(d);
//        vis = topoFunc(d);
//        $ionicLoading.hide();
//        console.log(JSON.stringify(d));
//    });
    

})

.controller('seaIceCtrl', function($scope, $state, $ionicLoading, routeService, $ionicActionSheet, $cordovaGeolocation, $ionicPlatform, $ionicListDelegate){
    
    //Object to hold ice data options for drop-down select.
    $scope.iceOptions = [
        {
            "name":"Spring 2016",
            "file":"28_spring_2016.png"
            
        },
        {
            "name":"Spring 2012",
            "file":"spring_2012.png"
        }
    ];
    
    //Function to set routeService selected route and display map screen.
    var loadingTemplate = "<div style='margin:-20px;padding:15px;border-radius:7px;background-color:#00376d'>Processing...</div>"
    $scope.mapScreenExample = function(filename){
        $ionicLoading.show({
            template: loadingTemplate
        });
        routeService.selectedRoute = filename;
        routeService.selectedIce = "spring_2012.png";
        routeService.type = "eg";
        $state.go('menu.maps');    
    };
    $scope.mapScreenUser = function(filename){
        $ionicLoading.show({
            template: loadingTemplate
        });
        routeService.selectedRoute = filename;
        routeService.selectedIce = "spring_2012.png";
        routeService.type = "usr";
        $state.go('menu.maps');    
    };
    
    //Get dimens of map div
    var mapDiv = document.getElementById("sea-ice-div");
    var mapHeight = mapDiv.offsetHeight;
    var mapWidth = mapDiv.offsetWidth;
    
    //Function to show Arctic map
    var mapFunc = function(){
        
        //Init SVG container
        var vis = d3.select("#sea-ice-vis"),
            WIDTH = mapWidth,
            HEIGHT = mapHeight,
            PADDING = 0;
        
        //Clear SVG elements. Ensures land JSON shown on new ice data selected.
        vis.selectAll("svg > *").remove();
        
        var minDim = Math.min(WIDTH, HEIGHT);
        var maxDim = Math.max(WIDTH, HEIGHT);
        
        //Object to hold coords of Arctic area. Used for fitSize.
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
        
        //Init projection
        var projection = d3.geoStereographic()
            .rotate([0, -90])
            .center([0, 90])
            .fitSize([WIDTH,HEIGHT],Arctic)
            .precision(.1);
        
        //Add SVG element.
        vis.append("svg")
            .attr("width", WIDTH)
            .attr("height", HEIGHT);
        
        //Add background ice data image from routeService.
        vis.append("svg:image")
            .attr('width', WIDTH)
            .attr('height', HEIGHT)
            .attr('x','-4%')
            .attr('y','-4%')
            .attr("transform", "scale(1.08)")
            .attr("xlink:href","img/ice_thickness/" + routeService.selectedIce);
        
        var path = d3.geoPath()
            .projection(projection);
        
        var graticule = d3.geoGraticule();
        
        vis.append("path")
            .datum(graticule)
            .attr("class", "graticule")
            .attr("d", path);
        
        //Functions for converting straight polygons into arched polygons for stereographic projection
        var parallel = function(phi, lam0, lam1){
            if(lam0 > lam1) lam1 += 360;
            var dlam = lam1 - lam0,
                step = dlam / Math.ceil(dlam);
            return d3.range(lam0, lam1 + .5 * step, step).map(function(lam) { return [normalise(lam), phi]; });
        };
        
        var normalise = function(x){
            return (x + 180) % 360 - 180;
        };
        
        //Feature set for all selection polygons
        var Polygons = [
            {
                type: "Polygon",
                coordinates: [
                    [[-180,80]]
                        .concat(parallel(90, -180, -90))
                        .concat(parallel(80, -180, -90).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[90,80]]
                        .concat(parallel(90, 90, 180))
                        .concat(parallel(80, 90, 180).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[0,80]]
                        .concat(parallel(90, 0, 90))
                        .concat(parallel(80, 0, 90).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-90,80]]
                        .concat(parallel(90, -90, 0))
                        .concat(parallel(80, -90, 0).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-135,70]]
                        .concat(parallel(80, -135, -90))
                        .concat(parallel(70, -135, -90).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-180,70]]
                        .concat(parallel(80, -180, -135))
                        .concat(parallel(70, -180, -135).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[135,70]]
                        .concat(parallel(80, 135, 180))
                        .concat(parallel(70, 135, 180).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[90,70]]
                        .concat(parallel(80, 90, 135))
                        .concat(parallel(70, 90, 135).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[45,70]]
                        .concat(parallel(80, 45, 90))
                        .concat(parallel(70, 45, 90).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[0,70]]
                        .concat(parallel(80, 0, 45))
                        .concat(parallel(70, 0, 45).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-45,70]]
                        .concat(parallel(80, -45, 0))
                        .concat(parallel(70, -45, 0).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-90,70]]
                        .concat(parallel(80, -90, -45))
                        .concat(parallel(70, -90, -45).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-135,60]]
                        .concat(parallel(70, -135, -90))
                        .concat(parallel(60, -135, -90).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-180,60]]
                        .concat(parallel(70, -180, -135))
                        .concat(parallel(60, -180, -135).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[135,60]]
                        .concat(parallel(70, 135, 180))
                        .concat(parallel(60, 135, 180).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[90,60]]
                        .concat(parallel(70, 90, 135))
                        .concat(parallel(60, 90, 135).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[45,60]]
                        .concat(parallel(70, 45, 90))
                        .concat(parallel(60, 45, 90).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[0,60]]
                        .concat(parallel(70, 0, 45))
                        .concat(parallel(60, 0, 45).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-45,60]]
                        .concat(parallel(70, -45, 0))
                        .concat(parallel(60, -45, 0).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-90,60]]
                        .concat(parallel(70, -90, -45))
                        .concat(parallel(60, -90, -45).reverse())
                ]
            }
            
        ];
        
        //Add each selection polygon to the SVG container
        for(var i=0, len = Polygons.length; i<len; i++){
            vis.append("path")
                .datum(Polygons[i])
                .attr("d", path)
                .attr("fill", "rgba(255, 255, 255, 0)")
                .attr("stroke", "rgba(51, 51, 51, 0.5)")
                .attr("id", i)
                .attr("class", "quad")
        };
        
        //Handle click event for quadrants. Highlight area. Change chart data.
        var quads = vis.selectAll(".quad");
        quads.on("click", function(d, i){
            quads.attr('fill', 'rgba(255, 255, 255, 0)');
            d3.select(this)
                .attr('fill', 'rgba(0, 55, 109, 0.3)');
            
            d3.select(this)
                .transition()
                .delay(0)
                .duration(3000)
                .attr('fill', 'rgba(255, 255, 255, 0)');
            
            var xData = [],
                yData = [];
            
            var parseDate = d3.timeParse("%Y-%d-%m")
            
            d3.csv("res/means.csv", function(data){
                
                scatterFunc(data, i);
        
            });   
            
        });
        
        var g = vis.append("g");
        
        //Show land JSON
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
    
    var chartDiv = document.getElementById("historic-chart");
    var chartHeight = chartDiv.offsetHeight;
    var chartWidth = chartDiv.offsetWidth;
    
    var scatterFunc = function(data, i){
        
        var parseDate = d3.timeParse("%Y-%d-%m")
        
        var xData = [],
            yData = [];
        
        data.forEach(function(d){
            xData.push(parseDate(d.date));
            yData.push(parseFloat(d[i+1]));
        });
        
        var vis = d3.select("#chart"),
            WIDTH = chartWidth,
            HEIGHT = chartHeight,
            MARGINS = {
                top: 15,
                right: 30,
                bottom: 90,
                left: 50
            },
            xScale = d3.scaleTime()
            .range([MARGINS.left, WIDTH - MARGINS.right])
            .domain([new Date(xData[0]), new Date(xData[xData.length - 1])])
            .nice(),

            yScale = d3.scaleLinear()
            .range([HEIGHT - MARGINS.bottom, MARGINS.top])
            .domain([0, d3.max(yData)]),

            xAxis = d3.axisBottom().scale(xScale).tickArguments([8]),
            yAxis = d3.axisLeft().scale(yScale).tickArguments([5]);
        
        vis.selectAll("svg > *").remove();
        
        vis.append("svg:g")
            .attr("class","axis")
            .attr("transform", "translate(0," + (HEIGHT - MARGINS.bottom) + ")")
            .call(xAxis)
            .selectAll("text")
                .style("text-anchor", "end")
                .attr("transform", "rotate(-60)");
        
        vis.append("svg:g")
            .attr("class","axis")
            .attr("transform", "translate(" + MARGINS.left + ",0)")
            .call(yAxis);
        
        var lineGen = d3.line().x(function(d, i){
            return xScale(xData[i]);
        })
        .y(function(d, i){
            return yScale(yData[i]);
        });
        
        vis.append("svg:path")
            .attr("class","line")
            .attr("stroke","#00376d")
            .attr("stroke-width", 0)
            .attr("d", lineGen(xData))
            .attr("fill", "none");
        
        vis.selectAll(".dot")
        .data(xData)
        .enter().append("circle")
        .attr("class","dot")
        .attr('cx', function(d, i) { return xScale(xData[i]); })
        .attr('cy', function(d, i) { return yScale(yData[i]); })
        .style("stroke","#00376d")
        .style("fill","#00376d")
        .attr('r', 4);
        
        vis.append("text")
            .attr("class", "legend")
            .attr("text-anchor", "middle")
            .attr("x", MARGINS.left + (WIDTH-MARGINS.left-MARGINS.right)/2)
            .attr("y", HEIGHT-(MARGINS.bottom/3))
            .text("Month, Year");
        
        vis.append("text")
            .attr("class", "legend")
            .attr("text-anchor", "middle")
            .attr("y", MARGINS.left/2.5)
            .attr("x", -MARGINS.top-(HEIGHT-MARGINS.top-MARGINS.bottom)/2)
            .attr("transform", "rotate(-90)")
            .text("Mean Sea Ice Thickness (m)");
        
    };
    
    $ionicPlatform.ready(function(){
        
        routeService.selectedIce = $scope.iceOptions[1].file;
        
        //Handle reload on new ice data selected
        $scope.selectedSeaIce = function(mySelect){
            
            routeService.selectedIce = mySelect.file;
            
            d3.selectAll("svg > *").remove();
            
            var text1 = chartContainer.append("text")
                .attr("x", chartWidth/2)
                .attr("y", (chartHeight/2)-13)
                .attr("text-anchor", "middle")
                .attr("fill", "#00376d")
                .style("font-size", "24px")
                .text("Click on an area to view the")
                .attr("id", "text1");

            var text2 = chartContainer.append("text")
                .attr("x", chartWidth/2)
                .attr("y", (chartHeight/2)+13)
                .attr("text-anchor", "middle")
                .attr("fill", "#00376d")
                .style("font-size", "24px")
                .text("historic ice conditions!")
                .attr("id", "text2");
            
//            d3.csv("res/means.csv", function(d){
//                scatterFunc(d);
//            });
            
            var vis = mapFunc();
            
        };

    });
    
    var vis = mapFunc();
    var chartContainer = d3.select("#chart");
            
    var text1 = chartContainer.append("text")
        .attr("x", chartWidth/2)
        .attr("y", (chartHeight/2)-13)
        .attr("text-anchor", "middle")
        .attr("fill", "#00376d")
        .style("font-size", "24px")
        .text("Click on an area to view the");
    
    var text2 = chartContainer.append("text")
        .attr("x", chartWidth/2)
        .attr("y", (chartHeight/2)+13)
        .attr("text-anchor", "middle")
        .attr("fill", "#00376d")
        .style("font-size", "24px")
        .text("historic ice conditions!")

})

.controller('routeTrackCtrl', function($scope, $state, $ionicPlatform, $cordovaToast, $ionicPopup, $window, $cordovaGeolocation, $interval, $ionicLoading, routeService, $ionicActionSheet, $cordovaFile, $ionicListDelegate){
    
    $scope.fileDir = null;

    $scope.data = {
        
    };
    
    var userDelete = function(route){
        console.log("Old JSON: " + JSON.stringify($scope.userRoutes));
        if($scope.userRoutes.length == 1){
            console.log("userRoutes has length 1");
            $scope.userRoutes = [];
            console.log("New JSON: " + JSON.stringify($scope.userRoutes));
            $cordovaFile.removeFile($scope.fileDir, "userRoutes.json");
        } else {
            console.log("userRoutes has length " + $scope.userRoutes.length);
            $scope.userRoutes.splice($scope.userRoutes.indexOf(route), 1);
            var newJson = JSON.stringify($scope.userRoutes);
            console.log("New JSON: " + newJson);
            newJson = newJson.slice(1,-1);
            $cordovaFile.writeFile($scope.fileDir, "userRoutes.json", newJson, true);
        };
        var filename = route.filename;
        $cordovaFile.removeFile($scope.fileDir, route.file);
    };
    
    //Function to remove data on delete of example route
    $scope.editItem = function(route){
        $ionicActionSheet.show({
            
            buttons: [],
            destructiveText: 'Delete',
            titleText: route.name,
            cancelText: 'Cancel',
            cancel: function() { $ionicListDelegate.closeOptionButtons(); },
            destructiveButtonClicked: function(){
                $scope.exampleRoutes.splice($scope.exampleRoutes.indexOf(route), 1);
                return true;
            }
            
        });
        
    };

    var shareRoute = function(route){
        //TODO: Add route sharing here.
        console.log("Share: " + route.name);
    };
    
    //Function to handle deleting user route
    $scope.editUser = function(route){
        $ionicActionSheet.show({
            
            buttons: [
                {text: "Share with us!"}
            ],
            destructiveText: 'Delete',
            titleText: route.name,
            cancelText: 'Cancel',
            cancel: function() { $ionicListDelegate.closeOptionButtons(); },
            buttonClicked: function(index, button){
                if(index == 0){
                    alert('Send route to CPOM!');
                    shareRoute(route);
                };
                
                $ionicListDelegate.closeOptionButtons();
                return true;
            },
            destructiveButtonClicked: function(){
                userDelete(route);
                return true;
            }
            
        });
        
    };
    
    //Object to hold names and filenames of example routes
    $scope.exampleRoutes = [
        {
            "name":"Example Route: Scientific Cruise around the Siberian Shelf - 2014",
            "file":"correctly_filtered.json"
        },
        {
            "name":"Example Route: Tour of the Arctic circle from Svalbard to Severny Island - 2016",
            "file":"example_route_2.json"
        },
        {
            "name": "Example Route: North West Passage - Northern Route - 2012",
            "file":"NWP_north_app.json"
        },
        {
            "name":"Example Route: North West Passage - Southern Route - 2012",
            "file":"NWP_south_app.json"
        }
    ];
    
    //Function to set routeService selected route and show map screen
    var loadingTemplate = "<div style='margin:-20px;padding:15px;border-radius:7px;background-color:#00376d'>Processing...</div>"
    
    //Function to display example routes
    $scope.mapScreenUser = function(route){
        $ionicLoading.show({
            template: loadingTemplate
        });
        routeService.selectedRoute = route;
        routeService.selectedIce = "spring_2012.png";
        routeService.type = "usr";
        $state.go('menu.maps');
    };
    $scope.mapScreenExample = function(route){
        $ionicLoading.show({
            template: loadingTemplate
        });
        routeService.selectedRoute = route;
        routeService.selectedIce = "spring_2012.png";
        routeService.type = "eg";
        $state.go('menu.maps');
    };

  	$ionicPlatform.ready(function(){
  		console.log("[IONIC PLATFORM IS NOW READY]");
        
        //Get directory from appropriate filesystem
        if(ionic.Platform.isAndroid()){
            console.log('Platform is Android');
            console.log('cordova.file.externalDataDirectory: ' + cordova.file.dataDirectory);
            $scope.fileDir = cordova.file.dataDirectory;
        };
        
        //Parse json file holding user route names and filenames
        $cordovaFile.readAsText($scope.fileDir, "userRoutes.json").then(function(success){
            var routes_json = '[' + success + ']';
            $scope.userRoutes = JSON.parse(routes_json);
        }, function(error){
            console.log("userRoutes file doesn't exist yet!");
            $scope.userRoutes = [];
        });

        //Init backgroundGeolocation
  		var bgGeo = window.plugins.backgroundLocationServices;

  		var optionsGeo = {
	  		enableHighAccuracy: true,
	  		timeout: 20000
	  	};

        //Get location from foreground geolocation. Prevents errors when initialising bgGeo.
  		$cordovaGeolocation.getCurrentPosition(optionsGeo).then(function(position){
	  		console.log('[GEOLOCAL JS1] Location from Geolocation.');
	  	});

	  	$scope.isRecording = false;

	  	bgGeo.configure({
	     	//Both
	     	desiredAccuracy: 20, // Desired Accuracy of the location updates (lower means more accurate but more battery consumption)
	     	distanceFilter: 0, // (Meters) How far you must move from the last point to trigger a location update
	     	debug: true, // <-- Enable to show visual indications when you receive a background location update
	     	interval: 10000, // (Milliseconds) Requested Interval in between location updates.
	     	useActivityDetection: false, // Uses Activitiy detection to shut off gps when you are still (Greatly enhances Battery Life)

	     	//Android Only
	     	notificationTitle: 'CryoSat Application', // customize the title of the notification
	     	notificationText: 'Location tracking enabled.', //customize the text of the notification
	     	fastestInterval: 10000 // <-- (Milliseconds) Fastest interval your app / server can handle updates

		});

		bgGeo.registerForLocationUpdates(function(location) {
	     	console.log("[BackgroundGeo] Location updated - Position:  " + JSON.stringify(location));
            var coordEntry = '{"lat":"' + location.latitude + '","lon":"' + location.longitude + '"},';
            $cordovaFile.writeExistingFile($scope.fileDir, $scope.fileName, coordEntry, true);
		}, function(err) {
	     	console.log("[BackgroundGeo] Error: Didnt get an update: " + err);
		});

        //onPause, onResume to handle app moving to/from foreground and switch geolocation provider
  		var onPause = function(){

  			console.log('[BackgroundGeo] onPause success.')

		};
        
        $scope.fileDir = cordova.file.dataDirectory;
        $cordovaFile.readAsText($scope.fileDir, "iceFile.json").then(function(success){
            var json_data = '[' + success + ']';
            $scope.iceOptions = JSON.parse(json_data);
        });

		var onResume = function(){

	  		var getLocation = function(){
	  			if($scope.isRecording){
                    
	  				$cordovaGeolocation.getCurrentPosition(optionsGeo).then(function(position){
	  					console.log('[ForegroundGeo] Location updated - Position: latitude - ' + position.coords.latitude + ', longitude - ' + position.coords.longitude);
                        var coordEntry = '{"lat":"' + position.coords.latitude + '","lon":"' + position.coords.longitude + '"}'
                        var jsonCoord = JSON.parse('[' + coordEntry + ']');
                        for(var i = 0; i < $scope.iceOptions.length; i++){
                            var fileLoc = $scope.iceOptions[i].loc;
                            var fileName = $scope.iceOptions[i].data;
                            var iceName = $scope.iceOptions[i].name;

                            d3.csv(fileLoc + fileName, function(ice_data){
                                jsonCoord[iceName] = appendThickness(ice_data, position.coords.latitude, position.coords.longitude);
                            });
                        };
                        coordEntry = JSON.stringify(jsonCoord).slice(1,-1) + ',';
                        $cordovaFile.writeExistingFile($scope.fileDir, $scope.fileName, coordEntry, true);
	  				});
	  			} else {
	  				console.log('[ForegroundGeo] getLocation called, location tracking disabled.')
	  			}	  			

	  		};

	  		console.log('[ForegroundGeo] onResume success.');
	  		foregroundGeo = $interval(getLocation, 60000);

		};

        //onPause and onResume listeners
		document.addEventListener("pause", onPause, false);
  		document.addEventListener("resume", onResume, false);

        //Start Geolocation on button press
  		$scope.startGeolocation = function(){
            var confirmPopup = $ionicPopup.confirm({
		        title: 'Location Tracking',
		        template: 'Do you want to begin recording your location?'
            });
            confirmPopup.then(function(res) {
                if(res){
                    var year = new Date().getFullYear();
                    var date = new Date().getDate();
                    var month = new Date().getMonth();
                    var date_string = date + "_" + month + "_" + year;
                    $scope.fileName = "route_" + date_string + ".json";
                    
                    $cordovaFile.createFile($scope.fileDir, $scope.fileName, true).then(function(success){
                        bgGeo.start();
                        $scope.isRecording = true;
                        console.log('[BackgroundGeo] Tracking started.');
                        console.log('File created.')
                        onResume();
                    });
		        } else {
		        	//return
		        	console.log('[BackgroundGeo] Begin tracking cancelled by user.');
		        }
		    });
				
		};

        //Stop Geolocation on button press and name submit
		$scope.stopGeolocation = function(){
			var confirmPopup = $ionicPopup.show({
    
                template: '<input type="text" name="namer" ng-model="data.name" required>',
                title: 'Location Tracking',
                subTitle: 'Please enter a name for this track to stop recording:',
                scope: $scope,
                buttons: [
                    { text: 'Cancel' },
                    {
                        text: '<b>Save</b>',
                        type: 'button-bright',
                        onTap: function(e){
                            if(!$scope.data.name){
                                alert('You have to name your route before you can save it!')
                                e.preventDefault();
                            } else {
                                var json_entry = {"name": $scope.data.name,"filename": $scope.fileDir + $scope.fileName,"file": $scope.fileName};
                                //Check route database exists
                                $cordovaFile.checkFile($scope.fileDir, "userRoutes.json").then(function(success){
                                    //Read it in it's current state
                                    $cordovaFile.readAsText($scope.fileDir, "userRoutes.json").then(function(success){
                                        //Add new string to existing string
                                        var updated_text = success + ',' + JSON.stringify(json_entry);
                                        //Write updated string to file
                                        $cordovaFile.writeFile($scope.fileDir, "userRoutes.json", updated_text, true).then(function(){
                                            //Re-read file and parse to a json object for list
                                            $cordovaFile.readAsText($scope.fileDir, "userRoutes.json").then(function(success){
                                                console.log("User Routes read.");
                                                var route_json = '[' + success + ']';
                                                $scope.userRoutes = JSON.parse(route_json);
                                            }, function(error){
                                                console.log("Error reading userRoutes.json as text: " + error);
                                            });
                                        });
                                    });
                                    
                                }, function(error){
                                    var initial_entry = JSON.stringify(json_entry)
                                    $cordovaFile.writeFile($scope.fileDir, "userRoutes.json", initial_entry, true).then(function(){
                                        $cordovaFile.readAsText($scope.fileDir, "userRoutes.json").then(function(success){
                                            
                                            console.log("User Routes read.");
                                            var route_json = '[' + success + ']';
                                            $scope.userRoutes = JSON.parse(route_json);
                                            
                                        }, function(error){
                                            
                                            console.log("Error reading userRoutes.json as text.");
                                            console.log("Error: " + error);
                                            
                                        });
                                        
                                    });
                                    
                                });
                                
                                return $scope.data.name;
                            };
                        }
                    }
                ]
            });
		    confirmPopup.then(function(res) {
                if(res){
                    bgGeo.stop();
                    $scope.isRecording = false;
                    $interval.cancel(foregroundGeo);
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
    //Links to external sites
	$scope.leedsSite = function(){
		window.open("http://cpom.leeds.ac.uk", '_system');
	};
	$scope.uclSite = function(){
		window.open("http://www.cpom.ucl.ac.uk/csopr/seaice.html", '_system');
	};
	$scope.cryosatSite = function(){
		window.open("http://www.esa.int/Our_Activities/Observing_the_Earth/CryoSat/Facts_and_figures", '_system');
	};
	$scope.blogSite = function(){
		window.open("http://cpom.leeds.ac.uk/cpom-blog/", '_system');
    };
    
    //Email providers
    $ionicPlatform.ready(function(){
        cordova.plugins.email.isAvailable(function(isAvailable){
            if(isAvailable){
                var bodyText = "<h1 style='text-align:center; color:lightgrey; font-family:sans-serif'>Feedback about CPOM App!</h1>"
                console.log('[SendMail] Email plugin is available');
                $scope.feedbackMail = function(){
                    cordova.plugins.email.open({
                        to: ["py14sts@leeds.ac.uk"],
                        cc: null,
                        bcc: null,
                        attachments: null,
                        subject: "Feedback about CPOM App!",
                        body: bodyText,
                        isHtml: true,
                    }, function(){
                        console.log('[SendMail] Email window closed.');
                    });
                };
                
                $scope.cpomMail = function(mailAddress){
                    cordova.plugins.email.open({
                        to: [mailAddress],
                        cc: null,
                        bcc: null,
                        attachments: null,
                        subject: "Email from user of CPOM App!",
                        body: "",
                        isHtml: false,
                    }, function(){
                        console.log('[SendMail] Email window closed.');
                    });
                }
            } else {
                console.log('[SendMail] Email plugin is not available');
                alert("This feature is currently not working on your device. Please email me at py14sts@leeds.ac.uk");
            };
        });
    });
    
})

.controller('menuCtrl', function($scope){
    $scope.menuLink = function(site){
        if(site == "bas"){
            window.open("https://www.bas.ac.uk/", '_system');
        } else if(site == "noc"){
            window.open("http://noc.ac.uk/", '_system');
        } else if(site == "nceo"){
            window.open("https://www.nceo.ac.uk/", '_system');
        } else if(site == "nerc"){
            window.open("http://www.nerc.ac.uk/", '_system');
        } else if(site == "esa"){
            window.open("http://www.esa.int/ESA", '_system');
        } else if(site == "ionic"){
            window.open("http://ionicframework.com/", '_system');
        };
    };
})

.controller('dlCtrl', function($scope, $http, $ionicLoading){
	
    var url = "http://www.cpom.ucl.ac.uk/csopr/sidata/";
    
    var toObj = function(arr){
        obj = [];
        for (var i = 0; i < arr.length; i++){
            var item = arr[i].slice(3,-17);
            console.log(i);
            obj.push(item);
        };
        return obj;
    };
    
    var dataObj = [
        {lat:66.234, lon:76.986},
        {lat:67.234, lon:77.986},
        {lat:68.234, lon:78.986},
        {lat:69.234, lon:79.986},
        {lat:70.234, lon:80.986},
        {lat:71.234, lon:81.986},
        {lat:72.234, lon:82.986},
        {lat:73.234, lon:83.986},
        {lat:74.234, lon:84.986},
        {lat:75.234, lon:85.986},
        {lat:76.234, lon:86.986},
        {lat:77.234, lon:87.986},
        {lat:78.234, lon:88.986},
        {lat:79.234, lon:89.986},
        {lat:80.234, lon:90.986},
        {lat:81.234, lon:91.986},
        {lat:82.234, lon:92.986},
        {lat:83.234, lon:93.986},
        {lat:84.234, lon:94.986},
        {lat:85.234, lon:95.986},
        {lat:86.234, lon:96.986},
        {lat:87.234, lon:97.986},
        {lat:88.234, lon:98.986},
        {lat:89.234, lon:99.986},
        {lat:90.234, lon:100.986},
        {lat:89.234, lon:99.986},
        {lat:88.234, lon:98.986},
        {lat:87.234, lon:97.986},
        {lat:86.234, lon:96.986},
        {lat:85.234, lon:95.986},
        {lat:84.234, lon:94.986},
        {lat:83.234, lon:93.986},
        {lat:82.234, lon:92.986},
        {lat:81.234, lon:91.986},
        {lat:80.234, lon:90.986},
        {lat:79.234, lon:89.986},
        {lat:78.234, lon:88.986},
        {lat:77.234, lon:87.986},
        {lat:76.234, lon:86.986},
        {lat:75.234, lon:85.986},
        {lat:74.234, lon:84.986},
        {lat:73.234, lon:83.986},
        {lat:72.234, lon:82.986},
        {lat:71.234, lon:81.986},
        {lat:70.234, lon:80.986},
        {lat:69.234, lon:79.986},
        {lat:68.234, lon:78.986},
        {lat:67.234, lon:77.986},
        {lat:66.234, lon:76.986},
        {lat:65.234, lon:75.986},
        {lat:64.234, lon:74.986}
    ];
    
    var pointDist = function(pos0, pos1){
        var lat1 = pos0.lat,
            lat2 = pos1.lat,
            lon1 = pos0.lon,
            lon2 = pos1.lon,
            deg2rad = Math.PI / 180;
        var R = 6371e3; // metres
        var φ1 = lat1 * deg2rad;
        var φ2 = lat2 * deg2rad;
        var Δφ = (lat2-lat1) * deg2rad;
        var Δλ = (lon2-lon1) * deg2rad;

        var a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        var d = R * c;
        return d;
    }
    
    $scope.onClick = function(){
        console.log("Button clicked. Sending POST request.");
        var url = "http://localhost:8080";
        $http({
            method: 'POST',
            url: url,
            headers: 'application/json',
            data: dataObj}).then(function(success){
                console.log("POST request success.");
                $scope.data = success.data;
                //TODO: Add file write here to save ice list
        }, function(error){
            console.log("error: " + JSON.stringify(error));
        });
    };
    
    $scope.itemClick = function(object){
        var index = $scope.data.indexOf(object);
        alert("You click item: " + (index+1) + ". lat: " + object.lat + ", lon: " + object.lon);
        //TODO: Download ice image here
    };
    
})
