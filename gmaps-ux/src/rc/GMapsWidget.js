/*jshint browser:true*/

/*
 * @copyright 2018 Tridium, Inc. All Rights Reserved.
 * @author Gareth Johnson
 */

/**
 * @private
 * @module nmodule/gmaps/rc/GMapsWidget
 */
define(['baja!',
        'baja!baja:IStatus',
        'bajaux/Widget',
        'bajaux/mixin/subscriberMixIn',
        'jquery',
        'Promise',
        'underscore',
        'hbs!nmodule/gmaps/rc/GMapsWidgetTemplate',
        'hbs!nmodule/gmaps/rc/PopupTemplate',
        'lex!gmaps',
        'css!nmodule/gmaps/rc/GMapsWidgetStyle'], function (
        baja,
        types,
        Widget,
        subscriberMixIn,
        $,
        Promise,
        _,
        gMapsTemplate,
        popupTemplate,
        lexicons) {

  "use strict";

  var GMAPS_CLASS = "gMapsWidget",
      OK_IMAGE_URI = '/module/gmaps/rc/ok.png',
      ALARM_IMAGE_URI = '/module/gmaps/rc/alarm.gif',
      LEX = lexicons[0];

  /**
   * Loads a map into a widget. Queries the station to display live data.
   *
   * @private
   * @class 
   * @alias module:nmodule/gmaps/rc/GMapsWidget
   */
  var GMapsWidget = function () {
    var that = this;
    Widget.apply(that, arguments);

    that.properties()
      .add("position", "37.644298,-77.575986")
      .add("zoom", 14)
      .add("key", "");

    subscriberMixIn(that);
  };
  
  GMapsWidget.prototype = new Widget();
  GMapsWidget.prototype.constructor = GMapsWidget;

  /**
   * Decode and return the latitude and longitude from a String in the form of
   * '123.123;456.456',
   *
   * @private
   * @inner
   * 
   * @param {String} data The data to decode.
   * @returns {Object} An object that contains a lat and lng property.
   */
  function decodeLatLong(data) {
    var position = data.split(",");
    return {
      lat: parseFloat(position.length > 1 ? position[0].trim() : 0),
      lng: parseFloat(position.length > 1 ? position[1].trim() : 0),
    };
  }

  GMapsWidget.prototype.doInitialize = function (dom) {
    var iframe,
        that = this,
        contentWindow;

    dom.addClass(GMAPS_CLASS);

    iframe = $("<iframe class='" + GMAPS_CLASS + "' src='about:blank' />");
    dom.append(iframe);

    contentWindow = iframe.get(0).contentWindow;

    return new Promise(function (resolve, reject) {
        // Write an inline iframe and dynamically load content into it.
        var doc = contentWindow.document;
        doc.open("text/html", "replace");
        doc.write(gMapsTemplate({
          key: that.properties().getValue("key")
        }));
        doc.close();

        // Wait for Google Maps to initialize inside the iframe.
        contentWindow.addEventListener("message", function (ev) {
          if (ev.data === "googleMapsLoaded") {
            resolve();
          }
        }, false);
      })
      .then(function () {
        // Wait for the window to be ready.
        return new Promise(function (resolve, reject) {
          $(contentWindow).ready(function () {
            that.$gmaps = contentWindow.google.maps;
            resolve();
          });
        });
      })
      .then(function () {
        // Load the map.
        var mapCanvas = contentWindow.document.getElementById('map-canvas'),
            latLong = decodeLatLong(that.properties().getValue("position")),
            zoom = that.properties().getValue("zoom");

        // Create the map and cache it.
        that.$map = new that.$gmaps.Map(mapCanvas, {
          zoom: zoom,
          center: { lat: latLong.lat, lng: latLong.lng }
        });     
      });
  };

  /**
   * Return the icon to use for a component. If
   * the component is deemed to be in alarm then
   * return an alarm icon.
   *
   * @private
   * @inner
   * 
   * @param  comp The target component.
   * @returns {String} The icon to use for the marker.
   */
  function getMarkerIcon(comp) {
    if (comp.getType().is("baja:IStatus")) {
      var status = baja.Status.getStatusFromIStatus(comp);

      if (status && status.isAlarm()) {
        return ALARM_IMAGE_URI;
      }
    }

    return OK_IMAGE_URI;
  }

  /**
   * Add a marker to the map.
   *
   * @private
   * @inner
   * 
   * @param widget The widget that contains the map.
   * @param comp The component that will be added to the map.
   */
  function addMarker(widget, comp) {  
    var gmaps = widget.$gmaps,
        map = widget.$map, 
        latLong = decodeLatLong(comp.get(baja.ComponentTags.idToSlotName("n:geoCoord"))),
        pnt = new gmaps.LatLng(latLong.lat, latLong.lng),
        marker = new gmaps.Marker({
          position: pnt,
          map: map,
          title: comp.getDisplayName(),
          icon: getMarkerIcon(comp),
          optimized: false // animated gifs
        }),
        infoWindow = new gmaps.InfoWindow(),
        updateInfoContents;

    widget.getSubscriber().attach("changed", function () {
      if (this === comp) {
        marker.setIcon(getMarkerIcon(comp));
      }
    });    
            
    gmaps.event.addListener(marker, 'click', function() {
      map.panTo(pnt); 

      updateInfoContents = function () {
        if (this === comp) {            
          var data = {
            ord: comp.getNavOrd().relativizeToSession().toString(),
            displayName: comp.getDisplayName(),
            name: LEX.get("name"),
            display: LEX.get("display")
          };

          comp.getSlots().flags(baja.Flags.SUMMARY).each(function (slot) {
            data.rows = data.rows || [];
            data.rows.push({
              displayName: comp.getDisplayName(slot),
              value: comp.getDisplay(slot) || comp.get(slot)
            });
          });  

          infoWindow.setContent(popupTemplate(data));
        }
      };

      updateInfoContents.call(comp);
      infoWindow.open(map, marker);

      widget.getSubscriber().attach("changed", updateInfoContents);
    });

    gmaps.event.addListener(infoWindow, 'closeclick', function() { 
      widget.getSubscriber().detach("changed", updateInfoContents);
    });
  }

  GMapsWidget.prototype.doLoad = function (table) {    
    var that = this;

    // Load the results of the query onto the Map.
    return table.cursor()
      .then(function (cursor) {
        var entities = [];
        cursor.each(function () {
          entities.push(this.get());
        });
        return entities;
      })
      .then(function (entities) {
        return Promise.all(_.map(entities, function (entity) {
          return entity.tags();
        }));
      })
      .then(function (tagSets) {
        tagSets = _.filter(tagSets, function (tags) {
          return tags.contains("n:ordInSession") && tags.contains("n:geoCoord");
        });

        var ords = _.map(tagSets, function (tags) {
          return tags.get("n:ordInSession");
        });

        return new baja.BatchResolve(ords)
          .resolve({ subscriber: that.getSubscriber() });
      })
      .then(function (batchResolve) {
        var comps = batchResolve.getTargetObjects();

        _.each(comps, function (comp) {
          addMarker(that, comp);
        });
      });
  };

  GMapsWidget.prototype.doDestroy = function () {
    this.jq().removeClass(GMAPS_CLASS);
  };

  return GMapsWidget;
});

