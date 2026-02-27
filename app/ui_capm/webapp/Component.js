sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/capmlearn/uicapm/model/models",
    "sap/ui/model/json/JSONModel"
], (UIComponent, models, JSONModel) => {
    "use strict";

    return UIComponent.extend("com.capmlearn.uicapm.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);
            this.getRouter().initialize();

            // set the device model
            
            const oCreateModel = new JSONModel({
                EmpId: "",
                Name: "",
                Salary: ""
            });
            this.setModel(oCreateModel, "create");

            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            
        }
    });
});