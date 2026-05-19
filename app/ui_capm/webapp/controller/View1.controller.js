sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/Fragment",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/model/json/JSONModel"
], function (Controller, Fragment, MessageToast, MessageBox, JSONModel) {
  "use strict";

  return Controller.extend("com.capmlearn.uicapm.controller.View1", {

    onOpenCreateDialogOrder: async function () {
      const oView = this.getView();

      oView.setModel(new JSONModel({
        orderNumber: "",
        customerName: "",
        Items: [{ product_ID: "", quantity: 1 }]
      }), "orderModel");

      if (!this._createDialog) {
        this._createDialog = await Fragment.load({
          id: oView.getId(),
          name: "com.capmlearn.uicapm.fragments.CreateOrder",
          controller: this
        });
        oView.addDependent(this._createDialog);
      }

      this._createDialog.open();
    },

    onCreateOrderSave: async function () {
      const m = this.getView().getModel("orderModel");
      const d = m.getData();

      if (!d.customerName) {
        MessageToast.show("Customer Name is required");
        return;
      }

      const Items = d.Items
        .filter(i => i.product_ID)
        .map(i => ({
          product_ID: i.product_ID,
          quantity: parseInt(i.quantity, 10) || 1
        }));

      if (!Items.length) {
        MessageToast.show("Add at least one product");
        return;
      }

      const payload = {
        customerName: d.customerName,
        Items
      };

      try {
        const oList = this.byId("ordersList");
        const ctx = oList.getBinding("items").create(payload);
        await ctx.created();

        const created = ctx.getObject();

        MessageBox.success(
          `Order ${created.orderNumber} created successfully`
        );

        this._createDialog.close();

      } catch (e) {
        console.error(e);
        MessageBox.error("Order creation failed");
      }
    },

    onAddItemRow: function () {
      const m = this.getView().getModel("orderModel");
      m.getData().Items.push({ product_ID: "", quantity: 1 });
      m.refresh(true);
    },

    onDeleteItemRow: function (oEvent) {
      const m = this.getView().getModel("orderModel");
      const path = oEvent.getSource()
        .getParent()
        .getBindingContext("orderModel")
        .getPath();

      const idx = parseInt(path.split("/").pop(), 10);
      m.getData().Items.splice(idx, 1);
      m.refresh(true);
    },

    onCreateOrderCancel: function () {
      this._createDialog.close();
    }

  });
});