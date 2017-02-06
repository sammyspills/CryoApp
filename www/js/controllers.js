angular.module('app.controllers', [])

.controller('homeCtrl', function($scope, $state, $ionicHistory, $ionicSideMenuDelegate) {
    /* NOTE: Controllers are not in order of home screen buttons. Check routes.js to see states.
    Some of these are unused. I'm keeping them for now. */
    $ionicSideMenuDelegate.canDragContent(false);

    if(ionic.Platform.isAndroid()){
        console.log("Platform is Android");
    } else {
        console.log("Platform is not Android");
    };

    $scope.trackScreen = function(){
        $state.go('menu.routeTrack');
    };
    $scope.iceScreen = function(){
        $state.go('menu.seaIce');
    };
    $scope.aboutScreen = function(){
        $state.go('menu.about');
    };

})

.controller('mapsCtrl', function($scope, $state, $ionicPlatform, $ionicModal, $ionicLoading, routeService, $cordovaFile, $ionicPopup) {

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
                .attr('x','-1%')
                .attr('y','-1')
                .attr("transform", "scale(1.02)")
                .attr("xlink:href","img/ice_thickness/" + routeService.selectedIce);

            console.log("Image used: img/ice_thickness/" + routeService.selectedIce);
        } catch(err) {
            console.log("No image selected");
        };

        //D3 Path Generator
        var path = d3.geoPath()
            .projection(projection);

        //Draw lines between every point in route
        // jank plz forgive
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

        vis.selectAll("text")
            .data([startPoint,endPoint]).enter()
            .append("text")
            .attr("x", function (d) { return projection(d)[0]; })
            .attr("y", function (d) { return projection(d)[1]; })
            .attr("text-anchor", "middle")
            .attr("fill", "#ffffff")
            .attr("stroke", "#00338d")
            .attr("font-weight", "bold")
            .attr("stroke-width", "1px")
            .style("font-size", "14px")
            .text(function(d, i) { if(i==0){ return "Start" } else { return "End" }; });

        var g = vis.append("g");

        //Add JSON land data
        // d3.json("json/world-110m.json", function(error, world) {
        //     if (error){ console.log(error) };
        //     console.log('json called');

        //     vis.insert("path", ".graticule")
        //         .datum(topojson.feature(world, world.objects.land))
        //         .attr("class", "land")
        //         .attr("d", path);

        //     console.log('JSON Features added.');

        //     vis.insert("path", ".graticule")
        //         .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
        //         .attr("class", "boundary")
        //         .attr("d", path);
        // });

        return vis;
    };

    //Get dimens of Ice Thickness chart div
    var chartDiv = document.getElementById('chart-div');
    var divHeight = chartDiv.offsetHeight;
    var divWidth = chartDiv.offsetWidth;
    var padding = "30";

    //Function to draw scatter plot
    var scatterFunc = function(data, season){

        //Initialise 2D array for thickness, cum. dist.
        var xData = [],
            yData = [];

        //append appropriate data to array
        data.forEach(function(d){
            if(d[String(season)] >= 0){
                    xData.push(parseFloat(d.cumdist));
                    yData.push(parseFloat(d[String(season)]));
            } else {

            }
        });

        //Init SVG container, scales, axes
        var vis = d3.select("#visualisation"),
            WIDTH = divWidth,
            HEIGHT = divHeight,
            MARGINS = {
                top: 15,
                right: 20,
                bottom: 60,
                left: 60
            },
            xScale = d3.scaleLinear()
            .range([MARGINS.left, WIDTH - MARGINS.right])
            .domain([0, d3.max(xData)]),

            yScale = d3.scaleLinear()
            .range([HEIGHT - MARGINS.bottom, MARGINS.top])
            .domain([0, d3.max(yData)]),

            xAxis = d3.axisBottom().scale(xScale).tickArguments([5]),
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

        //Add the valueline path
        // vis.append("svg:path")
        // .attr("class", "line")
        // .attr("stroke", "#00338d")
        // .attr('stroke-width', 0.5)
        // .attr("d", lineGen(xData))
        // .attr("fill", "none");

        //Add labels, points, thickness label
        var div = vis.append("text")
            .attr("x", WIDTH - MARGINS.right)
            .attr("y", MARGINS.top * 2)
            .attr("class", "tooltip")
            .attr("text-anchor", "end")
            .html("Click a point to view thickness");

        var distText = vis.append("text")
                .attr('x', WIDTH - MARGINS.right)
                .attr('y', (MARGINS.top * 2) + 17)
                .attr("class", "tooltip")
                .attr("text-anchor", "end");

        node = vis.selectAll("g")
            .data(xData)
            .enter()
            .append("g");

        node.append("circle")
            .attr('class', 'dot-touch')
            .attr('cx', function(d, i) { return xScale(xData[i]); })
            .attr('cy', function(d, i) { return yScale(yData[i]); })
            .style("stroke", "rgba(0, 55, 109, 0)")
            .style("fill", "rgba(0, 55, 109, 0)")
            .attr('r', 8);

        node.append("circle")
            .attr('class', 'dot')
            .attr('cx', function(d, i) { return xScale(xData[i]); })
            .attr('cy', function(d, i) { return yScale(yData[i]); })
            .style("stroke", "rgba(0, 55, 109, 0)")
            .style("fill", "#00338d")
            .attr('r', 2);

        //On point click, highlight point and display thickness at that point
        var points = vis.selectAll(".dot");
        var touchPoints = vis.selectAll(".dot-touch");

        touchPoints.on("click", function(d, i){

            touchPoints.attr('r', 8)
                .style("fill", "rgba(0, 55, 109, 0)")
                .style("stroke", "rgba(0, 55, 109, 0)");

            points.attr('r', 2)
                .style("fill", "#00338d")
                .style("stroke", "rgba(0, 55, 109, 0)");

            thickness = yData[i];
            distance = xData[i];

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

        $scope.iceName = "spring2016";
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

                var initialEntry = '{"name":"Spring 2016","file":"201604_thk.png","season":"spring2016"}, {"name":"Winter 2015","file":"201512_thk.png","season":"winter2015"}, {"name":"Autumn 2015","file":"201510_thk.png","season":"autumn2015"}';
                $cordovaFile.writeFile($scope.fileDir, "iceFile.json", initialEntry, true).then(function(){

                    $cordovaFile.readAsText($scope.fileDir, "iceFile.json").then(function(success){

                        var json_data = '[' + success + ']';
                        $scope.iceOptions = JSON.parse(json_data);
                        mapInit();

                    });

                });

            });

        });

        $scope.dontShow = {
            checked: false
        };

        $scope.closeModal = function(){
            if(window.Statusbar){
                Statusbar.backgroundColorByHexString("#00338d");
            };
            $scope.modal.hide();
            $scope.modal.remove();
        };

        $scope.iceInfo = function(){
            $ionicModal.fromTemplateUrl('templates/ice-modal-maps.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function(modal){
                $scope.modal = modal;
                if(window.Statusbar){
                    Statusbar.backgroundColorByHexString("#ffffff");
                };
                $scope.modal.show();
            });
        };

        $scope.returnToRouteTrack;

        //Service to handle selected route and ice between views
        var mapInit = function(){
            var routeFile = routeService.selectedRoute.file;
            $scope.initSeason = "spring2016";
            console.log(routeFile);

            //If route is user route, needs processing
            if(routeService.routeType == "usr"){
                $scope.fileDir = cordova.file.dataDirectory;
                //Read route file and parse to JSON object
                $cordovaFile.readAsText($scope.fileDir, routeFile).then(function(success){
                    var route_json_str = success;
                    console.log('Route: ' + route_json_str);
                    var route_data = JSON.parse(route_json_str);
                    if(route_data[0] != undefined){
                        //Check if it already has thickness data
                        if(route_data[0].hasOwnProperty($scope.iceName)){
                            vis = topoFunc(route_data);
                            scatterFunc(route_data, $scope.initSeason);
                            $ionicLoading.hide();
                        } else {
                            //Read ice data, x-process.
                            console.log("Ice data not found in route file");
                            vis = topoFunc(route_data);
                            $ionicLoading.hide();
                            var alertPopup = $ionicPopup.show({
                                title: "Route Processing",
                                subTitle: "Route needs processing before sea ice trends can be viewed",
                                template: '<p style="text-align:center">To view sea ice trends along your route, please swipe your route to the left and select "Process" from the More menu. This will require a stable internet connection.</p>',
                                buttons: [
                                    { text: 'OK'}
                                ]
                            });
                            alertPopup.then(function(res){
                                console.log("Alert tapped!");
                                $scope.returnToRouteTrack = true;
                                // $state.go('menu.routeTrack');
                            });
                        };
                    } else {
                        console.log("Route file is empty");
                        vis = topoFunc([]);
                        $ionicLoading.hide();
                        var alertPopup = $ionicPopup.show({
                            title: "Route Empty",
                            template: "This route file is empty. This normally happens if the route tracking is stopped before a location point is recorded. Recommended action is to delete the route.",
                            buttons: [
                                { text: 'OK'}
                            ]
                        });
                        alertPopup.then(function(res){
                            console.log("Alert tapped");
                            $scope.returnToRouteTrack = true;
                            // $state.go('menu.routeTrack');
                        });
                    };

                }, function(error){
                    console.log("Error: " + JSON.stringify(error));
                });
            } else if(routeService.routeType == "eg"){
                d3.json("res/" + routeFile, function(error, data){
                    if(error){ console.log(error) };

                    scatterFunc(data, $scope.initSeason);
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
            $scope.iceName = mySelect.season;
            $scope.seasonSelect = mySelect.season

            //On new ice data selected, read route data file, show loading screen, draw charts, hide loading screen.
            if(routeService.routeType == "usr"){
                $scope.fileDir = cordova.file.dataDirectory;
                $cordovaFile.readAsText($scope.fileDir, routeFile).then(function(success){
                    var data_json_str = success;
                    console.log('Route: ' + data_json_str);
                    var data = JSON.parse(data_json_str);
                    if(data[0].hasOwnProperty($scope.iceName)){
                        vis = topoFunc(data);
                        scatterFunc(data, $scope.seasonSelect);
                        $ionicLoading.hide();
                    } else {
                        console.log("Ice data not found in route file");
                        console.log(JSON.stringify($scope.iceOptions));
                        vis = topoFunc(data);
                        $ionicLoading.hide();
//                        alert("This route needs to be processed! To view sea ice trends along your route, please swipe your route to the left and select 'Process' from the More menu! This will require a stable internet connection!");
                        var alertPopup = $ionicPopup.show({
                            title: "Route Processing",
                            subTitle: "Route needs processing before sea ice trends can be viewed.",
                            template: "To view sea ice trends along your route, please swipe your route to the left and select 'Process' from the More menu. This will require a stable internet connection.",
                            buttons: [
                                { text: 'OK'}
                            ]
                        });
                        alertPopup.then(function(res){
                            console.log("Alert tapped!");
                            $scope.returnToRouteTrack = true;
                            // $state.go('menu.routeTrack');
                        });
                    }

                }, function(error){
                    console.log("Error: " + JSON.stringify(error));
                });
            } else if(routeService.routeType == "eg"){
                d3.json("res/" + routeFile, function(error, data){
                    if(error){ console.log(error) };

                    scatterFunc(data, $scope.seasonSelect);
                    vis = topoFunc(data);
                    $ionicLoading.hide();

                });
            };
        };

        $cordovaFile.checkFile($scope.fileDir, '.flags').then(function(success){
            console.log("Maps screen has been viewed before.");
        }, function(error){
                //if flags not set, show popover
                var tutPopup = $ionicPopup.show({
                    template: '<p style="text-align:center">This screen displays the thickness of ice along your route. Click a point on the graph to view the exact thickness.</br></br> Click on the colourbar at any point to learn more about the sea ice data.</br></br>Pinch to zoom in on the map.</p><ion-checkbox ng-model="dontShow.checked">Don&apos;t show again</ion-checkbox>',
                    scope: $scope,
                    buttons: [
                        {
                            text: 'OK',
                            type: 'button-positive',
                            onTap: function(e) {
                                return $scope.dontShow.checked;
                            }
                        }
                    ]
                });
                tutPopup.then(function(res){
                    //If dontShow, set flags
                    if(res){
                        $cordovaFile.createFile($scope.fileDir, ".flags", true);
                    } else {
                        console.log("Show again next time - flags not set.");
                    };
                    if(returnToRouteTrack){
                        $state.go('menu.routeTrack');
                    };
                });
        });

    });


})

