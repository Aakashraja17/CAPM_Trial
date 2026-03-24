sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/routing/History",
  "com/capmlearn/uicapm/formatter/formatter",
  "sap/ui/model/json/JSONModel"
], function (Controller, History, formatter, JSONModel) {
  "use strict";
  
function toNumberSafe(v) {
    if (v == null) return NaN;
    const s = String(v).replace(/[^\d.-]/g, ""); // strip commas, currency symbols, spaces
    return Number(s);
  }


  return Controller.extend("com.capmlearn.uicapm.controller.Detailview", {
    formatter,

    // onInit: function () {
    //   this.getOwnerComponent()
    //     .getRouter()
    //     .getRoute("RouteViewDetail")
    //     .attachPatternMatched(this._onRouteMatched, this);
    // },

    // _onRouteMatched: function (oEvent) {
    //   const ID = oEvent.getParameter("arguments").ID;

    //   // EmpId is STRING → use single quotes
    //   this.getView().bindElement({
    //     path: `/Employee('${ID}')`
    //   });
    // },
    // Detailview.controller.js

onInit() {
      // View-only model for footer total
      this.getView().setModel(new JSONModel({ grandTotal: "0.00" }), "view");

      this.getOwnerComponent().getRouter()
        .getRoute("RouteViewDetail")
        .attachPatternMatched(this._onMatched, this);
    },

    _onMatched(oEvent) {
      const sPath = decodeURIComponent(oEvent.getParameter("arguments").ID);

      // Bind the selected Order and expand Items+product
      this.getView().bindElement({
        path: sPath,
        parameters: { $expand: "Items($expand=product)" }
      });

      // Attach once the view/table exists
      setTimeout(() => this._attachTotalRecalc(), 0);
    },

    _attachTotalRecalc() {
      const oTable = this.byId("itemsTable");
      if (!oTable) return;

      const recalc = async () => {
        const oBinding = oTable.getBinding("items");
        if (!oBinding) return;

        // In OData V4, get contexts currently in the table
        const aCtxs = oBinding.getCurrentContexts
          ? oBinding.getCurrentContexts()
          : oBinding.getContexts();

        let total = 0;

        for (const ctx of aCtxs) {
          if (!ctx) continue;

          const qty = toNumberSafe(ctx.getProperty("quantity"));
          let price = toNumberSafe(ctx.getProperty("product/price"));

          // If price not yet in context (first row timing), try fetching product object
          if (!isFinite(price)) {
            try {
              const productObj = await ctx.requestObject("product");
              price = toNumberSafe(productObj?.price);
            } catch (e) {
              // ignore; treat price as 0
            }
          }

          if (isFinite(qty) && isFinite(price)) {
            total += qty * price;
          }
        }

        this.getView().getModel("view").setProperty("/grandTotal", total.toFixed(2));
      };

      // Trigger on first paint and whenever binding changes/receives data
      oTable.attachEventOnce("updateFinished", recalc);

      const oBinding = oTable.getBinding("items");
      if (oBinding) {
        oBinding.attachEvent("change", recalc);
        oBinding.attachEvent("refresh", recalc);
        oBinding.attachEvent("dataReceived", recalc);
      }

      // Safety: one more recalculation shortly after
      setTimeout(recalc, 200);
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