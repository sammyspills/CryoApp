angular.module('app.controllers', [])

// .config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider){
//     cfpLoadingBarProvider.includeSpinner = false;
//     cfpLoadingBarProvider.parentSelector = '#bar-cont';
// }])

.controller('homeCtrl', function($scope, $state, $ionicHistory, $ionicSideMenuDelegate) {
    //NOTE: Controllers are not in order of home screen buttons. Check routes.js to see states.
    $ionicSideMenuDelegate.canDragContent(false);

    if(ionic.Platform.IOS){
        console.log("Platform is iOS");
    } else {
        console.log("Platform is not iOS");
    };

    $scope.trackScreen = function(){
        // $ionicHistory.nextViewOptions({
        //   disableBack: true
        // });
        $state.go('menu.routeTrack');
    };
    $scope.antarcticScreen = function(){
        $state.go('menu.iceAntarctic');
    };
    $scope.iceScreen = function(){
        // $ionicHistory.nextViewOptions({
        //   disableBack: true
        // });
        $state.go('menu.seaIce');
    };
    $scope.aboutScreen = function(){
        // $ionicHistory.nextViewOptions({
        //     disableBack: true
        // });
        $state.go('menu.about');
    };
    $scope.downloadScreen = function(){
        // $ionicHistory.nextViewOptions({
        //     disableBack: true
        // });
        $state.go('menu.download');
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

        //D3 Graticule Generator
        // var graticule = d3.geoGraticule();

        // vis.append("path")
        //     .datum(graticule)
        //     .attr("class", "graticule")
        //     .attr("d", path);

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
                    var route_json_str = '[' + success.slice(0,-1) + ']';
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
                    var data_json_str = '[' + success.slice(0,-1) + ']';
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
                bottom: 75,
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

.controller('antarcticCtrl', function($scope, $state, $ionicLoading, routeService, $cordovaFile, $ionicActionSheet, $ionicPopup, $ionicPlatform, $ionicModal, $ionicListDelegate){

    //Get dimens of map div
    var mapDiv = document.getElementById("antarctic-ice-div");
    var mapHeight = mapDiv.offsetHeight;
    var mapWidth = mapDiv.offsetWidth;

    //Function to show Arctic map
    var mapFunc = function(){

        //Init SVG container
        var vis = d3.select("#antarctic-ice-vis"),
            WIDTH = mapWidth,
            HEIGHT = mapHeight,
            PADDING = 0;

        //Clear SVG elements. Ensures land image shown on new ice data selected.
        vis.selectAll("svg > *").remove();

        var minDim = Math.min(WIDTH, HEIGHT);
        var maxDim = Math.max(WIDTH, HEIGHT);

        //Object to hold coords of Arctic area. Used for fitSize.
        var Antarctica = {
                          "type": "Feature",
                          "geometry": {
                            "type": "MultiPoint",
                            "coordinates": [[0,-50],[180,-50]]
                          },
                          "properties": {
                            "name": "Antarctica"
                          }
                    };

        //Init projection
        var projection = d3.geoStereographic()
            .rotate([0, 90])
            .center([0, -90])
            .fitSize([WIDTH,HEIGHT],Antarctica)
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
            .attr("xlink:href","img/ice_thickness_ant/" + routeService.selectedIceAnt);

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
                    [[-90,-90]]
                        .concat(parallel(-80, -90, 0))
                        .concat(parallel(-90, -90, 0).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[0,-90]]
                        .concat(parallel(-80, 0, 90))
                        .concat(parallel(-90, 0, 90).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[90,-90]]
                        .concat(parallel(-80, 90, 180))
                        .concat(parallel(-90, 90, 180).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[180,-80]]
                        .concat(parallel(-80, 180, -90))
                        .concat(parallel(-90, 180, -90).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-90,-70]]
                        .concat(parallel(-70, -90, -60))
                        .concat(parallel(-80, -90, -60).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-60,-70]]
                        .concat(parallel(-70, -60, -30))
                        .concat(parallel(-80, -60, -30).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-30,-70]]
                        .concat(parallel(-70, -30, 0))
                        .concat(parallel(-80, -30, 0).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[0,-70]]
                        .concat(parallel(-70, 0, 30))
                        .concat(parallel(-80, 0, 30).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[30,-70]]
                        .concat(parallel(-70, 30, 60))
                        .concat(parallel(-80, 30, 60).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[60,-70]]
                        .concat(parallel(-70, 60, 90))
                        .concat(parallel(-80, 60, 90).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[90,-70]]
                        .concat(parallel(-70, 90, 120))
                        .concat(parallel(-80, 90, 120).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[120,-70]]
                        .concat(parallel(-70, 120, 150))
                        .concat(parallel(-80, 120, 150).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[150,-70]]
                        .concat(parallel(-70, 150, 180))
                        .concat(parallel(-80, 150, 180).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-180,-70]]
                        .concat(parallel(-70, -180, -150))
                        .concat(parallel(-80, -180, -150).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-150,-70]]
                        .concat(parallel(-70, -150, -120))
                        .concat(parallel(-80, -150, -120).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-120,-70]]
                        .concat(parallel(-70, -120, -90))
                        .concat(parallel(-80, -120, -90).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-90,-60]]
                        .concat(parallel(-60, -90, -60))
                        .concat(parallel(-70, -90, -60).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-60,-60]]
                        .concat(parallel(-60, -60, -30))
                        .concat(parallel(-70, -60, -30).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-30,-60]]
                        .concat(parallel(-60, -30, 0))
                        .concat(parallel(-70, -30, 0).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[0,-60]]
                        .concat(parallel(-60, 0, 30))
                        .concat(parallel(-70, 0, 30).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[30,-60]]
                        .concat(parallel(-60, 30, 60))
                        .concat(parallel(-70, 30, 60).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[60,-60]]
                        .concat(parallel(-60, 60, 90))
                        .concat(parallel(-70, 60, 90).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[90,-60]]
                        .concat(parallel(-60, 90, 120))
                        .concat(parallel(-70, 90, 120).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[120,-60]]
                        .concat(parallel(-60, 120, 150))
                        .concat(parallel(-70, 120, 150).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[150,-60]]
                        .concat(parallel(-60, 150, 180))
                        .concat(parallel(-70, 150, 180).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[180,-60]]
                        .concat(parallel(-60, 180, -150))
                        .concat(parallel(-70, 180, -150).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-150,-60]]
                        .concat(parallel(-60, -150, -120))
                        .concat(parallel(-70, -150, -120).reverse())
                ]
            },
            {
                type: "Polygon",
                coordinates: [
                    [[-120,-60]]
                        .concat(parallel(-60, -120, -90))
                        .concat(parallel(-70, -120, -90).reverse())
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
            routeService.selectedQuadAnt = "#" + this.id;
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
        return vis;
    };

    var chartDiv = document.getElementById("antarctic-historic-chart");
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
                bottom: 75,
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
                    $scope.selectedIceAnt(j);
                };
            };
        });

        vis.select(routeService.iceSeasonAnt)
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

        routeService.selectedIceAnt = $scope.iceOptions[50].file;
        routeService.iceSeasonAnt = "#" + $scope.iceOptions[50].season;
        routeService.selectedQuadAnt = "#quad0";

        //Handle reload on new ice data selected
        $scope.selectedSeaIce = function(mySelect){
            //Set ice data label to selected date
            $scope.value = $scope.iceOptions[mySelect].name;
            routeService.iceSeasonAnt = "#" + $scope.iceOptions[mySelect].season;

            //Set selected ice image from slider
            routeService.selectedIceAnt = $scope.iceOptions[mySelect].file;
            //Call mapFunction with new selected ice image
            var vis = mapFunc();

            //Select reference point and highlight
            try {

                d3.selectAll(".dot-touch")
                    .style("fill", "rgba(0, 55, 109, 0)")
                    .style('stroke', 'rgba(0, 55, 109, 0)')
                    .attr('r', 3);

                d3.select(routeService.iceSeasonAnt)
                    .style('fill', 'rgba(0, 55, 109, 0)')
                    .style('stroke', 'red')
                    .attr('r', 6);

                
            } catch(error) {
                console.log(error);
            }

            //If quad was selected before, reselect and fill.
            try {
                selectedQuad = routeService.selectedQuadAnt;

                d3.select(selectedQuad)
                    .attr('fill', 'rgba(0, 55, 109, 0.3)');

            } catch(error) {
                console.log(error);
            };

        };

        $scope.closeModal = function(){
            if(window.Statusbar){
                StatusBar.backgroundColorByHexString("#00338d");
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
        
        d3.csv("res/means_ice_ant.csv", function(data){
            scatterFunc(data, 0);
        });
    });
})