.controller('seaIceCtrl', function($scope, $state, $ionicLoading, routeService, $cordovaFile, $ionicActionSheet, $cordovaGeolocation, $ionicPlatform, $ionicListDelegate, $ionicModal, $ionicPopup){

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
            .attr('x','-1%')
            .attr('y','-1%')
            .attr("transform", "scale(1.02)")
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
                    [[-120,70]]
                        .concat(parallel(80, -120, -90))
                        .concat(parallel(70, -120, -90).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-150,70]]
                        .concat(parallel(80, -150, -120))
                        .concat(parallel(70, -150, -120).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-180,70]]
                        .concat(parallel(80, -180, -150))
                        .concat(parallel(70, -180, -150).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[150,70]]
                        .concat(parallel(80, 150, 180))
                        .concat(parallel(70, 150, 180).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[120,70]]
                        .concat(parallel(80, 120, 150))
                        .concat(parallel(70, 120, 150).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[90,70]]
                        .concat(parallel(80, 90, 120))
                        .concat(parallel(70, 90, 120).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[60,70]]
                        .concat(parallel(80, 60, 90))
                        .concat(parallel(70, 60, 90).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[30,70]]
                        .concat(parallel(80, 30, 60))
                        .concat(parallel(70, 30, 60).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[0,70]]
                        .concat(parallel(80, 0, 30))
                        .concat(parallel(70, 0, 30).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-30,70]]
                        .concat(parallel(80, -30, 0))
                        .concat(parallel(70, -30, 0).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-60,70]]
                        .concat(parallel(80, -60, -30))
                        .concat(parallel(70, -60, -30).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-90,70]]
                        .concat(parallel(80, -90, -60))
                        .concat(parallel(70, -90, -60).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-120,60]]
                        .concat(parallel(70, -120, -90))
                        .concat(parallel(60, -120, -90).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-150,60]]
                        .concat(parallel(70, -150, -120))
                        .concat(parallel(60, -150, -120).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-180,60]]
                        .concat(parallel(70, -180, -150))
                        .concat(parallel(60, -180, -150).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[150,60]]
                        .concat(parallel(70, 150, 180))
                        .concat(parallel(60, 150, 180).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[120,60]]
                        .concat(parallel(70, 120, 150))
                        .concat(parallel(60, 120, 150).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[90,60]]
                        .concat(parallel(70, 90, 120))
                        .concat(parallel(60, 90, 120).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[60,60]]
                        .concat(parallel(70, 60, 90))
                        .concat(parallel(60, 60, 90).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[30,60]]
                        .concat(parallel(70, 30, 60))
                        .concat(parallel(60, 30, 60).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[0,60]]
                        .concat(parallel(70, 0, 30))
                        .concat(parallel(60, 0, 30).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-30,60]]
                        .concat(parallel(70, -30, 0))
                        .concat(parallel(60, -30, 0).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-60,60]]
                        .concat(parallel(70, -60, -30))
                        .concat(parallel(60, -60, -30).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-90,60]]
                        .concat(parallel(70, -90, -60))
                        .concat(parallel(60, -90, -60).reverse())
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
                .attr("id", "quad" + i)
                .attr("class", "quad")
        };

        //Handle click event for quadrants. Highlight area. Change chart data.
        var quads = vis.selectAll(".quad");
        quads.on("click", function(d, i){
            routeService.selectedQuad = "#" + this.id;
            quads.attr('fill', 'rgba(255, 255, 255, 0)');
            d3.select(this)
                .attr('fill', 'rgba(0, 55, 109, 0.3)');

            var xData = [],
                yData = [];

            var parseDate = d3.timeParse("%Y-%d-%m")

            d3.csv("res/means.csv", function(data){

                scatterFunc(data, i);

            });

        });

        var g = vis.append("g");

        //Show land JSON
        // d3.json("json/world-110m.json", function(error, world) {
        //       if (error) throw error;

        //     vis.insert("path", ".graticule")
        //         .datum(topojson.feature(world, world.objects.land))
        //         .attr("class", "land")
        //         .attr("d", path);

        //     vis.insert("path", ".graticule")
        //         .datum(topojson.mesh(world, world.objects.countries, function(a, b) { return a !== b; }))
        //         .attr("class", "boundary")
        //         .attr("d", path);
        // });

        return vis;
    };

    var chartDiv = document.getElementById("historic-chart");
    var chartHeight = chartDiv.offsetHeight;
    var chartWidth = chartDiv.offsetWidth;

    var scatterFunc = function(data, i){

        var parseDate = d3.timeParse("%Y-%d-%m")

        var xData = [],
            yData = [],
            season = [];

        data.forEach(function(d){
            xData.push(parseDate(d.date));
            yData.push(parseFloat(d[i+1]));
            season.push(d.season);
        });

        //Init SVG container, scales, axes
        var vis = d3.select("#chart"),
            WIDTH = chartWidth,
            HEIGHT = chartHeight,
            MARGINS = {
                top: 15,
                right: 20,
                bottom: 80,
                left: 60
            },
            xScale = d3.scaleTime()
            .range([MARGINS.left, WIDTH - MARGINS.right])
            .domain([new Date(xData[0]), new Date(xData[xData.length - 1])]),

            yScale = d3.scaleLinear()
            .range([HEIGHT - MARGINS.bottom, MARGINS.top])
            .domain([0, d3.max(yData)]),

            xAxis = d3.axisBottom().scale(xScale).tickArguments([6]),
            yAxis = d3.axisLeft().scale(yScale).tickArguments([5]);
        
        //Clear all SVG elements.
        vis.selectAll("svg > *").remove();

        vis.append("svg:g")
            .attr("class","axis")
            .attr("transform", "translate(0," + (HEIGHT - MARGINS.bottom) + ")")
            .call(xAxis)
            .selectAll("text")
                .style("font-size", "14px");

        vis.append("svg:g")
            .attr("class","axis")
            .attr("transform", "translate(" + MARGINS.left + ",0)")
            .call(yAxis)
            .selectAll("text")
                .style("font-size", "14px");

        var lineGen = d3.line().x(function(d, i){
            return xScale(xData[i]);
        })
        .y(function(d, i){
            return yScale(yData[i]);
        });

        vis.selectAll(".dot")
        .data(xData)
        .enter().append("circle")
        .attr("class","dot")
        .attr('cx', function(d, i) { return xScale(xData[i]); })
        .attr('cy', function(d, i) { return yScale(yData[i]); })
        .style("stroke","#00338d")
        .style("fill","#00338d")
        .attr('r', 3);

        vis.selectAll(".dot-touch")
        .data(xData)
        .enter().append("circle")
        .attr("class", "dot-touch")
        .attr('cx', function(d, i) { return xScale(xData[i]); })
        .attr('cy', function(d, i) { return yScale(yData[i]); })
        .style("stroke", "rgba(0, 55, 109, 0)")
        .style("fill", "rgba(0, 55, 109, 0)")
        .attr('id', function(d, i) { return season[i]; })
        .attr('r', 6);
        
        var touchPoints = vis.selectAll(".dot-touch");

        touchPoints.on("click", function(d, i){
            var dotID = this.id;

            for(var j = 0; j < $scope.iceOptions.length; j++){
                if($scope.iceOptions[j].season == dotID){
                    $scope.selectedIce(j);
                };
            };
        });

        vis.select(routeService.iceSeason)
            .style("fill", "rgba(0, 55, 109, 0)")
            .style("stroke", "red")
            .attr('r', 6);

        vis.append("text")
            .attr("class", "legend")
            .attr("text-anchor", "middle")
            .attr("x", MARGINS.left + (WIDTH-MARGINS.left-MARGINS.right)/2)
            .attr("y", HEIGHT-(MARGINS.bottom/2))
            .text("Year");

        vis.append("text")
            .attr("class", "legend")
            .attr("text-anchor", "middle")
            .attr("y", MARGINS.left/2.5)
            .attr("x", -MARGINS.top-(HEIGHT-MARGINS.top-MARGINS.bottom)/2)
            .attr("transform", "rotate(-90)")
            .text("Mean Sea Ice Thickness (m)");

    };

    $ionicPlatform.ready(function(){
        
        $scope.iceOptions = [
            {
                "name":"Jul 2010",
                "file":"201007_thk.png",
                "season":"Jul2010"
            },
            {
                "name":"Aug 2010",
                "file":"201008_thk.png",
                "season":"Aug2010"
            },
            {
                "name":"Sep 2010",
                "file":"201009_thk.png",
                "season":"Sep2010"
            },
            {
                "name":"Oct 2010",
                "file":"201010_thk.png",
                "season":"Oct2010"
            },
            {
                "name":"Nov 2010",
                "file":"201011_thk.png",
                "season":"Nov2010"
            },
            {
                "name":"Dec 2010",
                "file":"201012_thk.png",
                "season":"Dec2010"
            },
            {
                "name":"Jan 2011",
                "file":"201101_thk.png",
                "season":"Jan2011"
            },
            {
                "name":"Feb 2011",
                "file":"201102_thk.png",
                "season":"Feb2011"
            },
            {
                "name":"Mar 2011",
                "file":"201103_thk.png",
                "season":"Mar2011"
            },
            {
                "name":"Apr 2011",
                "file":"201104_thk.png",
                "season":"Apr2011"
            },
            {
                "name":"May 2011",
                "file":"201105_thk.png",
                "season":"May2011"
            },
            {
                "name":"Jun 2011",
                "file":"201106_thk.png",
                "season":"Jun2011"
            },
            {
                "name":"Jul 2011",
                "file":"201107_thk.png",
                "season":"Jul2011"
            },
            {
                "name":"Aug 2011",
                "file":"201108_thk.png",
                "season":"Aug2011"
            },
            {
                "name":"Sep 2011",
                "file":"201109_thk.png",
                "season":"Sep2011"
            },
            {
                "name":"Oct 2011",
                "file":"201110_thk.png",
                "season":"Oct2011"
            },
            {
                "name":"Nov 2011",
                "file":"201111_thk.png",
                "season":"Nov2011"
            },
            {
                "name":"Dec 2011",
                "file":"201112_thk.png",
                "season":"Dec2011"
            },
            {
                "name":"Jan 2012",
                "file":"201201_thk.png",
                "season":"Jan2012"
            },
            {
                "name":"Feb 2012",
                "file":"201202_thk.png",
                "season":"Feb2012"
            },
            {
                "name":"Mar 2012",
                "file":"201203_thk.png",
                "season":"Mar2012"
            },
            {
                "name":"Apr 2012",
                "file":"201204_thk.png",
                "season":"Apr2012"
            },
            {
                "name":"May 2012",
                "file":"201205_thk.png",
                "season":"May2012"
            },
            {
                "name":"Jun 2012",
                "file":"201206_thk.png",
                "season":"Jun2012"
            },
            {
                "name":"Jul 2012",
                "file":"201207_thk.png",
                "season":"Jul2012"
            },
            {
                "name":"Aug 2012",
                "file":"201208_thk.png",
                "season":"Aug2012"
            },
            {
                "name":"Sep 2012",
                "file":"201209_thk.png",
                "season":"Sep2012"
            },
            {
                "name":"Oct 2012",
                "file":"201210_thk.png",
                "season":"Oct2012"
            },
            {
                "name":"Nov 2012",
                "file":"201211_thk.png",
                "season":"Nov2012"
            },
            {
                "name":"Dec 2012",
                "file":"201212_thk.png",
                "season":"Dec2012"
            },
            {
                "name":"Jan 2013",
                "file":"201301_thk.png",
                "season":"Jan2013"
            },
            {
                "name":"Feb 2013",
                "file":"201302_thk.png",
                "season":"Feb2013"
            },
            {
                "name":"Mar 2013",
                "file":"201303_thk.png",
                "season":"Mar2013"
            },
            {
                "name":"Apr 2013",
                "file":"201304_thk.png",
                "season":"Apr2013"
            },
            {
                "name":"May 2013",
                "file":"201305_thk.png",
                "season":"May2013"
            },
            {
                "name":"Jun 2013",
                "file":"201306_thk.png",
                "season":"Jun2013"
            },
            {
                "name":"Jul 2013",
                "file":"201307_thk.png",
                "season":"Jul2013"
            },
            {
                "name":"Aug 2013",
                "file":"201308_thk.png",
                "season":"Aug2013"
            },
            {
                "name":"Sep 2013",
                "file":"201309_thk.png",
                "season":"Sep2013"
            },
            {
                "name":"Oct 2013",
                "file":"201310_thk.png",
                "season":"Oct2013"
            },
            {
                "name":"Nov 2013",
                "file":"201311_thk.png",
                "season":"Nov2013"
            },
            {
                "name":"Dec 2013",
                "file":"201312_thk.png",
                "season":"Dec2013"
            },
            {
                "name":"Jan 2014",
                "file":"201401_thk.png",
                "season":"Jan2014"
            },
            {
                "name":"Feb 2014",
                "file":"201402_thk.png",
                "season":"Feb2014"
            },
            {
                "name":"Mar 2014",
                "file":"201403_thk.png",
                "season":"Mar2014"
            },
            {
                "name":"Apr 2014",
                "file":"201404_thk.png",
                "season":"Apr2014"
            },
            {
                "name":"May 2014",
                "file":"201405_thk.png",
                "season":"May2014"
            },
            {
                "name":"Jun 2014",
                "file":"201406_thk.png",
                "season":"Jun2014"
            },
            {
                "name":"Jul 2014",
                "file":"201407_thk.png",
                "season":"Jul2014"
            },
            {
                "name":"Aug 2014",
                "file":"201408_thk.png",
                "season":"Aug2014"
            },
            {
                "name":"Sep 2014",
                "file":"201409_thk.png",
                "season":"Sep2014"
            },
            {
                "name":"Oct 2014",
                "file":"201410_thk.png",
                "season":"Oct2014"
            },
            {
                "name":"Nov 2014",
                "file":"201411_thk.png",
                "season":"Nov2014"
            },
            {
                "name":"Dec 2014",
                "file":"201412_thk.png",
                "season":"Dec2014"
            },
            {
                "name":"Jan 2015",
                "file":"201501_thk.png",
                "season":"Jan2015"
            },
            {
                "name":"Feb 2015",
                "file":"201502_thk.png",
                "season":"Feb2015"
            },
            {
                "name":"Mar 2015",
                "file":"201503_thk.png",
                "season":"Mar2015"
            },
            {
                "name":"Apr 2015",
                "file":"201504_thk.png",
                "season":"Apr2015"
            },
            {
                "name":"May 2015",
                "file":"201505_thk.png",
                "season":"May2015"
            },
            {
                "name":"Jun 2015",
                "file":"201506_thk.png",
                "season":"Jun2015"
            },
            {
                "name":"Jul 2015",
                "file":"201507_thk.png",
                "season":"Jul2015"
            },
            {
                "name":"Aug 2015",
                "file":"201508_thk.png",
                "season":"Aug2015"
            },
            {
                "name":"Sep 2015",
                "file":"201509_thk.png",
                "season":"Sep2015"
            },
            {
                "name":"Oct 2015",
                "file":"201510_thk.png",
                "season":"Oct2015"
            },
            {
                "name":"Nov 2015",
                "file":"201511_thk.png",
                "season":"Nov2015"
            },
            {
                "name":"Dec 2015",
                "file":"201512_thk.png",
                "season":"Dec2015"
            },
            {
                "name":"Jan 2016",
                "file":"201601_thk.png",
                "season":"Jan2016"
            },
            {
                "name":"Feb 2016",
                "file":"201602_thk.png",
                "season":"Feb2016"
            },
            {
                "name":"Mar 2016",
                "file":"201603_thk.png",
                "season":"Mar2016"
            },
            {
                "name":"Apr 2016",
                "file":"201604_thk.png",
                "season":"Apr2016"
            }
        ];

        $scope.value = 'Sep 2014';
        $scope.rangeConfig = {
            min:'0',
            max: ($scope.iceOptions.length - 1).toString(),
            value:'50'
        };

        $scope.dontShow = {
            checked: false
        };

        $scope.fileDir = cordova.file.dataDirectory;
        console.log($scope.fileDir);

        $cordovaFile.checkFile($scope.fileDir, ".flags").then(function(success){
            //if flags set then log but don't show anything
            console.log("Sea Ice screen has been viewed before.");
        }, function(error){
            //if flags not set, show popover
            var tutPopup = $ionicPopup.show({
                template: '<p style="text-align:center">Click an area on the map to view average historic sea ice trends. </br></br> Click on the colourbar at any point to learn more about the sea ice data.</br></br>Pinch to zoom in on the map.</p><ion-checkbox ng-model="dontShow.checked">Don&apos;t show again</ion-checkbox>',
                scope: $scope,
                buttons: [
                    {
                        text: 'OK',
                        type: 'button-positive',
                        onTap: function(e) {
                            return $scope.dontShow.checked;
                        }
                    }
                ]
            });
            tutPopup.then(function(res){
                //If dontShow, set flags
                if(res){
                    $cordovaFile.createFile($scope.fileDir, ".flags", true);
                } else {
                    console.log("Show again next time - flags not set.");
                };
            });
        });

        routeService.selectedIce = $scope.iceOptions[50].file;
        routeService.iceSeason = "#" + $scope.iceOptions[50].season;
        routeService.selectedQuad = "#quad0";

        //Handle reload on new ice data selected
        $scope.selectedSeaIce = function(mySelect){
            //Set ice data label to selected date
            $scope.value = $scope.iceOptions[mySelect].name;
            routeService.iceSeason = "#" + $scope.iceOptions[mySelect].season;

            //Set selected ice image from slider
            routeService.selectedIce = $scope.iceOptions[mySelect].file;
            //Call mapFunction with new selected ice image
            var vis = mapFunc();

            //Select reference point and highlight
            try {

                d3.selectAll(".dot-touch")
                    .style("fill", "rgba(0, 55, 109, 0)")
                    .style('stroke', 'rgba(0, 55, 109, 0)')
                    .attr('r', 3);

                d3.select(routeService.iceSeason)
                    .style('fill', 'rgba(0, 55, 109, 0)')
                    .style('stroke', 'red')
                    .attr('r', 6);

                
            } catch(error) {
                console.log(error);
            }

            //If quad was selected before, reselect and fill.
            try {
                selectedQuad = routeService.selectedQuad;

                d3.select(selectedQuad)
                    .attr('fill', 'rgba(0, 55, 109, 0.3)');

            } catch(error) {
                console.log(error);
            };

        };

        $scope.closeModal = function(){
            if(window.Statusbar){
                Statusbar.backgroundColorByHexString("#00338d");
            };
            $scope.modal.hide();
            $scope.modal.remove();
        };

        $scope.iceInfo = function(){
            $ionicModal.fromTemplateUrl('templates/ice-modal.html', {
                scope: $scope,
                animation: 'slide-in-up'
            }).then(function(modal){
                $scope.modal = modal;
                if(window.Statusbar){
                    Statusbar.backgroundColorByHexString("#ffffff");
                };
                $scope.modal.show();
            });
        };

        var vis = mapFunc();
        vis.select("#quad0")
            .attr('fill', 'rgba(0, 51, 141, 0.3)');

        d3.csv("res/means.csv", function(data){
            scatterFunc(data, 0);
        });

    });

})

