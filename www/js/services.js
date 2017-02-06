angular.module('app.services', [])

.service('routeService', [function(){
    this.selectedRoute;
    this.selectedIce;
    this.selectedIceAnt;
    this.routeType;
    this.iceData;
    this.selectedQuad;
    this.selectedQuadAnt;
    this.iceSeason;
    this.iceSeasonAnt;
    this.intervalTime;
}])

.service('locationUpdateService', [function(location){

    this.updateLoc = function(location){
        var lat = location.latitude,
            lon = location.longitude;

        if(typeof this.tempJson !== 'undefined'){
            //if this.tempJson exists, push new entry
            var newEntry = { 'lat' : parseFloat(lat) , 'lon' : parseFloat(lon) };
            this.tempJson.push(newEntry);
            console.log("[locationUpdateService] tempJson updated.");

        } else {
            //if this.tempJson doesn't exist, make it
            this.tempJson = [
                { 'lat' : parseFloat(lat) , 'lon' : parseFloat(lon) }
            ];
            console.log("[locationUpdateService] tempJson created.");
        }
    };

    this.clearTemp = function(){
        this.tempJson = [];
        console.log("[locationUpdateService] tempJson reset.");
    };
}])

.service('routeHolder', [function(){

    this.routeName;

}])
