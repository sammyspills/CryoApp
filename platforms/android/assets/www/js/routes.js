angular.module('app.routes', [])

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider
    
  

      .state('menu.home', {
    url: '/homeScreen',
    views: {
      'side-menu21': {
        templateUrl: 'templates/home.html',
        controller: 'homeCtrl'
      }
    }
  })

  .state('menu.maps', {
    url: '/mapScreen',
    views: {
      'side-menu21': {
        templateUrl: 'templates/maps.html',
        controller: 'mapsCtrl'
      }
    }
  })

  .state('menu', {
    url: '/side-menu21',
    templateUrl: 'templates/menu.html',
    abstract:true
  })

  .state('menu.seaIce', {
    url: '/iceScreen',
    views: {
      'side-menu21': {
        templateUrl: 'templates/seaIce.html',
        controller: 'seaIceCtrl'
      }
    }
  })

  .state('menu.routeTrack', {
    url: '/trackScreen',
    views: {
      'side-menu21': {
        templateUrl: 'templates/routeTrack.html',
        controller: 'routeTrackCtrl'
      }
    }
  })

  .state('menu.about', {
    url: '/aboutScreen',
    views: {
      'side-menu21': {
        templateUrl: 'templates/about.html',
        controller: 'aboutCtrl'
      }
    }
  })

$urlRouterProvider.otherwise('/side-menu21/homeScreen')

  

});