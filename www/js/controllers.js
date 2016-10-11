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
    $scope.downloadScreen = function(){
        $ionicHistory.nextViewOptions({
            disableBack: true
        });
        $state.go('menu.download');
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

.controller('dlCtrl', function($scope, $http, $ionicLoading, $ionicPlatform){
	
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
        {"lat":"7.779160199999999747e+01","lon":"1.160304700000000011e+01"},
        {"lat":"7.794587555555555980e+01","lon":"1.097784166666666650e+01"},
        {"lat":"7.810014911111110791e+01","lon":"1.035263633333333289e+01"},
        {"lat":"7.825442266666667024e+01","lon":"9.727430999999999273e+00"},
        {"lat":"7.840869622222221835e+01","lon":"9.102225666666667436e+00"},
        {"lat":"7.856296977777778068e+01","lon":"8.477020333333333824e+00"},
        {"lat":"7.871724333333332879e+01","lon":"7.851815000000000211e+00"},
        {"lat":"7.887151688888889112e+01","lon":"7.226609666666667486e+00"},
        {"lat":"7.902579044444443923e+01","lon":"6.601404333333333874e+00"},
        {"lat":"7.918006400000000156e+01","lon":"5.976199000000000261e+00"},
        {"lat":"7.936136500000000638e+01","lon":"4.921112888888888648e+00"},
        {"lat":"7.954266599999999698e+01","lon":"3.866026777777777923e+00"},
        {"lat":"7.972396700000000180e+01","lon":"2.810940666666666754e+00"},
        {"lat":"7.990526800000000662e+01","lon":"1.755854555555555585e+00"},
        {"lat":"8.008656899999999723e+01","lon":"7.007684444444448602e-01"},
        {"lat":"8.026787000000000205e+01","lon":"-3.543176666666667529e-01"},
        {"lat":"8.044917100000000687e+01","lon":"-1.409403777777778366e+00"},
        {"lat":"8.063047199999999748e+01","lon":"-2.464489888888889091e+00"},
        {"lat":"8.081177300000000230e+01","lon":"-3.519575999999999816e+00"},
        {"lat":"8.095321588888889153e+01","lon":"-4.078908555555555537e+00"},
        {"lat":"8.109465877777778076e+01","lon":"-4.638241111111110371e+00"},
        {"lat":"8.123610166666666998e+01","lon":"-5.197573666666666092e+00"},
        {"lat":"8.137754455555555921e+01","lon":"-5.756906222222221814e+00"},
        {"lat":"8.151898744444444844e+01","lon":"-6.316238777777777536e+00"},
        {"lat":"8.166043033333333767e+01","lon":"-6.875571333333333257e+00"},
        {"lat":"8.180187322222222690e+01","lon":"-7.434903888888888090e+00"},
        {"lat":"8.194331611111111613e+01","lon":"-7.994236444444443812e+00"},
        {"lat":"8.208475900000000536e+01","lon":"-8.553568999999999534e+00"},
        {"lat":"8.211467122222222770e+01","lon":"-9.844867555555556038e+00"},
        {"lat":"8.214458344444445004e+01","lon":"-1.113616611111111077e+01"},
        {"lat":"8.217449566666667238e+01","lon":"-1.242746466666666549e+01"},
        {"lat":"8.220440788888889472e+01","lon":"-1.371876322222222200e+01"},
        {"lat":"8.223432011111111706e+01","lon":"-1.501006177777777850e+01"},
        {"lat":"8.226423233333333940e+01","lon":"-1.630136033333333501e+01"},
        {"lat":"8.229414455555556174e+01","lon":"-1.759265888888888796e+01"},
        {"lat":"8.232405677777778408e+01","lon":"-1.888395744444444446e+01"},
        {"lat":"8.235396900000000642e+01","lon":"-2.017525600000000097e+01"},
        {"lat":"8.249698988888889062e+01","lon":"-2.080291977777777745e+01"},
        {"lat":"8.264001077777778903e+01","lon":"-2.143058355555555750e+01"},
        {"lat":"8.278303166666667323e+01","lon":"-2.205824733333333398e+01"},
        {"lat":"8.292605255555555743e+01","lon":"-2.268591111111111047e+01"},
        {"lat":"8.306907344444445584e+01","lon":"-2.331357488888889051e+01"},
        {"lat":"8.321209433333334005e+01","lon":"-2.394123866666666700e+01"},
        {"lat":"8.335511522222222425e+01","lon":"-2.456890244444444704e+01"},
        {"lat":"8.349813611111112266e+01","lon":"-2.519656622222222353e+01"},
        {"lat":"8.364115700000000686e+01","lon":"-2.582423000000000002e+01"},
        {"lat":"8.363962577777778051e+01","lon":"-2.767486111111110958e+01"},
        {"lat":"8.363809455555555417e+01","lon":"-2.952549222222222269e+01"},
        {"lat":"8.363656333333334203e+01","lon":"-3.137612333333333225e+01"},
        {"lat":"8.363503211111111568e+01","lon":"-3.322675444444444537e+01"},
        {"lat":"8.363350088888888934e+01","lon":"-3.507738555555555138e+01"},
        {"lat":"8.363196966666666299e+01","lon":"-3.692801666666666449e+01"},
        {"lat":"8.363043844444445085e+01","lon":"-3.877864777777777761e+01"},
        {"lat":"8.362890722222222450e+01","lon":"-4.062927888888888361e+01"},
        {"lat":"8.362737599999999816e+01","lon":"-4.247990999999999673e+01"},
        {"lat":"8.356500833333333844e+01","lon":"-4.346737355555555382e+01"},
        {"lat":"8.350264066666666452e+01","lon":"-4.445483711111111091e+01"},
        {"lat":"8.344027300000000480e+01","lon":"-4.544230066666666801e+01"},
        {"lat":"8.337790533333333087e+01","lon":"-4.642976422222222510e+01"},
        {"lat":"8.331553766666667116e+01","lon":"-4.741722777777778219e+01"},
        {"lat":"8.325316999999999723e+01","lon":"-4.840469133333333218e+01"},
        {"lat":"8.319080233333333751e+01","lon":"-4.939215488888888927e+01"},
        {"lat":"8.312843466666666359e+01","lon":"-5.037961844444444637e+01"},
        {"lat":"8.306606700000000387e+01","lon":"-5.136708200000000346e+01"},
        {"lat":"8.301172566666666341e+01","lon":"-5.234764022222222479e+01"},
        {"lat":"8.295738433333333717e+01","lon":"-5.332819844444444612e+01"},
        {"lat":"8.290304299999999671e+01","lon":"-5.430875666666666746e+01"},
        {"lat":"8.284870166666667046e+01","lon":"-5.528931488888888879e+01"},
        {"lat":"8.279436033333333000e+01","lon":"-5.626987311111111012e+01"},
        {"lat":"8.274001900000000376e+01","lon":"-5.725043133333333856e+01"},
        {"lat":"8.268567766666666330e+01","lon":"-5.823098955555555989e+01"},
        {"lat":"8.263133633333333705e+01","lon":"-5.921154777777778122e+01"},
        {"lat":"8.257699499999999659e+01","lon":"-6.019210600000000255e+01"},
        {"lat":"8.265352066666666531e+01","lon":"-6.128314966666666663e+01"},
        {"lat":"8.273004633333333402e+01","lon":"-6.237419333333333782e+01"},
        {"lat":"8.280657200000000273e+01","lon":"-6.346523700000000190e+01"},
        {"lat":"8.288309766666667144e+01","lon":"-6.455628066666666598e+01"},
        {"lat":"8.295962333333332595e+01","lon":"-6.564732433333333006e+01"},
        {"lat":"8.303614899999999466e+01","lon":"-6.673836800000000835e+01"},
        {"lat":"8.311267466666666337e+01","lon":"-6.782941166666667243e+01"},
        {"lat":"8.318920033333333208e+01","lon":"-6.892045533333333651e+01"},
        {"lat":"8.326572600000000079e+01","lon":"-7.001149900000000059e+01"},
        {"lat":"8.326370233333332749e+01","lon":"-7.172355388888888683e+01"},
        {"lat":"8.326167866666666839e+01","lon":"-7.343560877777777307e+01"},
        {"lat":"8.325965499999999508e+01","lon":"-7.514766366666667352e+01"},
        {"lat":"8.325763133333333599e+01","lon":"-7.685971855555555976e+01"},
        {"lat":"8.325560766666666268e+01","lon":"-7.857177344444444600e+01"},
        {"lat":"8.325358400000000358e+01","lon":"-8.028382833333333224e+01"},
        {"lat":"8.325156033333333028e+01","lon":"-8.199588322222223269e+01"},
        {"lat":"8.324953666666667118e+01","lon":"-8.370793811111111893e+01"},
        {"lat":"8.324751299999999787e+01","lon":"-8.541999300000000517e+01"},
        {"lat":"8.302642988888888453e+01","lon":"-8.737103588888889760e+01"},
        {"lat":"8.280534677777777119e+01","lon":"-8.932207877777777583e+01"},
        {"lat":"8.258426366666667207e+01","lon":"-9.127312166666666826e+01"},
        {"lat":"8.236318055555555873e+01","lon":"-9.322416455555556070e+01"},
        {"lat":"8.214209744444444539e+01","lon":"-9.517520744444443892e+01"},
        {"lat":"8.192101433333333205e+01","lon":"-9.712625033333333135e+01"},
        {"lat":"8.169993122222223292e+01","lon":"-9.907729322222222379e+01"},
        {"lat":"8.147884811111111958e+01","lon":"-1.010283361111111020e+02"},
        {"lat":"8.125776500000000624e+01","lon":"-1.029793789999999944e+02"},
        {"lat":"8.149772477777777624e+01","lon":"-1.039316737777777746e+02"},
        {"lat":"8.173768455555556045e+01","lon":"-1.048839685555555548e+02"},
        {"lat":"8.197764433333333045e+01","lon":"-1.058362633333333349e+02"},
        {"lat":"8.221760411111111466e+01","lon":"-1.067885581111111151e+02"},
        {"lat":"8.245756388888888466e+01","lon":"-1.077408528888888810e+02"},
        {"lat":"8.269752366666666887e+01","lon":"-1.086931476666666612e+02"},
        {"lat":"8.293748344444443887e+01","lon":"-1.096454424444444413e+02"},
        {"lat":"8.317744322222222308e+01","lon":"-1.105977372222222215e+02"},
        {"lat":"8.341740299999999309e+01","lon":"-1.115500320000000016e+02"},
        {"lat":"8.350959588888888163e+01","lon":"-1.136868884444444490e+02"},
        {"lat":"8.360178877777777018e+01","lon":"-1.158237448888888963e+02"},
        {"lat":"8.369398166666665873e+01","lon":"-1.179606013333333436e+02"},
        {"lat":"8.378617455555554727e+01","lon":"-1.200974577777777768e+02"},
        {"lat":"8.387836744444445003e+01","lon":"-1.222343142222222241e+02"},
        {"lat":"8.397056033333333858e+01","lon":"-1.243711706666666714e+02"},
        {"lat":"8.406275322222222712e+01","lon":"-1.265080271111111188e+02"},
        {"lat":"8.415494611111111567e+01","lon":"-1.286448835555555661e+02"},
        {"lat":"8.424713900000000422e+01","lon":"-1.307817400000000134e+02"},
        {"lat":"8.409971711111111858e+01","lon":"-1.332205436666666856e+02"},
        {"lat":"8.395229522222223295e+01","lon":"-1.356593473333333577e+02"},
        {"lat":"8.380487333333333311e+01","lon":"-1.380981510000000014e+02"},
        {"lat":"8.365745144444444747e+01","lon":"-1.405369546666666736e+02"},
        {"lat":"8.351002955555556184e+01","lon":"-1.429757583333333457e+02"},
        {"lat":"8.336260766666667621e+01","lon":"-1.454145620000000179e+02"},
        {"lat":"8.321518577777777637e+01","lon":"-1.478533656666666616e+02"},
        {"lat":"8.306776388888889073e+01","lon":"-1.502921693333333337e+02"},
        {"lat":"8.292034200000000510e+01","lon":"-1.527309730000000059e+02"},
        {"lat":"8.275829066666666733e+01","lon":"-1.540548950000000161e+02"},
        {"lat":"8.259623933333332957e+01","lon":"-1.553788169999999980e+02"},
        {"lat":"8.243418800000000601e+01","lon":"-1.567027390000000082e+02"},
        {"lat":"8.227213666666666825e+01","lon":"-1.580266610000000185e+02"},
        {"lat":"8.211008533333333048e+01","lon":"-1.593505830000000003e+02"},
        {"lat":"8.194803399999999272e+01","lon":"-1.606745050000000106e+02"},
        {"lat":"8.178598266666666916e+01","lon":"-1.619984270000000208e+02"},
        {"lat":"8.162393133333333139e+01","lon":"-1.633223490000000027e+02"},
        {"lat":"8.146187999999999363e+01","lon":"-1.646462710000000129e+02"},
        {"lat":"8.108583055555554608e+01","lon":"-1.643443238888889084e+02"},
        {"lat":"8.070978111111109854e+01","lon":"-1.640423767777777755e+02"},
        {"lat":"8.033373166666666521e+01","lon":"-1.637404296666666710e+02"},
        {"lat":"7.995768222222221766e+01","lon":"-1.634384825555555665e+02"},
        {"lat":"7.958163277777777012e+01","lon":"-1.631365354444444336e+02"},
        {"lat":"7.920558333333332257e+01","lon":"-1.628345883333333290e+02"},
        {"lat":"7.882953388888888924e+01","lon":"-1.625326412222222245e+02"},
        {"lat":"7.845348444444444169e+01","lon":"-1.622306941111110916e+02"},
        {"lat":"7.807743499999999415e+01","lon":"-1.619287469999999871e+02"},
        {"lat":"7.778008666666666215e+01","lon":"-1.627532948888888882e+02"},
        {"lat":"7.748273833333333016e+01","lon":"-1.635778427777777608e+02"},
        {"lat":"7.718538999999999817e+01","lon":"-1.644023906666666619e+02"},
        {"lat":"7.688804166666666617e+01","lon":"-1.652269385555555630e+02"},
        {"lat":"7.659069333333333418e+01","lon":"-1.660514864444444356e+02"},
        {"lat":"7.629334500000000219e+01","lon":"-1.668760343333333367e+02"},
        {"lat":"7.599599666666667019e+01","lon":"-1.677005822222222378e+02"},
        {"lat":"7.569864833333333820e+01","lon":"-1.685251301111111104e+02"},
        {"lat":"7.540130000000000621e+01","lon":"-1.693496780000000115e+02"},
        {"lat":"7.513633033333333344e+01","lon":"-1.720122585000000015e+02"},
        {"lat":"7.487136066666667489e+01","lon":"-1.746748390000000200e+02"},
        {"lat":"7.460639100000000212e+01","lon":"-1.773374195000000100e+02"},
        {"lat":"7.434142133333332936e+01","lon":"-1.800000000000000000e+02"},
        {"lat":"7.407645166666667080e+01","lon":"1.800000000000000000e+02"},
        {"lat":"7.381148199999999804e+01","lon":"1.791611552500000073e+02"},
        {"lat":"7.354651233333332527e+01","lon":"1.783223105000000146e+02"},
        {"lat":"7.328154266666666672e+01","lon":"1.774834657499999935e+02"},
        {"lat":"7.301657299999999395e+01","lon":"1.766446210000000008e+02"},
        {"lat":"7.344553444444443357e+01","lon":"1.740200037777777879e+02"},
        {"lat":"7.387449588888888741e+01","lon":"1.713953865555555467e+02"},
        {"lat":"7.430345733333332703e+01","lon":"1.687707693333333339e+02"},
        {"lat":"7.473241877777776665e+01","lon":"1.661461521111111210e+02"},
        {"lat":"7.516138022222222048e+01","lon":"1.635215348888888798e+02"},
        {"lat":"7.559034166666666010e+01","lon":"1.608969176666666669e+02"},
        {"lat":"7.601930311111109972e+01","lon":"1.582723004444444541e+02"},
        {"lat":"7.644826455555555356e+01","lon":"1.556476832222222129e+02"},
        {"lat":"7.687722599999999318e+01","lon":"1.530230660000000000e+02"},
        {"lat":"7.705771966666665662e+01","lon":"1.497481009999999912e+02"},
        {"lat":"7.723821333333333428e+01","lon":"1.464731360000000109e+02"},
        {"lat":"7.741870699999999772e+01","lon":"1.431981710000000021e+02"},
        {"lat":"7.759920066666666116e+01","lon":"1.399232059999999933e+02"},
        {"lat":"7.777969433333333882e+01","lon":"1.366482410000000129e+02"},
        {"lat":"7.796018800000000226e+01","lon":"1.333732760000000042e+02"},
        {"lat":"7.814068166666666571e+01","lon":"1.300983109999999954e+02"},
        {"lat":"7.832117533333334336e+01","lon":"1.268233460000000008e+02"},
        {"lat":"7.850166900000000680e+01","lon":"1.235483810000000062e+02"},
        {"lat":"7.879725377777778306e+01","lon":"1.212953910000000093e+02"},
        {"lat":"7.909283855555555931e+01","lon":"1.190424010000000123e+02"},
        {"lat":"7.938842333333333556e+01","lon":"1.167894110000000012e+02"},
        {"lat":"7.968400811111111182e+01","lon":"1.145364210000000043e+02"},
        {"lat":"7.997959288888888807e+01","lon":"1.122834310000000073e+02"},
        {"lat":"8.027517766666666432e+01","lon":"1.100304410000000104e+02"},
        {"lat":"8.057076244444444058e+01","lon":"1.077774510000000134e+02"},
        {"lat":"8.086634722222221683e+01","lon":"1.055244610000000023e+02"},
        {"lat":"8.116193199999999308e+01","lon":"1.032714710000000053e+02"},
        {"lat":"8.122412599999999827e+01","lon":"1.001474796666666691e+02"},
        {"lat":"8.128631999999998925e+01","lon":"9.702348833333333289e+01"},
        {"lat":"8.134851399999999444e+01","lon":"9.389949699999999666e+01"},
        {"lat":"8.141070799999999963e+01","lon":"9.077550566666667464e+01"},
        {"lat":"8.147290199999999061e+01","lon":"8.765151433333333841e+01"},
        {"lat":"8.153509599999999580e+01","lon":"8.452752300000000218e+01"},
        {"lat":"8.159729000000000099e+01","lon":"8.140353166666666596e+01"},
        {"lat":"8.165948399999999197e+01","lon":"7.827954033333332973e+01"},
        {"lat":"8.172167799999999716e+01","lon":"7.515554899999999350e+01"},
        {"lat":"8.119391488888888375e+01","lon":"7.412196077777777248e+01"},
        {"lat":"8.066615177777777035e+01","lon":"7.308837255555555146e+01"},
        {"lat":"8.013838866666667116e+01","lon":"7.205478433333333044e+01"},
        {"lat":"7.961062555555555775e+01","lon":"7.102119611111110942e+01"},
        {"lat":"7.908286244444444435e+01","lon":"6.998760788888888840e+01"},
        {"lat":"7.855509933333333095e+01","lon":"6.895401966666666738e+01"},
        {"lat":"7.802733622222223175e+01","lon":"6.792043144444444636e+01"},
        {"lat":"7.749957311111111835e+01","lon":"6.688684322222222534e+01"}
    ];
    
    $scope.postReq= function(){
        console.log("Button clicked. Sending POST request.");
        var url = "http://localhost:8080/post1";
        $http({
            method: 'POST',
            url: url,
            headers: 'application/json',
            data: dataObj}).then(function(success){
                console.log("POST request success.");
                console.log(success);
                //TODO: Add file write here to save ice list
        }, function(error){
            console.log("error: " + JSON.stringify(error));
            alert("The remote server could not be accessed.");
        });
    };
    
    $scope.postReq2 = function(){
        var url = "http://localhost:8080/post2"
        $http({
            method: 'POST',
            url: url,
            headers: 'application/json',
            data: [{test:"thisisa"}]
        }).then(function(success){
            console.log(success.data);
        }, function(error){
            console.log("error: " + error);
        });
    };
    
    $scope.getRequest = function(){
        $scope.$broadcast('scroll.refreshComplete');
        var url = "http://localhost:8080/getData";
        $http({
            method: 'GET',
            url: url,
        }).then(function(success){
            $scope.data = success.data;
        }, function(error){
            console.log("error: " + JSON.stringify(error));
            alert("The remote server could not be accessed.");
        });
    };
    
    $scope.itemClick = function(object){
        var index = $scope.data.indexOf(object);
        alert("This will download the " + $scope.data[index].name + " dataset.");
        //TODO: Download ice image here. POST2 Request.
    };
    
    $ionicPlatform.ready(function(){
        $scope.getRequest();
    });
    
})
