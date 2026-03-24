sap.ui.define([
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "sap/ui/model/odata/v4/ODataModel"
], 
function (JSONModel, Device, ODataModel) {
    "use strict";

    return {
        /**
         * Provides runtime information for the device the UI5 app is running on as a JSONModel.
         * @returns {sap.ui.model.json.JSONModel} The device model.
         */
        createDeviceModel: function () {
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            return oModel;
        },
        
createODataModel: function () {
      return new ODataModel({
        serviceUrl: "/catalog/",
        synchronizationMode: "None",
        autoExpandSelect: true
      });
    }

    };

});