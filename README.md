# Niagara 4 Integration with Google Maps Example

An example that integrates the Google Maps API into a Niagara 4.4 bajaux Web Widget.

**This is example code and is not supported by [Tridium](https://www.tridium.com/).**

## Overview

Add the gmaps widget from the gmaps palette in Workbench...

* The NEQL statement declared in the binding is used to discover all of the points on the map. 
* If a point goes into alarm, the point's symbol will change to a flashing red/yellow icon. 
* Clicking a point on the map will pop up a bubble with live values.
  * The bubble contains a live list of data. Any slot marked with the SUMMARY flag will appear in this list.
  * The bubble has a hyperlink to the originating point.

## Properties

The Widget has the following properties that need to be configured...

* key: in order to use this Widget you will need a [key](https://developers.google.com/maps/documentation/javascript/get-api-key).
* position: the default latitude/longitude position of the map.
* zoom: the default zoom level of the map.