.controller('routeTrackCtrl', function($scope, $state, $ionicPlatform, $cordovaToast, $ionicPopup, $cordovaBackgroundGeolocation, $cordovaGeolocation, $interval, $ionicLoading, routeService, $ionicActionSheet, $cordovaFile, $ionicListDelegate, $http, locationUpdateService, routeHolder){

    $scope.fileDir = cordova.file.dataDirectory;

    var popUpTemplate = '<p style="text-align: center">Having trouble processing your route at the moment. Please try again later.</p>';
    var processTemplate = "<div style='margin:-20px;padding:15px;border-radius:7px;background-color:#00338d;text-align:center'>Processing.</br>This can take a few minutes.</br><ion-spinner class='spinner-light' icon='ripple'></ion-spinner></div>";
    var shareTemplate = "<div style='margin: -20px; padding: 15px; border-radius: 7px; background-color: #00338d; text-align: center'>Sending Route.</br>This can take a few minutes.</br><ion-spinner class='spinner-light' icon='ripple'></ion-spinner></div>";

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

    var clickedFunction = function(route, type){
        var url = "http://cryoapp.leeds.ac.uk/getData";
        $ionicLoading.show({
            template: processTemplate
        });
        $http({
            method: 'GET',
            timeout: 10000,
            url: url,
        }).then(function(success){
            $ionicLoading.hide();
            if(type === "PROCESS"){
                processRoute(route);
            } else if(type === "SHARE"){
                shareRoute(route);
            };
        }, function(error){
            $ionicLoading.hide();
            console.log("error: " + JSON.stringify(error));
            var alertPopup = $ionicPopup.show({
                title: 'Remote Server',
                template: popUpTemplate,
                buttons: [
                    { text: 'OK'}
                ]
            });
            alertPopup.then(function(res){
                console.log('Alert tapped');
            });
        });
    };

    var shareRoute = function(route){
        console.log("Share button pressed. Sending POST request. File: " + route.name);
        var file = route.file;
        var shareUrl = "http://cryoapp.leeds.ac.uk/post2";
        $ionicLoading.show({
            template: shareTemplate
        });
        $cordovaFile.readAsText($scope.fileDir, file).then(function(success){
            var shareBody = success;
            $http({
                method: 'POST',
                url: shareUrl,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: shareBody}).then(function(success){
                    $ionicLoading.hide();
                    console.log("POST2 request success.");
                    var responseData = success.data[0];
                    if(responseData.state == "success"){
                        var successTemplate = '<p style="text-align: center">Route has been shared. Thank you!</p>';
                    } else {
                        var successTemplate = '<p style="text-align: center">Route was shared, but was found to be empty. Please check the route you are using.</p>';
                    };
                    var successPopup = $ionicPopup.alert({
                        title: "Route Share",
                        template: successTemplate
                    });
                    successPopup.then(function(res){
                        console.log("successPopup closed.");
                    })
                    console.log(JSON.stringify(responseData));
                }, function(error){
                    $ionicLoading.hide();
                    console.log("Error: " + JSON.stringify(error));
                    var alertPopup = $ionicPopup.show({
                        title: "Remote Server",
                        template: popUpTemplate,
                        buttons: [
                            { text: 'OK'}
                        ]
                    });
                    alertPopup.then(function(res){
                        console.log("Alert tapped.");
                    });
                });
        });
    };

    var processRoute = function(route){
        console.log("Process button pressed. Sending POST request. File: " + route.name);
        var file = route.file;
        var url = "http://cryoapp.leeds.ac.uk/post1";
        $ionicLoading.show({
            template: processTemplate
        });
        $cordovaFile.readAsText($scope.fileDir, file).then(function(success){
            var postBody = success;
            // console.log(postBody);
            $http({
                method: 'POST',
                url: url,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: postBody}).then(function(success){
                    $ionicLoading.hide();
                    console.log("POST1 request success.");
                    var responseData = JSON.stringify(success.data);
                    $cordovaFile.writeFile($scope.fileDir, file, responseData, true).then(function(){
                        var successPopup = $ionicPopup.alert({
                            title: "Success",
                            template: "Route has finished processing."
                        });
                        successPopup.then(function(res){
                            console.log('successPopup closed.');
                        });
                    });
                }, function(error){
                    $ionicLoading.hide();
                    console.log("error: " + JSON.stringify(error));
                    var alertPopup = $ionicPopup.show({
                        title: 'Remote Server',
                        template: popUpTemplate,
                        buttons: [
                            { text: 'OK'}
                        ]
                    });
                    alertPopup.then(function(res){
                        console.log('Alert tapped');
                    });
                });
        });
    };

    //Function to handle deleting user route
    $scope.editUser = function(route){
        $ionicActionSheet.show({

            buttons: [
                {text: "Share with us"},
                {text: "Process"}
            ],
            destructiveText: 'Delete',
            titleText: route.name,
            cancelText: 'Cancel',
            cancel: function() { $ionicListDelegate.closeOptionButtons(); },
            buttonClicked: function(index, button){
                if(index == 0){
                    clickedFunction(route, "SHARE");
                } else if(index == 1) {
                    // processRoute(route);
                    clickedFunction(route, "PROCESS");
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
            "name":"Scientific Cruise around the Siberian Shelf - 2014",
            "file":"correctly_filtered.json"
        },
        {
            "name":"Tour of the Arctic circle from Svalbard to Severny Island - 2016",
            "file":"example_route_2.json"
        },
        {
            "name": "North West Passage - Northern Route - 2012",
            "file":"NWP_north_app.json"
        },
        {
            "name":"North West Passage - Southern Route - 2012",
            "file":"NWP_south_app.json"
        }
    ];


    //Function to set routeService selected route and show map screen
    var loadingTemplate = "<div style='margin:-20px;padding:15px;border-radius:7px;background-color:#00338d'>Processing...</div>"

    //Function to display example routes
    $scope.mapScreenUser = function(route){
        $ionicLoading.show({
            template: loadingTemplate
        });

        routeService.selectedRoute = route;
        routeService.selectedIce = "201204_thk.png";
        routeService.routeType = "usr";
        $state.go('menu.maps');
    };
    $scope.mapScreenExample = function(route){
        $ionicLoading.show({
            template: loadingTemplate
        });
        routeService.selectedRoute = route;
        routeService.selectedIce = "201204_thk.png";
        routeService.routeType = "eg";
        $state.go('menu.maps');
    };

  	$ionicPlatform.ready(function(){
  		console.log("[IONIC PLATFORM IS NOW READY]");

        // console.log('cordova.file.dataDirectory: ' + cordova.file.dataDirectory);
        $scope.fileDir = cordova.file.dataDirectory;

        //Parse json file holding user route names and filenames
        $cordovaFile.readAsText($scope.fileDir, "userRoutes.json").then(function(success){
            var routes_json = '[' + success + ']';
            $scope.userRoutes = JSON.parse(routes_json);
        }, function(error){
            console.log("userRoutes file doesn't exist yet!");
            $scope.userRoutes = [];
        });

        //If platform is Android, use Mauron plugin:
        if(ionic.Platform.isAndroid){
            //TODO: Update this function to use Mauron plugin. 
            console.log("Platform is Android");
            // Get a reference to the plugin.
            var bgGeo = window.BackgroundGeolocation;

            if(typeof locationUpdateService.tempJson !== 'undefined'){
                $scope.isRecording = true;
            } else {
                $scope.isRecording = false;
            };

            //This callback will be executed every time a geolocation is recorded in the background.
            var callbackFn = function(location, taskId) {
                var coords = location.coords;
                // var lat    = coords.latitude;
                // var lng    = coords.longitude;
                console.log('[bgGeo] location: ', JSON.stringify(location));
                locationUpdateService.updateLoc(coords);

                // Must signal completion of your callbackFn.
                bgGeo.finish(taskId);
            };

            // This callback will be executed if a location-error occurs.  Eg: this will be called if user disables location-services.
            var failureFn = function(errorCode) {
                console.warn('[bgGeo] error: ', errorCode);
            }

            // Listen to location events & errors.
            bgGeo.on('location', callbackFn, failureFn);

            // BackgroundGeoLocation is highly configurable.
            bgGeo.configure({
                // Geolocation config
                desiredAccuracy: 0,
                distanceFilter: 10,
                stationaryRadius: 50,
                useSignificantChangesOnly: true,

                // Activity Recognition config
                activityType: 'AutomotiveNavigation',
                activityRecognitionInterval: 5000,
                stopTimeout: 5,

                // Application config
                debug: false,
                stopOnTerminate: false,
                startOnBoot: true,

            }, function(state) {
                // This callback is executed when the plugin is ready to use.
                console.log('[bgGeo] ready: ', state);
            });

            $scope.startGeoTemplate = '<p style="text-align:center">Do you want to begin recording your location? </br></br>In order to view sea ice trends along a route, swipe it to the left and select "Process" from the More menu. The route will not be saved on our server unless you choose to by selecting "Share with us" from the More menu. </br></br> Please do not force kill the app whilst recording (Double-press Home, swipe app out of recents) as this will prevent the route from saving correctly.</p>';

            $scope.startGeolocation = function(){
                var confirmPopup = $ionicPopup.show({
                    title: 'Location Tracking',
                    template: $scope.startGeoTemplate,
                    scope: $scope,
                    buttons: [
                        { 
                            text: 'Cancel'
                        },
                        {
                            text: 'OK',
                            type: 'button-positive',
                            onTap: function(e) {
                                return true;
                            }
                        }
                    ]
                });
                confirmPopup.then(function(res){
                    if(res){
                        var year = new Date().getFullYear(),
                            date = new Date().getDate(),
                            month = new Date().getMonth(),
                            date_string = date + "_" + month + "_" + year;

                        routeHolder.routeName = "route_" + date_string + ".json";


                        $cordovaFile.createFile($scope.fileDir, routeHolder.routeName, true);
                        bgGeo.start();
                        $scope.isRecording = true;
                        console.log('[bgGeo] Tracking started.');
                        console.log('[bgGeo] Route file created');
                    } else {
                        console.log('[bgGeo] Begin tracking cancelled by user.');
                    };
                });
            };

            $scope.stopGeolocation = function(){
                var confirmPopup = $ionicPopup.show({

                    template: '<input type="text" name="namer" ng-model="data.name" required>',
                    title: 'Location Tracking',
                    subTitle: 'Please enter a name for this track to stop recording:',
                    scope: $scope,
                    buttons: [
                        { text: 'Cancel'},
                        {
                            text: '<b>Save</b>',
                            type: 'button-bright',
                            onTap: function(e){
                                if(!$scope.data.name){
                                    alert('You have to name your route before you can save it.');
                                    e.preventDefault();
                                } else {
                                    var json_entry = { "name" : $scope.data.name, "filename" : $scope.fileDir + routeHolder.routeName, "file" : routeHolder.routeName };
                                    //Check route database exists
                                    $cordovaFile.checkFile($scope.fileDir, "userRoutes.json").then(function(success){
                                        //Read it in it's current state
                                        $cordovaFile.readAsText($scope.fileDir, "userRoutes.json").then(function(success){
                                            //Add new string to file
                                            var updated_text = success + ',' + JSON.stringify(json_entry);
                                            //Write updated string to file
                                            $cordovaFile.writeFile($scope.fileDir, "userRoutes.json", updated_text, true).then(function(){
                                                //Re-read file and parse to a json object for list
                                                $cordovaFile.readAsText($scope.fileDir, "userRoutes.json").then(function(success){
                                                    console.log("User routes read.");
                                                    var user_route_json = '[' + success + ']';
                                                    $scope.userRoutes = JSON.parse(user_route_json);
                                                }, function(error){
                                                    console.log("Error reading userRoutes.json as text: " + error);
                                                });
                                            });
                                        });
                                    }, function(error){
                                        //userRoute.json does not exist
                                        var initial_entry = JSON.stringify(json_entry)
                                        $cordovaFile.writeFile($scope.fileDir, "userRoutes.json", initial_entry, true).then(function(){
                                            $cordovaFile.readAsText($scope.fileDir, "userRoutes.json").then(function(success){
                                                console.log("User routes read.");
                                                var user_route_json = '[' + success + ']';
                                                $scope.userRoutes = JSON.parse(user_route_json);
                                            }, function(error){
                                                console.log("Error reading userRoutes.json as text.", error);
                                            });
                                        });
                                    });

                                    return $scope.data.name;
                                };
                            }
                        }
                    ]
                });
                confirmPopup.then(function(res){
                    if(res){
                        try {
                            var route_json = locationUpdateService.tempJson,
                                route_str = JSON.stringify(route_json);
                                route_json_str = '[' + route_str.slice(1,-1) + ']';
                            $cordovaFile.checkFile($scope.fileDir, routeHolder.routeName).then(function(success){
                                $cordovaFile.writeExistingFile($scope.fileDir, routeHolder.routeName, route_json_str, true).then(function(success){
                                    console.log('[bgGeo] Route written to file.');
                                    console.log('[bgGeo] Route coords: ' + JSON.stringify(route_json));
                                    locationUpdateService.clearTemp();
                                }, function(error){
                                    console.log('[bgGeo] Route could not be written to file.', JSON.stringify(error));
                                });
                            }, function(error){
                                console.log('[bgGeo] Route file does not exist.');
                                alert("[bgGeo] Could not find route file.");
                            });
                        } catch(error) {
                            console.log("[bgGeo] Could not find routeJson in window.localStorage.", error);
                            alert("[bgGeo] Could not find route file.");
                        };
                        bgGeo.stop();
                        $scope.isRecording = false;
                        console.log('[bgGeo] Tracking stopped.');
                    } else {
                        console.log('[bgGeo] End tracking cancelled by user.');
                    }
                });
            };


        } else {
            console.log("Error: Platform is not iOS");
            alert("There has been a fatal error. Platform not recognised as iOS. Please contact the developer.");
        };

});
})

.controller('aboutCtrl', function($scope, $ionicPlatform, $cordovaFile, $ionicPopup){
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

    //Email providers
    $ionicPlatform.ready(function(){
        cordova.plugins.email.isAvailable(function(isAvailable){
            if(isAvailable){
                var bodyText = "<h1 style='text-align:center; color:lightgrey; font-family:sans-serif'>Feedback about CPOM App</h1>"
                console.log('[SendMail] Email plugin is available');
                $scope.feedbackMail = function(){
                    cordova.plugins.email.open({
                        to: ["py14sts@leeds.ac.uk"],
                        cc: null,
                        bcc: null,
                        attachments: null,
                        subject: "Feedback about CPOM App",
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
                        subject: "Email from user of CPOM App",
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

        $scope.fileDir = cordova.file.dataDirectory; 

        $scope.resetFlags = function(){
            $cordovaFile.checkFile($scope.fileDir, '.flags').then(function(success){
                $cordovaFile.removeFile($scope.fileDir, '.flags');
                var successPopup = $ionicPopup.alert({
                    title: "Done",
                    template: "<p style='text-align: center'>Tutorials will now be shown when viewing Sea Ice data and Routes</p>"
                });
                successPopup.then(function(res){
                    console.log('successPopup closed.');
                });
            }, function(error){
                var failPopup = $ionicPopup.alert({
                    title: "Done",
                    template: "<p style='text-align: center'>Tutorials already show when viewingg Sea Ice data and Routes</p>"
                });
                failPopup.then(function(res){
                    console.log('failPopup closed.');
                });
            });
        };

    });

})
