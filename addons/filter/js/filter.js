var filter = (function() {

  /**
   * Property: _layersParams
   *  @type {Map}
   */
  var _layersParams = new Map();

  /**
   * Property: _currentFilters
   *  @type {Map}
   */
  var _currentFilters = new Map();

  /**
   * Property: _visibleFeatures
   *  @type {Map}
   */
  var _visibleFeatures = new Map();

  /**
   * Html template for filter panel, append to a global div
   * @param {string} layerIdList if several layer create a different panel
   */
  var _filter_dialog = function(layerIdList) {
    var _dialog = [
      '<div id="advancedFilter" class="advancedFilter form-group">',
      '<div><h2>Filtres</h2></div>',
      '</div>'
    ].join("");
    $("#page-content-wrapper").append(_dialog);
  };

  /**
   * Private Method: _configFilterableLayer
   * expored as Public Methode configFilterableLayer
   *  add filter params for current layer
   *
   **/
  var _configFilterableLayer = function() {

    var layerParams = mviewer.customComponents.filter.config.options.layers;

    layerParams.forEach(layer => {
      console.log("Layer : " + layer.layerId + " is filtereable");
      // Should never happens but we could check if layer.id not already exist in _layersParams
      _layersParams.set(layer.layerId, layer.filter);
    });
  };

  /**
   *
   */
  var _createFilterPanel = function() {
    // add master div
    _filter_dialog();

    // Parse all layer to get params
    for (var [layerId, params] of _layersParams) {

      var divId = "advancedFilter-" + layerId;
      $("#advancedFilter").append('<div id="' + divId + '" "></div>');

      // update distinc values needed to create template
      _updateDistinctValues(layerId, params);

      // Parse all params to create panel
      for (var index in params) {

        // condition on type
        if (params[index].type == "checkbox") {
          _addCheckboxFilter(divId, layerId, params[index]);
        } else if (params[index].type == "combobox") {
          _addComboboxFilter(divId, layerId, params[index]);
        } else if (params[index].type == "textbox") {
          _addTextFilter(divId, layerId, params[index]);
        } else if (params[index].type == "date") {
          _addDateFilter(divId, layerId, params[index]);
        }
      }
    }

  };

  /**
   *
   **/
  var _updateDistinctValues = function(layerId, attributes) {

    // for given attributes array update values
    var layerParams = _layersParams.get(layerId);
    var features = mviewer.getLayer(layerId).layer.getSource().getFeatures();
    var initialFeatures = new Map();
    // Parse all params to create panel
    for (var index in layerParams) {

      // Removed old values or initialise array
      // Array use to build panel
      layerParams[index].values = [];

      features.forEach(feature => {

        if (feature.get(layerParams[index].attribut) != null) {
          // if needed split values with ;
          var results = (feature.get(layerParams[index].attribut)).split(';');

          results.forEach(result => {

            // if new value
            if (layerParams[index].values.indexOf(result) < 0) {
              console.log("LayerId :" + layerId + "| Attribut : " + layerParams[index].attribut + " | Value : " + result);
              layerParams[index].values.push(result);
            }
          });
        }
      });
      layerParams[index].values.sort();

      //TODO Manage date format
    }

  };

  /**
   *
   */
  var _addCheckboxFilter = function(divId, layerId, params) {
    var _checkBox = [
      '<div class="form-check mb-2 mr-sm-2">',
      '<legend> ' + params.label + ' </legend>',
      '<div class="form-check">'
    ];

    params.values.forEach(function(value, index, array) {
      console.log("Value : " + value);
      _checkBox.push('<input hidden type="checkbox" class="form-check-input" onclick="filter.onValueChange(this);" id="filterCheck-' + layerId + '-' + params.attribut + '-' + index + '">');
      _checkBox.push('<label class="form-check-label" for="filterCheck-' + layerId + '-' + params.attribut + '-' + index + '">' + value + '</label>');
    });

    _checkBox.push('</div></div>');
    $("#" + divId).append(_checkBox.join(""));
  };

  /**
   *
   */
  var _addTextFilter = function(divId, layerId, params) {
    // ID - generate to be unique
    var id = "filterText-" + layerId + "-" + params.attribut;

    // HTML
    var _text = [
      '<div class="form-check mb-2 mr-sm-2">',
      '<legend> ' + params.label + ' </legend>'
    ];
    _text.push('<input type="text" value="" data-role="tagsinput" id="' + id + '" class="form-control">');
    _text.push('</div>');
    $("#" + divId).append(_text.join(""));

    // Update tagsinput params
    $("#" + id).tagsinput({
      typeahead: {
        source: params.values
      },
      freeInput: false
    });

    //EVENT
    $("#" + id).on('itemAdded', function(event) {
      _addFilterElementToList(layerId, params.attribut, event.item);
      _filterFeatures(layerId);
      // remover entered text
      setTimeout(function() {
        $(">input[type=text]", ".bootstrap-tagsinput").val("");
      }, 1);
    });
    $("#" + id).on('itemRemoved', function(event) {
      _removeFilterElementFromList(layerId, params.attribut, event.item);
      _filterFeatures(layerId);
    });
  };

  /**
   *
   */
  var _addDateFilter = function(divId, layerId, params) {
    // for type date, two parameters are availables
    // create unique id with first parameter
    var id = "filterDate-" + layerId + "-" + params.attribut[0];
    var _datePicker = [
      '<div class="form-group form-group-timer mb-2 mr-sm-2">',
      '<legend> ' + params.label + ' </legend>'
    ];
    _datePicker.push('<input type="text" class="form-control" id="' + id + '" />');
    _datePicker.push('</div>');
    $("#" + divId).append(_datePicker.join(""));

    $("#" + id).datepicker({
      format: "yyyy-mm-dd",
      language: "fr",
      autoclose: true,
      startDate: '-3d',
      clearBtn: true,
      todayHighlight: true
    });

    $("#" + id).on('changeDate', function(e) {
      console.log(e);
      //  _addFilterElementToList(layerId, params.attribut, e.format());
    });
  };

  var _addComboboxFilter = function(divId, layerId, params) {

    var _comboBox = [
      '<div class="form-group mb-2 mr-sm-2">',
      '<legend> ' + params.label + ' </legend>',
      '<select id="filterCombo-' + layerId + '-' + params.attribut + '" class="form-control" onchange="filter.onValueChange(this)">',
      '<option selected>Choisissez...</option>'
    ];

    params.values.forEach(function(value, index, array) {
      console.log("Value : " + value);
      _comboBox.push(' <option>' + value + '</option>');
    });
    _comboBox.push('</select></div>');
    $("#" + divId).append(_comboBox.join(""));

  };

  /**
   * Private Method: _toggle
   *
   * Open filtering panel
   **/
  var _toggle = function() {

    // show or hide filter panel
    if ($("#advancedFilter").is(':visible')) {
      $('#filterbtn').removeClass('btn-default.focus');
      $("#advancedFilter").hide();
    } else {
      $("#advancedFilter").show();
    }
  };

  /**
   * Private Method: _addFilterElementToList
   * @param {string} layerId The layer id to be filter
   * @param {string} attribute The property key for filtering feature
   * @param {object} value The value to filter can be String, Number, Boolean, Date,
   * @param {String} type The value format to help filtering (text, date, boolean)
   **/
  var _addFilterElementToList = function(layerId, attribut, value, type) {

    var escapeCharPatternForFiltering = "/[-\/\\^$*+?.()|[\]{}]/g";

    // Add filter only if there something to filter
    if (layerId != null && attribut != null && value != null) {
      var filtersByLayer = (_currentFilters.get(layerId) != null ? _currentFilters.get(layerId) : []);

      // If attribut exist add new value to existing one
      var filteringOnAttributeExist = false;
      filtersByLayer.forEach(function(filter, index, array) {
        if (filter.attribut == attribut && value != null && !filter.values.includes(value)) {
          filteringOnAttributeExist = true;
          filter.values.push(value);
          filter.regexValue.push(value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
        }
      });

      // If first filtering for this attribut
      if (!filteringOnAttributeExist) {

        var filter = {
          attribut: attribut,
          values: [value],
          regexValue: [value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')],
          type: type
        };
        filtersByLayer.push(filter);
        _currentFilters.set(layerId, filtersByLayer);
      }
    }
  };

  /**
   * Private Method: _removeFilterElementFromList
   * @param {string} layerId The layer id to be filter
   * @param {string} attribute The property key for filtering feature
   * @param {object} value The value to filter can be String, Number, Boolean, Date,
   * @param {String} type The value format to help filtering (text, date, boolean)
   **/
  var _removeFilterElementFromList = function(layerId, attribut, value) {
    var indexToRemove = -1;

    var filtersByLayer = _currentFilters.get(layerId);
    //search if value exist un currentFilters
    if (filtersByLayer != undefined) {
      filtersByLayer.forEach(function(filter, index, array) {
        if (filter.attribut == attribut && (value == null || filter.values == value)) {
          indexToRemove = index;
        } else if (filter.attribut == attribut && filter.values.includes(value)) {
          var indexValue = filter.values.indexOf(value);
          filter.values.splice(indexValue, 1);
          filter.regexValue.splice(indexValue, 1);
        }
      });

      //only remove if exist
      if (indexToRemove > -1) {
        filtersByLayer.splice(indexToRemove, 1);
        _currentFilters.set(layerId, filtersByLayer);
      }
    }

  };

  /**
   * Private Method: _onValueChange
   *
   *  action when filter from filter panel change (checkbox, combobox, textarea or datapicker )
   **/
  var _onValueChange = function(element) {

    // get information for elment id ( type-layerid-attribut-index)
    var filtreInformation = element.id.split("-");
    var type = filtreInformation[0];
    var layerId = filtreInformation[1];
    var attribut = filtreInformation[2];
    var value = element.value;

    // checkbox return index of value in _layersParams
    if (type == "filterCheck") {
      var indexValue = filtreInformation[3];
      value = _getValueFromInfo(layerId, attribut, indexValue);
      // if check add filter, else remove filter
      if (element.checked == true) {
        _addFilterElementToList(layerId, attribut, value);
      } else {
        _removeFilterElementFromList(layerId, attribut, value);
      }
    }
    // combobox only one possible value so remove previous if exist
    else if (type == "filterCombo") {
      _removeFilterElementFromList(layerId, attribut, null);
      // if value not the first text here ("Choississez...")
      if (element.selectedIndex != 0) {
        _addFilterElementToList(layerId, attribut, value);
      }
    } else {
      _addFilterElementToList(layerId, attribut, value);
    }

    _filterFeatures(layerId);
  };

  /**
   * Private Method: _createIdFromInfo
   *
   *
   **/
  var _createIdFromInfo = function(layerId, attribute, indexValue, type) {

  };

  /**
   * Private Method: _getValueFromInfo
   *
   *
   **/
  var _getValueFromInfo = function(layerId, attribute, indexValue) {

    var params = _layersParams.get(layerId);

    for (var index in params) {
      if (params[index].attribut == attribute) {
        return params[index].values[indexValue];
      }
    }
  };

  /**
   * Private Method: _clearFilterTools
   *
   */
  var _clearFilterTools = function() {
    $('#filterbtn').removeClass('active');
    $("#advancedFilter").hide();
  };

  /**
   * Private Method: _filterFeature
   *
   **/
  var _filterFeatures = function(layerId) {

    var filtersByLayer = _currentFilters.get(layerId);
    var featuresToBeFiltered = mviewer.getLayer(layerId).layer.getSource().getFeatures();

    featuresToBeFiltered.forEach(feature => {

      if (filtersByLayer.length > 0) {
        hideFeature = false;

        //search if value exist un currentFilters
        filtersByLayer.forEach(function(filter, index, array) {

          // if feature map filter keep it
          if (feature.get(filter.attribut) != null && new RegExp(filter.regexValue.join("|")).test(feature.get(filter.attribut))) {
            feature.setStyle(null);
          } else {
            // hide
            // TODO save style for each feature
            hideFeature = true;
          }

        });
        if (hideFeature) {
          feature.setStyle(new ol.style.Style({}));
        }
      }
      // clear filter
      else {
        feature.setStyle(null);
      }
    });
  };

  /**
   * Private Method: _clearFilterFeatures
   *
   **/
  var _clearFilterFeatures = function(layerId) {

    var featuresToUnFiltered = mviewer.getLayer(layerId).layer.getSource().getFeatures();
    featuresToUnFiltered.forEach(feature => {
      // apply initial style
      feature.setStyle(null);
    });
  };

  /**
   * Private Method: _clearAllFilter
   *
   **/
  var _clearAllFilter = function() {

    // Parse all layer to get params
    for (var [layerId, params] of _layersParams) {
      _clearFilterFeatures(layerId);
    };
  }


  /**
   * Public Method: _initFilterTool exported as init
   *
   */
  var _initFilterTool = function() {

    _configFilterableLayer();

    if (_layersParams.size > 0) {

      //Add filter button to toolstoolbar
      var button = [
        '<button class="mv-modetools btn btn-default btn-raised" href="#"',
        ' onclick="filter.toggle();"  id="filterbtn" title="Filtrer" i18n="filter.button.main"',
        ' tabindex="115" accesskey="f">',
        '<span class="glyphicon glyphicon-filter" aria-hidden="true"></span>',
        '</button>'
      ].join("");
      $("#toolstoolbar").prepend(button);

      //TODO change init once filter are update each time
      var layerId = "";
      for (var [layer, params] of _layersParams) {
        layerId = layer;
      }
      // wait until layer is load before create filters
      mviewer.getLayer(layerId).layer.once('change', function(e) {
        _createFilterPanel();
      });

    }
  };

  var _init = function() {
    console.log("init");
  };

  return {
    init: _init,
    configFilterableLayer: _initFilterTool,
    toggle: _toggle,
    filterFeatures: _filterFeatures,
    onValueChange: _onValueChange
  };

})();

new CustomComponent("filter", filter.init);
filter.configFilterableLayer();
