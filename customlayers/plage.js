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
    this.cluster();
    this.addFeatures(this.features);
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
 * Définition du style pour les plages ouvertes
 */
let stylePlageOuverte = [new ol.style.Style({
  image: new ol.style.Circle({
    fill: new ol.style.Fill({
      color: '#2D87F4'
    }),
    stroke: new ol.style.Stroke({
      color: "#ffffff",
      width: 2
    }),
    radius: 7
  })
})];

/**
* Définition du style pour les plages fermées
*/
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

/**
* Définition du style des clusters
*
* @param {Integer} radiusCircle1
* @param {Integer} radiusCircle2
* @param {String} fontSize
*/
var styleCluster = function(radiusCircle1, radiusCircle2, fontSize) {
  return [
    new ol.style.Style({
      image: new ol.style.Circle({
        radius: radiusCircle1,
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
        radius: radiusCircle2,
        fill: new ol.style.Fill({
          color: '#44BBB6'
        })
      }),
      text: new ol.style.Text({
        font: '12px roboto_regular, Arial, Sans-serif',
        text: fontSize,
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
  label: "Plage surveillée",
  geometry: "Point"
});
legend.items.push({
  styles: stylePlageFermee,
  label: "Plage non surveillée",
  geometry: "Point"
});
legend.items.push({
  styles: styleCluster(10, 10, "7"),
  label: "Ensemble de plages",
  geometry: "Point"
});

// See to use moment js
var today = new Date();
var dd = String(today.getDate()).padStart(2, '0');
var mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
var yyyy = today.getFullYear();

today = yyyy + '-' + mm + '-' + dd +'Z';

/**
* Choix du style en fonction de la feature
* @param {ol.Feature} feature
*/
var layerStyle = function(feature) {
  // if cluster
  const hiddenFeature = feature.get('features').filter(f => !f.hidden).length;
  if (feature.get('features').length>1) {
    var size = feature.get('features').length;
    var max_radius = 40;
    var max_value = 500;
    var radius = 10 + Math.sqrt(size) * (max_radius / Math.sqrt(max_value));
    var radius2 = radius * 80 / 100;
    return styleCluster(radius, radius2, size.toString());
  }
  // else not cluster but open (beetween two date)
  
  else if (feature.get('features')[0].get('date_ouverture') <= today && feature.get('features')[0].get('date_fermeture') >= today) {
    return hiddenFeature ? stylePlageOuverte : null;
  } else {    
    return hiddenFeature ? stylePlageFermee : null;
  }
};

/**
 * Définition du layer
 */
let layer = new ol.layer.Vector({
  source: new ClusterByAttribut({
    attribut: "grand_territoire",
    geometryFunction: function(feature) {
      var geom = feature.getGeometry();
      if (geom.getType() == 'MultiPoint') {
        geom = geom.getPoint(0);
      } else if (geom.getType() == 'Polygon') {
        geom = geom.getInteriorPoint();
      }
      return geom;
    },
    source: new ol.source.Vector({
      url: "https://www.pigma.org/geoserver/giplit/ows?SERVICE=WFS&VERSION=1.0.0&REQUEST=GETFEATURE&TYPENAME=giplit:plages_na-4&cql_filter=plage_surveillee=%27Oui%27&outputFormat=application/json&srsName=EPSG:4326",
      format: new ol.format.GeoJSON()
    })
  }),
  style: layerStyle
});

/**
 * Specific handle
 * If several features in cluster zoom on it
 * else open info panel
 * @param {ol.feature[]} clusters
 * @param {ol.view} views
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

var nonClusterTooltipContent = "{{nom_plage}} - {{commune}}";
var clusterTootipContent = "{{grand_territoire}}";

// Change for cluster to non-cluster when zoomed
mviewer.getMap().getView().on('change:resolution', function(evt) {
  var view = evt.target;

  // switch to cluster or no cluster mode depending on zoom level
  if (view.getZoom() >= 9) {
    layer.getSource().setIsCluster(false);
    clPlage.config.tooltipcontent = nonClusterTooltipContent;
  } else {
    layer.getSource().setIsCluster(true);
    clPlage.config.tooltipcontent = clusterTootipContent;
  }
});
