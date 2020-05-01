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
   * Public Method: _initFilterTool exported as init
   *
   */
  var _initFilterTool = function() {

    var layerParams = mviewer.customComponents.filter.config.options.layers;

    layerParams.forEach(layer => {
      // Should never happens but we could check if layer.id not already exist in _layersParams
      _layersParams.set(layer.layerId, layer.filter);
      _visibleFeatures.set(layerId, []);
    });

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
        _manageFilterPanel();
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
    for (var [layerId, params] of _layersParams) {

      // Create div
      var destinationDivId = "advancedFilter-" + layerId;

      if(('#'+destinationDivId).length){
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
        } else if (params[index].type == "textbox") {
          _manageTextFilter(destinationDivId, layerId, params[index]);
        } else if (params[index].type == "date") {
          _manageDateFilter(destinationDivId, layerId, params[index]);
        }
      }
    }
  };

  /**
  *
  */
  var _setMasterFilterDivId= function(layerId, id){
    var params = _layersParams.get(layerId);

  };


  /**
   * Private Method: _updateDistinctValues for a layer
   * @param {string} layerId The layer id to be filter
   *
   **/
  var _updateFeaturesDistinctValues = function(layerId) {

    // for given attributes array update values
    var layerParams = _layersParams.get(layerId);
    var visibleFeatures = _visibleFeatures.get(layerId) == undefined ? [] : _visibleFeatures.get(layerId);

    var features = mviewer.getLayer(layerId).layer.getSource().getFeatures();

    // Parse all params to create panel
    for (var index in layerParams) {

      // Removed old values or initialise array
      // Array use to build panel
      layerParams[index].values = [];

      features.forEach(feature => {

        if ((visibleFeatures.length == 0 || visibleFeatures.includes(feature.getId())) && feature.get(layerParams[index].attribut) != null) {
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
    var alreadyExist = $('#' +id).length;

    // test if div alreay exist
    if (alreadyExist){
       $('#' +id).empty();
   }else{
     _checkBox = [
      '<div class="form-check mb-2 mr-sm-2">',
        '<div class="form-check filter-legend">',
          '<legend > ' + filterParams.label + ' </legend>',
          '<span id='+clearId+' class="filter-clear glyphicon glyphicon-remove" onclick="filter.clearFilter(this.id);"></span>',
        '</div>',
        '<div id ="'+id+'" class="form-check">'
    ];
  }
    filterParams.values.forEach(function(value, index, array) {
      var id = "filterCheck-" + layerId + "-" + filterParams.attribut + "-" + index;
      _checkBox.push('<input hidden type="checkbox" class="form-check-input" onclick="filter.onValueChange(this);" id="' + id + '">');
      _checkBox.push('<label class="form-check-label" for="' + id + '">' + value + '</label>');
    });

    if (!alreadyExist){
          _checkBox.push('</div></div>');
          $("#" + divId).append(_checkBox.join(""));
    }else{
        $("#" + id).append(_checkBox.join(""));
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
    if ($('#' +id).length){
      // Update tagsinput params
      $("#" + id).tagsinput({
        typeahead: {
          source: params.values
        },
        freeInput: false
      });
   }else{

    // HTML
    var _text = [
      '<div class="form-check mb-2 mr-sm-2">',
      '<div class="form-check filter-legend">',
        '<legend > ' + params.label + ' </legend>',
        '<span id='+clearId+' class="filter-clear glyphicon glyphicon-remove"></span>',
      '</div>',
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
      _setMasterFilterDivId(layerId, id);
      _addFilterElementToList(layerId, params.attribut, event.item);
      _filterFeatures(layerId);
      // remover entered text
      setTimeout(function() {
        $(">input[type=text]", ".bootstrap-tagsinput").val("");
      }, 1);
    });

    $("#" + clearId).on('click', function(event){
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
    if (!$('#' +id).length){
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
      startDate: '-3d',
      clearBtn: true,
      todayHighlight: true
    });

    $("#" + id).on('changeDate', function(event) {
      _setMasterFilterDivId(layerId, id);
      console.log(event);
      //  _addFilterElementToList(layerId, params.attribut, e.format());
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
    if ($('#' +id).length){
      $('#' +id).empty();
    }else{
      comboBox = [
        '<div class="form-group mb-2 mr-sm-2">',
        '<div class="form-check filter-legend">',
          '<legend > ' + params.label + ' </legend>',
          '<span id='+clearId+' class="filter-clear glyphicon glyphicon-remove"></span>',
        '</div>',
        '<select id="' + id + '" class="form-control" onchange="filter.onValueChange(this)">'];
    }

    comboBox.push('<option selected>Choisissez...</option>');

    params.values.forEach(function(value, index, array) {
      comboBox.push(' <option>' + value + '</option>');
    });
    if ($('#' +id).length){
        $("#" + id).append(comboBox.join(""));
    }else{
        comboBox.push('</select></div>');
        $("#" + divId).append(comboBox.join(""));
    }

    $("#" + clearId).on('click', function(event){
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

    _setMasterFilterDivId(layerId, element.id);
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
    var newVisibleFeatures = [];

    featuresToBeFiltered.forEach(feature => {

      // filter only if parameters exist and if feature is in visiblefeature list
      if (filtersByLayer.length > 0) {
        hideFeature = false;

        //search if value exist un currentFilters
        filtersByLayer.forEach(function(filter, index, array) {

          // if feature map filter keep it
          if (feature.get(filter.attribut) != null && new RegExp(filter.regexValue.join("|")).test(feature.get(filter.attribut))) {
            feature.setStyle(null);
          } else {
            // tag as hide if a least one condition is ok
            hideFeature = true;
          }

        });
        if (hideFeature) {
          feature.setStyle(new ol.style.Style({}));
        } else {
          newVisibleFeatures.push(feature.getId());
        }
      }
      // clear filter
      else {
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
