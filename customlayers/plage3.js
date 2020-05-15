/**
 * ClusterByAttribut extends ol ClusterByAttribut
 * This class allow to cluster data by an feature properties
 *
 */
class ClusterByAttribut extends ol.source.Cluster {

  /**
   * @param {Options} options Cluster options.
   */
  constructor(options) {
    super({
      attributions: options.attributions,
      wrapX: options.wrapX,
      source: options.source,
      distance: 0,
      geometryFunction: options.geometryFunction
    });

    this.attribut = options.attribut;
    this.isCluster = true;
    this.isFilter = false;
  }

  /**
   * Set isCluster info
   * @param {boolean} isCluster The fact that feature should be clustered or not.
   * @api
   */
  setIsCluster(isCluster) {
    this.isCluster = isCluster;
    this.cluster();
  }

  /**
   * Set isFiltered info
   * @param {boolean} isFiltered The fact that feature are filtered or not.
   * @api
   */
  setIsFilter(isFilter) {
    this.isFilter = isFilter;
  }

  /**
  * overide refresh from ol.Cluster
  */
  refresh() {
    this.clear(true);
    this.addFeatures(this.features);
    this.changed();
  }

  /**
  * overide cluster from ol.Cluster
  */
  cluster() {

    const extent = ol.extent.createEmpty();
    const features = this.source.getFeatures();

    /**
     * @type {!Object<string, boolean>}
     */
    const clustered = {};
    const attribut = this.attribut;

    for (let i = 0, ii = features.length; i < ii; i++) {
      const feature = features[i];
      const value = feature.get(attribut);

      // createOnly on cluster
      if (!this.isCluster || this.isFilter) {
        //this.features.push(feature);
          this.features.push(this.createCluster([feature]));
      }
      // if feature not already in cluster
      else if (!(ol.util.getUid(feature) in clustered)) {

        let featuresForCluster = this.source.getFeatures();

        featuresForCluster = featuresForCluster.filter(function(featureForCluster) {
          const uid = ol.util.getUid(featureForCluster);
          if (!(uid in clustered) && value == featureForCluster.get(attribut)) {
            clustered[uid] = true;
            return true;
          } else {
            return false;
          }
        });

        this.features.push(this.createCluster(featuresForCluster));

      }
    }
  }
}

/**
 * Définition des styles
 */
let stylePlageOuverte = [new ol.style.Style({
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

let stylePlageFermee = [new ol.style.Style({
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

var styleCluster = function(radius, radius2, size) {
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
  styles: stylePlageOuverte,
  label: "Surveillance ouverte",
  geometry: "Point"
});
legend.items.push({
  styles: stylePlageFermee,
  label: "Surveillance non ouverte",
  geometry: "Point"
});
legend.items.push({
  styles: styleCluster(10, 10, 7),
  label: "Ensemble de plages",
  geometry: "Point"
});

// See to use moment js
let today = new Date();
let dd = String(today.getDate()).padStart(2, '0');
let mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
let yyyy = today.getFullYear();

let todayText = mm + '/' + dd + '/' + yyyy;

var layerStyle = function(feature) {

  console.log("load Style");
  // if cluster
  if (feature.get('features').length>1) {
    var size = feature.get('features').length;
    var max_radius = 40;
    var max_value = 500;
    var radius = 10 + Math.sqrt(size) * (max_radius / Math.sqrt(max_value));
    var radius2 = radius * 80 / 100;
    return styleCluster(radius, radius2, size);
  } else if (feature.get('features')[0].get('date_ouverture') >= todayText) {
    return stylePlageOuverte;
  } else {
    return stylePlageFermee;
  }
};

/**
 * Définition du layer
 */
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
  style: layerStyle
});

/**
 * Specific handle
 * If several features in cluster zoom on it
 * else open info panel
 */
let handle = function(clusters, views) {

  let layerId = "plage";

  var l = mviewer.getLayer(layerId);
  // Zoom only if multiple feature
  if (clusters.length > 0 && clusters[0].properties.features.length > 1) {
    var extent = ol.extent.createEmpty();

    clusters[0].properties.features.forEach(function(feature, i) {
      ol.extent.extend(extent, feature.getGeometry().getExtent());
    });

    var bufferedExtent = ol.extent.buffer(extent, ol.extent.getWidth(extent) / 2);
    mviewer.getMap().getView().fit(bufferedExtent);
  } else if (clusters.length > 0 && clusters[0].properties.features) {
    var elements = [];

    clusters[0].properties.features.forEach(function(feature, i) {
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
      "manyfeatures": (clusters[0].properties.features.length > 1),
      "nbfeatures": clusters[0].properties.features.length,
      "name": l.name,
      "layerid": layerId,
      "theme_icon": l.icon,
      "html": html
    });
  }

};

var clPlage = new CustomLayer("plage", layer, legend, handle);

var initialTooltipContent = "{{nom_plage}} - {{commune}}"
var clusterTootipContent = "{{grand_territoire}}"

// start with cluster
clPlage.config.tooltipcontent = clusterTootipContent;

// Change for cluster to non-cluster when zoomed
mviewer.getMap().getView().on('change:resolution', function(evt) {
  var view = evt.target;

  // switch to cluster or no cluster mode depending on zoom level
  if (view.getZoom() >= 9) {
    layer.getSource().setIsCluster(false);
    clPlage.config.tooltipcontent = initialTooltipContent;
  } else {
    layer.getSource().setIsCluster(true);
    clPlage.config.tooltipcontent = clusterTootipContent;
  }
});
