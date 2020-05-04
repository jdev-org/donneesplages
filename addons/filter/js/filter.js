var filter = (function() {

  /**
   * Property: _layersParams
   *  @type {Map}
   */
  var _layersFiltersParams = new Map();

  /**
   * Property: _visibleFeatures
   *  @type {Map}
   */
  var _visibleFeatures = new Map();

  /**
   * Public Method: _initFilterTool exported as init
   *
   */
  var _initFilterTool = function() {

    var layerParams = mviewer.customComponents.filter.config.options.layers;
    var layerId = "";

    layerParams.forEach(layer => {
      layerId = layer.layerId;
      // Should never happens but we could check if layer.id not already exist in _layersParams
      _layersFiltersParams.set(layerId, layer.filter);
      _visibleFeatures.set(layerId, []);
    });

    if (_layersFiltersParams.size > 0) {

      //Add filter button to toolstoolbar
      var button = [
        '<button class="mv-modetools btn btn-default btn-raised" href="#"',
        ' onclick="filter.toggle();"  id="filterbtn" title="Filtrer" i18n="filter.button.main"',
        ' tabindex="115" accesskey="f">',
        '<span class="glyphicon glyphicon-filter" aria-hidden="true"></span>',
        '</button>'
      ].join("");
      $("#toolstoolbar").prepend(button);

      // wait until at least one layer is load before create filter panel
      mviewer.getLayer(layerId).layer.once('change', function(e) {
        _manageFilterPanel();
        if(mviewer.customComponents.filter.config.options.open){
          $("#advancedFilter").show();
        }
      });
    }
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
   * Private Method: _createFilterPanel
   *
   *
   */
  var _manageFilterPanel = function() {

    // Parse all layers to get params
    for (var [layerId, params] of _layersFiltersParams) {

      // Create div id
      var destinationDivId = "advancedFilter-" + layerId;

      // Create div only if not exist
      if (!$('#' + destinationDivId).length) {
        $("#advancedFilter").append('<div id="' + destinationDivId + '" "></div>');
      }

      // update distinct values needed to create template
      _updateFeaturesDistinctValues(layerId);

      // Parse all params to create panel
      for (var index in params) {

        // condition on type
        if (params[index].type == "checkbox") {
          _manageCheckboxFilter(destinationDivId, layerId, params[index]);
        } else if (params[index].type == "combobox") {
          _manageComboboxFilter(destinationDivId, layerId, params[index]);
        } else if (params[index].type == "button") {
          _manageButtonFilter(destinationDivId, layerId, params[index]);
        } else if (params[index].type == "textbox") {
          _manageTextFilter(destinationDivId, layerId, params[index]);
        } else if (params[index].type == "date") {
          _manageDateFilter(destinationDivId, layerId, params[index]);
        }
      }
    }
  };


  /**
   * Private Method: _updateDistinctValues for a layer
   * @param {string} layerId The layer id to be filter
   *
   **/
  var _updateFeaturesDistinctValues = function(layerId) {

    // for given attributes array update values
    var layerFiltersParams = _layersFiltersParams.get(layerId);
    var visibleFeatures = _visibleFeatures.get(layerId) == undefined ? [] : _visibleFeatures.get(layerId);

    var features = mviewer.getLayer(layerId).layer.getSource().getFeatures();

    // Parse all params to create panel
    for (var index in layerFiltersParams) {

      // init current filters values
      layerFiltersParams[index].currentValues = layerFiltersParams[index].currentValues ? layerFiltersParams[index].currentValues : [];
      layerFiltersParams[index].currentRegexValues = layerFiltersParams[index].currentRegexValues ? layerFiltersParams[index].currentRegexValues : [];


      // undefined if first loop
      if (layerFiltersParams[index].availableValues == undefined || layerFiltersParams[index].updateOnChange) {
        // Removed old values or initialise array
        // Array use to build panel
        layerFiltersParams[index].availableValues = [];

        features.forEach(feature => {

          // If feature is visible and value not null
          if ((visibleFeatures.length == 0 || visibleFeatures.includes(feature.getId())) && feature.get(layerFiltersParams[index].attribut) != null) {

            // for date type
            if (layerFiltersParams[index].type == "date") {

                if(!_isEmpty(layerFiltersParams[index].attribut[0]) && !_isEmpty(layerFiltersParams[index].attribut[0])){
                  var startDate = _stringToDate(feature.get(layerFiltersParams[index].attribut[0]));
                  var endDate = _stringToDate(feature.get(layerFiltersParams[index].attribut[1]));

                  if( layerFiltersParams[index].availableValues.length ==  0 || startDate <= layerFiltersParams[index].availableValues[O]){
                    layerFiltersParams[index].availableValues[O] = startDate;
                  }
                  if( layerFiltersParams[index].availableValues.length ==  0 || endDate <= layerFiltersParams[index].availableValues[O]){
                    layerFiltersParams[index].availableValues[1] = endDate;
                  }
                }
            } else {
              // if needed, split values with ; Feature values can be one String separate by ;
              // TODO see if separator need to be put in config
              var results = (feature.get(layerFiltersParams[index].attribut)).split(';');

              results.forEach(result => {

                // if new value
                if (layerFiltersParams[index].availableValues.indexOf(result) < 0) {
                  layerFiltersParams[index].availableValues.push(result);
                }
              });
            }
          }
        });
        layerFiltersParams[index].availableValues.sort();
      }

    }

  };

  /**
   * private _addCheckboxFilter
   *
   * @param {String} divId - div id wher the checkbox group should be added
   * @param {String} layerId - layer id needed to create includes
   * @param {Object} filterParams - list of parameters filterParams.label and filterParames.attribut
   */
  var _manageCheckboxFilter = function(divId, layerId, filterParams) {
    var id = "filterCheck-" + layerId + "-" + filterParams.attribut;
    var clearId = "filterClear-" + layerId + "-" + filterParams.attribut;

    var _checkBox = [];
    var alreadyExist = $('#' + id).length;

    // test if div alreay exist
    if (alreadyExist) {
      $('#' + id).empty();
    } else {
      _checkBox = [
        '<div class="form-check mb-2 mr-sm-2">',
        '<div class="form-check filter-legend">',
        '<legend > ' + filterParams.label + ' </legend>',
        '<span id=' + clearId + ' class="filter-clear glyphicon glyphicon-remove" onclick="filter.clearFilter(this.id);"></span>',
        '</div>',
        '<div id ="' + id + '" class="form-check">'
      ];
    }
    filterParams.availableValues.forEach(function(value, index, array) {
      var id = "filterCheck-" + layerId + "-" + filterParams.attribut + "-" + index;
      _checkBox.push('<div>');
      _checkBox.push('<input type="checkbox" class="form-check-input" id="' + id + '"');
      if (filterParams.currentValues.includes(value)) {
        _checkBox.push(' checked="checked" ');
      }
      _checkBox.push(' onclick="filter.onValueChange(this);">');
      _checkBox.push('<label class="form-check-label" for="' + id + '">' + value + '</label>');
      _checkBox.push('</div>');
    });

    if (!alreadyExist) {
      _checkBox.push('</div></div>');
      $("#" + divId).append(_checkBox.join(""));
    } else {
      $("#" + id).append(_checkBox.join(""));
    }

  };

  /**
   * private _manageButtonFilter
   *
   * @param {String} divId - div id wher the checkbox group should be added
   * @param {String} layerId - layer id needed to create includes
   * @param {Object} filterParams - list of parameters filterParams.label and filterParames.attribut
   */
  var _manageButtonFilter = function(divId, layerId, filterParams) {
    var id = "filterCheck-" + layerId + "-" + filterParams.attribut;
    var clearId = "filterClear-" + layerId + "-" + filterParams.attribut;

    var _buttonForm = [];
    var alreadyExist = $('#' + id).length;

    // test if div alreay exist
    if (alreadyExist) {
      $('#' + id).empty();
    } else {
      _buttonForm = [
        '<div class="form-check mb-2 mr-sm-2">',
        '<div class="form-check filter-legend">',
        '<legend > ' + filterParams.label + ' </legend>',
        '<span id=' + clearId + ' class="filter-clear glyphicon glyphicon-remove" onclick="filter.clearFilter(this.id);"></span>',
        '</div>',
        '<div id ="' + id + '" class="form-check">'
      ];
    }
    filterParams.availableValues.forEach(function(value, index, array) {
      var id = "filterCheck-" + layerId + "-" + filterParams.attribut + "-" + index;
      _buttonForm.push('<input hidden type="checkbox" class="form-check-input" id="' + id + '"');
      if (filterParams.currentValues.includes(value)) {
        _buttonForm.push(' checked="checked" ');
      }
      _buttonForm.push(' onclick="filter.onValueChange(this);">');

      _buttonForm.push('<label class="form-check-label label label-info ');
      if (filterParams.currentValues.includes(value)) {
        _buttonForm.push(' form-check-label-checked ');
      }
      _buttonForm.push('" for="' + id + '">' + value + '</label>');
    });

    if (!alreadyExist) {
      _buttonForm.push('</div></div>');
      $("#" + divId).append(_buttonForm.join(""));
    } else {
      $("#" + id).append(_buttonForm.join(""));
    }

  };

  /**
   * private _addTextFilter
   *
   * @param {String} divId - div id wher the checkbox group should be added
   * @param {String} layerId - layer id needed to create includes
   * @param {Object} filterParams - list of parameters filterParams.label and filterParames.attribut
   */
  var _manageTextFilter = function(divId, layerId, params) {
    // ID - generate to be unique
    var id = "filterText-" + layerId + "-" + params.attribut;
    var clearId = "filterClear-" + layerId + "-" + params.attribut;

    // If alreadyExist, juste update params values
    if ($('#' + id).length) {
      // Update tagsinput params
      $("#" + id).tagsinput({
        typeahead: {
          source: params.availableValues
        },
        freeInput: false
      });
    } else {

      // HTML
      var _text = [
        '<div class="form-check mb-2 mr-sm-2">',
        '<div class="form-check filter-legend">',
        '<legend > ' + params.label + ' </legend>',
        '<span id=' + clearId + ' class="filter-clear glyphicon glyphicon-remove"></span>',
        '</div>',
      ];
      _text.push('<input type="text" value="" data-role="tagsinput" id="' + id + '" class="form-control">');
      _text.push('</div>');
      $("#" + divId).append(_text.join(""));

      // Update tagsinput params
      $("#" + id).tagsinput({
        typeahead: {
          source: params.availableValues
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

      $("#" + clearId).on('click', function(event) {
        $("#" + id).tagsinput('removeAll');
        _removeFilterElementFromList(layerId, params.attribut, null);
        _filterFeatures(layerId);
      });

      $("#" + id).on('itemRemoved', function(event) {
        _removeFilterElementFromList(layerId, params.attribut, event.item);
        _filterFeatures(layerId);
      });
    }
  };

  /**
   * private _addDateFilter
   *
   * @param {String} divId - div id wher the checkbox group should be added
   * @param {String} layerId - layer id needed to create includes
   * @param {Object} filterParams - list of parameters filterParams.label and filterParames.attribut
   */
  var _manageDateFilter = function(divId, layerId, params) {
    // for type date, two parameters are availables
    // create unique id with first parameter
    var id = "filterDate-" + layerId + "-" + params.attribut[0];
    if (!$('#' + id).length) {
      var _datePicker = [
        '<div class="form-group form-group-timer mb-2 mr-sm-2">',
        '<legend> ' + params.label + ' </legend>'
      ];
      _datePicker.push('<input type="text" class="form-control" id="' + id + '" />');
      _datePicker.push('</div>');
      $("#" + divId).append(_datePicker.join(""));
    }

    $("#" + id).datepicker({
      format: "yyyy-mm-dd",
      language: "fr",
      autoclose: true,
      startDate: params.availableValues[0],
      endDate: params.availableValues[1],
      clearBtn: true,
      todayHighlight: true
    });

    $("#" + id).on('changeDate', function(event) {
      if(typeof(event.date) == "undefined"){
        _removeFilterElementFromList(layerId, params.attribut, null);
      }else{
        _addFilterElementToList(layerId, params.attribut, event.date, "date");
      }
      _filterFeatures(layerId);
    });
  };

  /**
   * private _addComboboxFilter
   *
   * @param {String} divId - div id wher the checkbox group should be added
   * @param {String} layerId - layer id needed to create includes
   * @param {Object} filterParams - list of parameters filterParams.label and filterParames.attribut
   */
  var _manageComboboxFilter = function(divId, layerId, params) {
    var id = "filterCombo-" + layerId + "-" + params.attribut;
    var clearId = "filterClear-" + layerId + "-" + params.attribut;
    var comboBox = [];

    // If alreadyExist, juste update params values
    if ($('#' + id).length) {
      $('#' + id).empty();
    } else {
      comboBox = [
        '<div class="form-group mb-2 mr-sm-2">',
        '<div class="form-check filter-legend">',
        '<legend > ' + params.label + ' </legend>',
        '<span id=' + clearId + ' class="filter-clear glyphicon glyphicon-remove"></span>',
        '</div>',
        '<select id="' + id + '" class="form-control" onchange="filter.onValueChange(this)">'
      ];
    }

    comboBox.push('<option>Choisissez...</option>');

    params.availableValues.forEach(function(value, index, array) {
      if (params.currentValues.includes(value)) {
        comboBox.push(' <option selected="selected">' + value + '</option>');
      } else {
        comboBox.push(' <option>' + value + '</option>');
      }

    });
    if ($('#' + id).length) {
      $("#" + id).append(comboBox.join(""));
    } else {
      comboBox.push('</select></div>');
      $("#" + divId).append(comboBox.join(""));
    }

    $("#" + clearId).on('click', function(event) {
      _removeFilterElementFromList(layerId, params.attribut, null);
      _filterFeatures(layerId);
    });
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
      var layerFiltersParams = _layersFiltersParams.get(layerId);

      // If attribut exist add new value to existing one
      layerFiltersParams.forEach(function(filter, index, array) {
        if(filter.attribut == attribut && value != null && type == "date"){
            filter.currentValues[0] = value;
        }
        else if (filter.attribut == attribut && value != null && !filter.currentValues.includes(value)) {
          filter.currentValues.push(value);
          filter.currentRegexValues.push(value.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
        }
      });
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

    var layerFiltersParams = _layersFiltersParams.get(layerId);
    //search if value exist un currentFilters
    if (layerFiltersParams != undefined) {
      layerFiltersParams.forEach(function(filter, index, array) {
        if (filter.attribut == attribut && (value == null || filter.currentValues == value)) {
          filter.currentValues = [];
          filter.currentRegexValues = [];
        } else if (filter.attribut == attribut && filter.currentValues.includes(value)) {
          var indexValue = filter.currentValues.indexOf(value);
          filter.currentValues.splice(indexValue, 1);
          filter.currentRegexValues.splice(indexValue, 1);
        }
      });
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
   * Private Method: _getValueFromInfo
   *
   *
   **/
  var _getValueFromInfo = function(layerId, attribute, indexValue) {

    var params = _layersFiltersParams.get(layerId);

    for (var index in params) {
      if (params[index].attribut == attribute) {
        return params[index].availableValues[indexValue];
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

    var _layerFiltersParams = _layersFiltersParams.get(layerId);
    var featuresToBeFiltered = mviewer.getLayer(layerId).layer.getSource().getFeatures();
    var newVisibleFeatures = [];

    featuresToBeFiltered.forEach(feature => {

      var hideFeature = false;
      var atLeastOneFilter = false;

      //search if value exist un currentFilters
      _layerFiltersParams.forEach(function(filter, index, array) {

        // Only if there is a filter
        if (filter.currentValues.length > 0) {
          atLeastOneFilter = true;

          // filter on date is specific, filter.value should be contains beetween to attribute valuse
          if (filter.type == "date") {
            // if current date beetwen start and end date
            if (!_isDateInPeriod(filter.currentValues[0], feature.get(filter.attribut[0]), feature.get(filter.attribut[1]))) {
              hideFeature = true;
            }
          } else if (!_isValueInFeaturePropertie(filter.currentRegexValues, feature.get(filter.attribut))) {
            hideFeature = true;
          }
        }

      });
      // Hide features
      if (atLeastOneFilter && hideFeature) {
        feature.setStyle(new ol.style.Style({}));
      } else {
        feature.setStyle(null);
        newVisibleFeatures.push(feature.getId());
      }
    });
    _visibleFeatures.set(layerId, newVisibleFeatures);
    _manageFilterPanel(layerId);
  };

  /**
  *
  */
  var _isDateInPeriod = function(wantedDate, startDate, endDate) {
    if (_stringToDate(startDate) <= wantedDate && _stringToDate(endDate) >= wantedDate){
      return true;
    }
    return false;

  };

  /**
  *
  */
  var _isValueInFeaturePropertie = function(wantedValues, featurePropertie) {
    var isInValue = false;

    // If featurePropertie not null, empyt or undefined
    if (_isEmpty(featurePropertie)) {
      return isInValue;
    } else if (new RegExp(wantedValues.join("|")).test(featurePropertie)) {
      isInValue = true;
    }
    return isInValue;

  };

  /**
   *
   */
  var _clearFilter = function(id) {
    // get information for elment id ( type-layerid-attribut-index)
    var filtreInformation = id.split("-");
    var type = filtreInformation[0];
    var layerId = filtreInformation[1];
    var attribut = filtreInformation[2];

    _removeFilterElementFromList(layerId, attribut, null);
    _filterFeatures(layerId);
  };

  /**
   *
   **/
  var _isEmpty = function(val) {
    return (val === undefined || val == null || val.length <= 0) ? true : false;
  };

  /**
   *
   **/
  var _stringToDate = function(string, format) {
    var date = new Date(string);
    return date;
  };


  /**
   * Private Method: _clearFilterFeatures
   * @param {String} layerId layer id from layer to be cleared
   *
   **/
  var _clearFilterFeatures = function(layerId) {

    var featuresToUnFiltered = mviewer.getLayer(layerId).layer.getSource().getFeatures();
    _visibleFeatures.set(layerId, []);
    _currentFilters.set(layerId, {});
    featuresToUnFiltered.forEach(feature => {
      // apply initial style
      feature.setStyle(null);
    });
    _manageFilterPanel(layerId);
  };

  /**
   * Private Method: _clearAllFilter
   *
   **/
  var _clearAllFilter = function() {

    // Parse all layer to get params
    for (var [layerId, params] of _layersParams) {
      _clearFilterFeatures(layerId);
    }
  };

  return {
    init: _initFilterTool,
    toggle: _toggle,
    filterFeatures: _filterFeatures,
    onValueChange: _onValueChange,
    clearFilter: _clearFilter
  };

})();

new CustomComponent("filter", filter.init);
//filter.configFilterableLayer();
