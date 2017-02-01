
# TODO:

|================================================================================|
### Application code:
  
- [ ] ~~Set GPS timeout to 1 hour~~, set debug=false
- [x] Populate "Download" screen with list from $http request, once server is set up

|================================================================================|
### Outside Application:
  
- Backend sever setup:
  * [x] Hosting of new/additional server holding application scripts
  * [ ] ~~Have folder containing latest sea-ice data in *.csv format with one header line of column names: "lat,lon,thick"~~
  * [ ] ~~Have script/folder to automatically generate segment means for the Sea Ice visualisation in app. File should be a *.csv with one header line of column names: "season,date,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20"~~
    Each number corresponds to the mean of the respective segment (detailed below). Season corresponds to the name of the data (e.g "Spring 2012"). Date corresponds to a date-object string (%Y-%d-%m) of the date of the data (e.g "2012-01-04").
  - [x] Have script to process incoming user routes. Possibly a SQL Database (Research for this hasn't been done yet). Hold a user route, process the route against the sea ice data when a new user route is received, push the processed result to the user.
  
- Application Publishing:
  * [x] Create CPOM Developer accounts for Apple and Google stores.
  * [x] Test on iOS device.
  * [ ] Create signed build for both platforms and submit for review (Creating builds: 1wk, Review: up to 2months).
  * [ ] Receive review feedback (Can't see a reason for it not being accepted. Stores will provide feedback if not accepted)
  * [ ] After acceptance, publish to both stores.

|================================================================================|
### Arctic Segments:
  
  - Segment 1: Lon bounds: -90° to 180°
               Lat bounds: 80° to 90°
               
  - Segment 2: Lon bounds: 180° to 90°
               Lat bounds: 80° to 90°
               
  - Segment 3: Lon bounds: 90° to 0°
               Lat bounds: 80° to 90°
               
  - Segment 4: Lon bounds: 0° to -90°
               Lat bounds: 80° to 90°
               
  - Segment 5: Lon bounds: -90° to -135°
               Lat bounds: 70° to 80°
               
  - Segment 6: Lon bounds: -135° to 180°
               Lat bounds: 70° to 80°
               
  - Segment 7: Lon bounds: 180° to 135°
               Lat bounds: 70° to 80°
               
  - Segment 8: Lon bounds: 135° to 90°
               Lat bounds: 70° to 80°
               
  - Segment 9: Lon bounds: 90° to 45°
               Lat bounds: 70° to 80°
               
  - Segment 10: Lon bounds: 45° to 0°
                Lat bounds: 70° to 80°
                
  - Segment 11: Lon bounds: 0° to -45°
                Lat bounds: 70° to 80°
                
  - Segment 12: Lon bounds: -45° to -90°
                Lat bounds: 70° to 80°
                
  - Segment 13: Lon bounds: -90° to -135°
                Lat bounds: 60° to 70°
               
  - Segment 14: Lon bounds: -135° to 180°
                Lat bounds: 60° to 70°
               
  - Segment 15: Lon bounds: 180° to 135°
                Lat bounds: 60° to 70°
               
  - Segment 16: Lon bounds: 135° to 90°
                Lat bounds: 60° to 70°
               
  - Segment 17: Lon bounds: 90° to 45°
                Lat bounds: 60° to 70°
               
  - Segment 18: Lon bounds: 45° to 0°
                Lat bounds: 60° to 70°
                
  - Segment 19: Lon bounds: 0° to -45°
                Lat bounds: 60° to 70°
                
  - Segment 20: Lon bounds: -45° to -90°
                Lat bounds: 60° to 70°