.controller('routeTrackCtrl', function($scope, $state, $ionicPlatform, $cordovaToast, $ionicPopup, $cordovaBackgroundGeolocation, $cordovaGeolocation, $interval, $ionicLoading, routeService, $ionicActionSheet, $cordovaFile, $ionicListDelegate, $http){

    $scope.fileDir = null;

    $scope.intervalOptions = [
        {
            "value":"5 seconds",
            "ms":5000
        },
        {
            "value":"5 minutes",
            "ms":300000
        },
        {
            "value":"15 minutes",
            "ms":900000
        },
        {
            "value":"30 minutes",
            "ms":1800000
        },
        {
            "value":"1 hour",
            "ms":3600000
        },
        {
            "value":"2 hours",
            "ms":7200000
        }
    ];

    $scope.defaultInterval = $scope.intervalOptions[3].value;
    routeService.intervalTime = $scope.intervalOptions[3].ms;

    $scope.selectedInterval = function(select){
        var obj = JSON.parse(select);
        routeService.intervalTime = obj.ms;
        console.log("Selected time: " + routeService.intervalTime);
    };

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
        var url = "http://cryoapp-dev.leeds.ac.uk/getData";
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
        var shareUrl = "http://cryoapp-dev.leeds.ac.uk/post2";
        $ionicLoading.show({
            template: shareTemplate
        });
        $cordovaFile.readAsText($scope.fileDir, file).then(function(success){
            var shareBody = '[' + success.slice(0,-1) + ']';
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
        var url = "http://cryoapp-dev.leeds.ac.uk/post1";
        $ionicLoading.show({
            template: processTemplate
        });
        $cordovaFile.readAsText($scope.fileDir, file).then(function(success){
            var postBody = '[' + success.slice(0,-1) + ']';
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
                    var responseData = JSON.stringify(success.data).slice(1,-1) + ',';
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

        //TODO: Configure Christocracy plugin here to be used if iOS
        //If platform is iOS, use Christocracy plugin
        if(ionic.Platform.IOS){
            console.log("Platform is iOS");
            // Get a reference to the plugin.
            var bgGeo = window.BackgroundGeolocation;

            $scope.isRecording = false;

            //This callback will be executed every time a geolocation is recorded in the background.
            var callbackFn = function(location, taskId) {
                var coords = location.coords;
                var lat    = coords.latitude;
                var lng    = coords.longitude;
                console.log('- Location: ', JSON.stringify(location));

                // Must signal completion of your callbackFn.
                bgGeo.finish(taskId);
            };

            // This callback will be executed if a location-error occurs.  Eg: this will be called if user disables location-services.
            var failureFn = function(errorCode) {
                console.warn('- BackgroundGeoLocation error: ', errorCode);
            }

            // Listen to location events & errors.
            bgGeo.on('location', callbackFn, failureFn);

            // Fired whenever state changes from moving->stationary or vice-versa.
            bgGeo.on('motionchange', function(isMoving) {
            console.log('- onMotionChange: ', isMoving);
            });

            // BackgroundGeoLocation is highly configurable.
            bgGeo.configure({
                // Geolocation config
                desiredAccuracy: 10,
                distanceFilter: 10,
                stationaryRadius: 25,
                locationUpdateInterval: routeService.intervalTime,
                fastestLocationUpdateInterval: routeService.intervalTime,

                // Activity Recognition config
                activityType: 'AutomotiveNavigation',
                activityRecognitionInterval: 5000,
                stopTimeout: 5,

                // Application config
                debug: true,
                stopOnTerminate: false,
                startOnBoot: true,

            }, function(state) {
                // This callback is executed when the plugin is ready to use.
                console.log('BackgroundGeolocation ready: ', state);
                if (!state.enabled) {
                    //bgGeo.start();
                }
            });

            // The plugin is typically toggled with some button on your UI.
            function onToggleEnabled(value) {
                if (value) {
                    bgGeo.start();
                } else {
                    bgGeo.stop();
                }
            }


        } else {
        console.log("Platform is not iOS");
        //Init backgroundGeolocation
  		var bgLocationServices = window.plugins.backgroundLocationServices;

  		var optionsGeo = {
	  		enableHighAccuracy: true,
	  		timeout: 20000
	  	};

        //Get location from foreground geolocation. Prevents errors when initialising bgLocationServices.
  		$cordovaGeolocation.getCurrentPosition(optionsGeo).then(function(position){
	  		console.log('[ForegroundGeo] Location from Geolocation.');
	  	});

	  	$scope.isRecording = false;

        //Background Interval
	  	bgLocationServices.configure({
	     	//Both
	     	desiredAccuracy: 60, // Desired Accuracy of the location updates (lower means more accurate but more battery consumption)
	     	distanceFilter: 0, // (Meters) How far you must move from the last point to trigger a location update
	     	debug: false, // <-- Enable to show visual indications when you receive a background location update
	     	interval: routeService.intervalTime, // (Milliseconds) Requested Interval in between location updates.
	     	useActivityDetection: false, // Uses Activitiy detection to shut off gps when you are still (Greatly enhances Battery Life)

	     	//Android Only
	     	notificationTitle: 'CryoSat Application', // customize the title of the notification
	     	notificationText: 'Location tracking enabled.', //customize the text of the notification
	     	fastestInterval: 1000 // <-- (Milliseconds) Fastest interval your app / server can handle updates

		});

		bgLocationServices.registerForLocationUpdates(function(location) {
	     	console.log("[BackgroundGeo] Location updated - Position:  " + JSON.stringify(location));
            var coordEntry = '{"lat":' + parseFloat(location.latitude) + ',"lon":' + parseFloat(location.longitude) + '},';
            $cordovaFile.writeExistingFile($scope.fileDir, $scope.fileName, coordEntry, true);
            bgLocationServices.finish();
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
        }, function(error){
            console.log("iceFile.json does not exist.");
            var json_data = '[]'
        });

		var onResume = function(){

	  		var getLocation = function(){
	  			if($scope.isRecording){

	  				$cordovaGeolocation.getCurrentPosition(optionsGeo).then(function(position){
	  					console.log('[ForegroundGeo] Location updated - Position: latitude - ' + position.coords.latitude + ', longitude - ' + position.coords.longitude);
                        var coordEntry = '{"lat":' + parseFloat(position.coords.latitude) + ',"lon":' + parseFloat(position.coords.longitude) + '}'
                        var jsonCoord = JSON.parse('[' + coordEntry + ']');
                        coordEntry = JSON.stringify(jsonCoord).slice(1,-1) + ',';
                        $cordovaFile.writeExistingFile($scope.fileDir, $scope.fileName, coordEntry, true);
	  				});
	  			}
	  		};

	  		console.log('[ForegroundGeo] onResume success.');
            //Foreground Interval
	  		foregroundGeo = $interval(getLocation, routeService.intervalTime);

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
                        bgLocationServices.configure({
                            //Both
                            desiredAccuracy: 60, // Desired Accuracy of the location updates (lower means more accurate but more battery consumption)
                            distanceFilter: 0, // (Meters) How far you must move from the last point to trigger a location update
                            debug: false, // <-- Enable to show visual indications when you receive a background location update
                            interval: routeService.intervalTime, // (Milliseconds) Requested Interval in between location updates.
                            useActivityDetection: false, // Uses Activitiy detection to shut off gps when you are still (Greatly enhances Battery Life)

                            //Android Only
                            notificationTitle: 'CryoSat Application', // customize the title of the notification
                            notificationText: 'Location tracking enabled.', //customize the text of the notification
                            fastestInterval: 1000 // <-- (Milliseconds) Fastest interval your app / server can handle updates

                        });

                        bgLocationServices.registerForLocationUpdates(function(location) {
                            console.log("[BackgroundGeo] Location updated - Position:  " + JSON.stringify(location));
                            var coordEntry = '{"lat":' + parseFloat(location.latitude) + ',"lon":' + parseFloat(location.longitude) + '},';
                            $cordovaFile.writeExistingFile($scope.fileDir, $scope.fileName, coordEntry, true);
                        }, function(err) {
                            console.log("[BackgroundGeo] Error: Didnt get an update: " + err);
                        });
                        bgLocationServices.start();
                        $scope.isRecording = true;
                        console.log('[BackgroundGeo] Tracking started.');
                        console.log('Route file created.')
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
                                alert('You have to name your route before you can save it.')
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
                    bgLocationServices.stop();
                    $scope.isRecording = false;
                    $interval.cancel(foregroundGeo);
		            console.log('[BackgroundGeo] Tracking stopped.');

		        } else {
		        	//return
		        	console.log('[BackgroundGeo] End tracking cancelled by user.');
		        }
		    });

		};

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
                    template: "<p style='text-align: center'>Tutorials will now show when viewing Sea Ice data and Routes</p>"
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

.controller('dlCtrl', function($scope, $http, $ionicLoading, $ionicPlatform, $ionicPopup){

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

    var popUpTemplate = '<p style="text-align: center">The remote server could not be accessed. Please try again later.</p>';

    var downloadImage = function(file){
        //TODO: Download image function here
    };

    var loadingTemplate = "<div style='margin:-20px;padding:15px;border-radius:7px;background-color:#00338d'; text-align:center>Processing.</br>This can take a few minutes.</br><ion-spinner class='spinner-light' icon='ripple'></ion-spinner></div>";

    $scope.postReq2 = function(){
        var url = "http://cryoapp-dev.leeds.ac.uk/post2"
        $http({
            method: 'POST',
            url: url,
            headers: 'application/json',
            data: dataObj
        }).then(function(success){
            console.log(success.data);
        }, function(error){
            console.log("error: " + error);
        });
    };

    $scope.getRequest = function(){
        $scope.$broadcast('scroll.refreshComplete');
        var url = "http://cryoapp-dev.leeds.ac.uk/getData";
        $http({
            method: 'GET',
            url: url,
        }).then(function(success){
            $scope.data = success.data;
            console.log(JSON.stringify(success));
        }, function(error){
            console.log("error: " + JSON.stringify(error));
            var alertPopup = $ionicPopup.show({
                title: 'Remote Server',
                template: popUpTemplate,
                buttons: [
                    { text: 'OK'}
                ]
            });
            alertPopup.then(function(res){
                console.log("Alert tapped!");
            });
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
