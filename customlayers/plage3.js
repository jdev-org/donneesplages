let styleOuvert = [new ol.style.Style({
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

let styleFerme = [new ol.style.Style({
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

var manyStyle = function(radius, radius2, size) {
  return [
    new ol.style.Style({
      image: new ol.style.Circle({
        radius: radius,
        fill: new ol.style.Fill({
          color: '#44A9BB'
        })
      }),
      stroke: new ol.style.Stroke({
        color: '#44BBB6',
        width: 3
      }),
      fill: new ol.style.Fill({
        color: '#44BBB6'
      })
    }),
    new ol.style.Style({
      image: new ol.style.Circle({
        radius: radius2,
        fill: new ol.style.Fill({
          color: '#44BBB6'
        })
      }),
      text: new ol.style.Text({
        font: '12px roboto_regular, Arial, Sans-serif',
        text: size.toString(),
        fill: new ol.style.Fill({
          color: '#fff'
        })
      })
    })
  ];
};

let legend = {
  items: []
};

legend.items.push({
  styles: styleOuvert,
  label: "Surveillance ouverte",
  geometry: "Point"
});
legend.items.push({
  styles: styleFerme,
  label: "Surveillance non ouverte",
  geometry: "Point"
});
legend.items.push({
  styles: manyStyle(10, 10, 7),
  label: "Ensemble de plages",
  geometry: "Point"
});

let today = new Date();
let dd = String(today.getDate()).padStart(2, '0');
let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
let yyyy = today.getFullYear();

let todayText = mm + '/' + dd + '/' + yyyy;

var clusterStyle = function(feature) {
  var size = feature.get('features').length;
  var max_radius = 40;
  var max_value = 500;
  var radius = 10 + Math.sqrt(size) * (max_radius / Math.sqrt(max_value));
  var radius2 = radius * 80 / 100;
  if (size == 1) {
    if (feature.get('date_ouverture') >= todayText) {
      return styleOuvert;
    } else {
      return styleFerme;
    }
  } else {
    return manyStyle(radius, radius2, size);
  }
};


class ClusterByAttribut extends ol.source.Cluster {

  /**
   * @param {Options} options Cluster options.
   */
  constructor(options) {
    super({
      attributions: options.attributions,
      wrapX: options.wrapX,
      source: options.source,
      distance: options.distance,
      geometryFunction: options.geometryFunction
    });

    this.attribut = options.attribut;
  }

  cluster() {

    if (this.resolution === undefined || !this.source) {
      return;
    }
    const extent = ol.extent.createEmpty();
    const mapDistance = this.distance * this.resolution;
    const features = this.source.getFeatures();

    /**
     * @type {!Object<string, boolean>}
     */
    const clustered = {};
    const attribut = this.attribut;


    for (let i = 0, ii = features.length; i < ii; i++) {
      const feature = features[i];
      const value = feature.get(attribut);
      console.log("create cluster on attribut : " + this.attribut + " for value : " + value);

      // if feature not already in cluster
      if (!(ol.util.getUid(feature) in clustered)) {
        const geometry = this.geometryFunction(feature);
        if (geometry && attribut != undefined) {
          //const coordinates = geometry.getCoordinates();
          //ol.extent.createOrUpdateFromCoordinate(coordinates, extent);
          //ol.extent.buffer(extent, mapDistance, extent);

          let neighbors = this.source.getFeatures();

          neighbors = neighbors.filter(function(neighbor) {
            const uid = ol.util.getUid(neighbor);
            if (!(uid in clustered) && value == neighbor.get(attribut)) {
              clustered[uid] = true;
              return true;
            } else {
              return false;
            }
          });

          this.features.push(this.createCluster(neighbors));
        }
      }
    }
  }
}


let layer = new ol.layer.Vector({
  source: new ClusterByAttribut({
    attribut: "grand_territoire",
    distance: 50,
    geometryFunction: function(feature) {
      var geom = feature.getGeometry();
      console.log(" Geometry type : " + geom.getType());
      if (geom.getType() == 'MultiPoint') {
        geom = geom.getPoint(0);
      } else if (geom.getType() == 'Polygon') {
        geom = geom.getInteriorPoint();
      }
      return geom;
    },
    source: new ol.source.Vector({
      url: "https://www.pigma.org/geoserver/giplit/ows?SERVICE=WFS&VERSION=1.0.0&REQUEST=GETFEATURE&TYPENAME=giplit:gip_littoral_plages_p&outputFormat=application/json&srsName=EPSG:4326",
      format: new ol.format.GeoJSON()
    })
  }),
  style: clusterStyle
});

let handle = function(clusters, views) {

    // Open panel for all feature
    if (clusters.length > 0 && clusters[0].properties.features) {
        var features = clusters[0].properties.features;
        var elements = [];
        var extent = ol.extent.createEmpty();

        var l = mviewer.getLayer("plage");
        features.forEach(function(feature, i) {
            ol.extent.extend(extent, feature.getGeometry().getExtent());
            elements.push({
                properties: feature.getProperties()
            });
        });
        var html;
        if (l.template) {
            html = info.templateHTMLContent(elements, l);
        } else {
            html = info.formatHTMLContent(elements, l);
        }
        var panel = "";
        if (configuration.getConfiguration().mobile) {
            panel = "modal-panel";
        } else {
            panel = "right-panel";
        }
        var view = views[panel];
        view.layers.push({
            "id": view.layers.length + 1,
            "firstlayer": true,
            "manyfeatures": (features.length > 1),
            "nbfeatures": features.length,
            "name": l.name,
            "layerid": "cluster",
            "theme_icon": l.icon,
            "html": html
        });
        var bufferedExtent = ol.extent.buffer(extent, ol.extent.getWidth(extent) / 2);
        mviewer.getMap().getView().fit(bufferedExtent);
    }

};

new CustomLayer("plage", layer, legend, handle);

mviewer.getMap().getView().on('change:resolution', function(evt) {
  var view = evt.target;

  if (view.getZoom() >= 9 && layer.getSource().getDistance() > 0) {
    layer.getSource().setDistance(0);
  } else {
    layer.getSource().setDistance(50);
  }
});
