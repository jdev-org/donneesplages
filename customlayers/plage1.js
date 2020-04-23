{
mviewer.customLayers.plage = {};
mviewer.customLayers.plage.layer = new ol.layer.Vector({
        source: new ol.source.Vector({
            url: "apps/donneesplages/data/sample2.json",
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
