sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/routing/History"
], function (Controller, History) {
  "use strict";

  return Controller.extend("com.capmlearn.uicapm.controller.Detailview", {

    onInit: function () {
      this.getOwnerComponent()
        .getRouter()
        .getRoute("RouteViewDetail")
        .attachPatternMatched(this._onRouteMatched, this);
    },

    _onRouteMatched: function (oEvent) {
      const EmpId = oEvent.getParameter("arguments").EmpId;

      // EmpId is STRING → use single quotes
      this.getView().bindElement({
        path: `/Employee('${EmpId}')`
      });
    },

    onNavBack: function () {
      const prev = History.getInstance().getPreviousHash();
      if (prev !== undefined) {
        window.history.go(-1);
      } else {
        this.getOwnerComponent().getRouter().navTo("RouteView1", {}, true);
      }
    }

  });
});