/*
 * Copyright 2018 Tridium, Inc. All Rights Reserved.
 */
package com.tridiumx.gmaps.ux;

import javax.baja.naming.BOrd;
import javax.baja.sys.BSingleton;
import javax.baja.sys.Context;
import javax.baja.sys.Sys;
import javax.baja.sys.Type;
import javax.baja.web.BIFormFactorMax;
import javax.baja.web.js.BIJavaScript;
import javax.baja.web.js.JsInfo;

/**
 * Displays a map in a Widget. The associated binding will make a NEQL query to the
 * Station for Components that have the 'geoCoord' tag from the Niagara dictionary.
 * <p>
 * This widget is intended to be used on a Px page.
 * </p>
 * <ul>
 *   <li>Each Component found will render a point on the Map.</li>
 *   <li>If the Component implements 'BIStatus' and it's in alarm, the point will flash red and yellow.</li>
 *   <li>Clicking a point will pop up an info window. The window contains a link to the Component as well
 *   as a table of live data. The table renders property values from the Component that have the
 *   {@link javax.baja.sys.Flags#SUMMARY} slot flag.</li>
 * </ul>
 *
 * @author Gareth Johnson
 */
@SuppressWarnings("unused")
public final class BGMapsWidget
    extends BSingleton
    implements BIJavaScript, BIFormFactorMax
{
  private BGMapsWidget() {}
  public static final BGMapsWidget INSTANCE = new BGMapsWidget();

  @Override
  public Type getType() { return TYPE; }
  public static final Type TYPE = Sys.loadType(BGMapsWidget.class);

  public JsInfo getJsInfo(Context cx) { return jsInfo; }

  private static final JsInfo jsInfo =
    JsInfo.make(BOrd.make("module://gmaps/rc/GMapsWidget.js"), BGMapsWidgetBuild.TYPE);
}