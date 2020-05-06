{
  var today = new Date();
  var dd = String(today.getDate()).padStart(2, '0');
  var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
  var yyyy = today.getFullYear();

  var todayText = mm + '/' + dd + '/' + yyyy;

  mviewer.customLayers.plage1 = {};
  mviewer.customLayers.plage1.legend = { items: [] };

  var styleOuvert = [new ol.style.Style({
    image: new ol.style.Circle({
      fill: new ol.style.Fill({
        color: '#C31632'
      }),
      stroke: new ol.style.Stroke({
        color: "#ffffff",
        width: 2
      }),
      radius: 7
    })
  })];

  var styleFerme = [new ol.style.Style({
    image: new ol.style.Circle({
      fill: new ol.style.Fill({
        color: '#696969'
      }),
      stroke: new ol.style.Stroke({
        color: "#ffffff",
        width: 2
      }),
      radius: 7
    })
  })];

  mviewer.customLayers.plage1.legend.items.push({
    styles: styleOuvert,
    label: "Surveilance ouverte",
    geometry: "Point"
  });
  mviewer.customLayers.plage1.legend.items.push({
    styles: styleFerme,
    label: "Surveillance non ouverte",
    geometry: "Point"
  });

  mviewer.customLayers.plage1.layer = new ol.layer.Vector({
    source: new ol.source.Vector({
      url: "apps/donneesplages/data/sample.json",
      format: new ol.format.GeoJSON()
    }),
    style: function(feature, resolution) {
      var stl;
      if (feature.get('date_ouverture') >= todayText) {
        stl = styleOuvert;
      } else {
        stl = styleFerme;
      }
      return stl;
    }
  });
  mviewer.customLayers.plage1.handle = false;
}
