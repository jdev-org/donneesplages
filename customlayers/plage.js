{
mviewer.customLayers.plage = {};
mviewer.customLayers.plage.layer = new ol.layer.Vector({
        source: new ol.source.Vector({
            url: "https://www.pigma.org/geoserver/giplit/ows?SERVICE=WFS&VERSION=1.0.0&REQUEST=GETFEATURE&TYPENAME=giplit:gip_littoral_plages_p&outputFormat=application/json&srsName=EPSG:4326",
            format: new ol.format.GeoJSON()
        }),
style: new ol.style.Style({
    image: new ol.style.Circle({
        fill: new ol.style.Fill({
            color: "#239BDC"
        }),
        stroke: new ol.style.Stroke({
            color: "#ffffff",
            width: 2
        }),
        radius: 6
    })
})        
  });
mviewer.customLayers.plage.handle = false;
} 