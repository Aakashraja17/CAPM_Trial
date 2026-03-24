sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/Sorter",
  "sap/ui/core/Fragment",
  "sap/m/MessageBox",
  "sap/ui/core/MessageType"
], (Controller, Filter, FilterOperator, Sorter, Fragment, MessageBox, MessageType) => {
  "use strict";

  return Controller.extend("com.capmlearn.uicapm.controller.View1", {

    onInit() {
    },
    onOrderPress: function (oEvent) {
  // Get the pressed list item (not the list)
  const oItem = oEvent.getParameter("listItem") || oEvent.getParameter("item");
  if (!oItem) {
    // Fallback for selection mode (e.g., SingleSelectMaster)
    const oList = oEvent.getSource();
    const oSelected = oList.getSelectedItem && oList.getSelectedItem();
    if (!oSelected) return;
    this._navFromItem(oSelected);
    return;
  }
  this._navFromItem(oItem);
},

_navFromItem: function (oItem) {
  const oCtx  = oItem.getBindingContext(); // default model
  const sPath = oCtx.getPath();            // e.g. "/Orders(guid'...')"

  // Route with the full binding path — most robust for keys
  this.getOwnerComponent().getRouter().navTo("RouteViewDetail", {
    ID: encodeURIComponent(sPath)
  });
},

onProductSelected: function (oEvent) {
    const selectedItem = oEvent.getParameter("selectedItem");

    if (selectedItem) {
        this.selectedProductId = selectedItem.getKey();  // store product ID
    }
},
onCreateOrderSave: async function () {
  const m = this.getView().getModel("orderModel");
  const d = m.getData();

  if (!d.orderNumber || !d.customerName) {
    sap.m.MessageToast.show("Order Number & Customer Name required");
    return;
  }

  const items = d.Items
    .filter(i => i.product_ID)
    .map(i => ({
      product_ID: i.product_ID,
      quantity: parseInt(i.quantity, 10) || 1
    }));

  if (!items.length) {
    sap.m.MessageToast.show("Add at least one product");
    return;
  }

  const payload = {
    orderNumber: d.orderNumber,
    customerName: d.customerName,
    Items: items
  };

  // Use the Orders list binding from the page list
  const oList = this.byId("ordersList");
  const oBinding = oList.getBinding("items");

  try {
    const ctx = oBinding.create(payload);
    await ctx.created();
    sap.m.MessageToast.show("Order created!");
    this._createDialog.close();
  } catch (e) {
    console.error(e);
    sap.m.MessageBox.error("Error creating order");
  }
},
onOpenCreateDialogOrder: async function () {
  const oView = this.getView();

  const oData = {
    orderNumber: "",
    customerName: "",
    Items: [{ product_ID: "", quantity: 1 }]
  };
  const oOrderModel = new sap.ui.model.json.JSONModel(oData);
  oView.setModel(oOrderModel, "orderModel");

  // Load dialog once
  if (!this._createDialog) {
    this._createDialog = await sap.ui.core.Fragment.load({
      id: oView.getId(),
      name: "com.capmlearn.uicapm.fragments.CreateOrder", // match your file path
      type: "XML",
      controller: this
    });
    oView.addDependent(this._createDialog);
  }
  this._createDialog.open();
},
onAddItemRow: function () {
  const m = this.getView().getModel("orderModel");
  const d = m.getData();
  d.Items.push({ product_ID: "", quantity: 1 });
  m.refresh(true);
},

onDeleteItemRow: function (oEvent) {
  const m = this.getView().getModel("orderModel");
  const d = m.getData();
  const sPath = oEvent.getSource().getParent().getBindingContext("orderModel").getPath(); // e.g. /Items/2
  const idx = parseInt(sPath.split("/").pop(), 10);
  d.Items.splice(idx, 1);
  m.refresh(true);
},

onCreateOrderCancel: function () {
  this._createDialog.close();
}

  });
});
