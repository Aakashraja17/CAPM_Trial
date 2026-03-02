sap.ui.define(["sap/ui/core/mvc/Controller",
     "sap/ui/model/Filter",
      "sap/ui/model/FilterOperator",
       "sap/ui/model/Sorter",
"sap/ui/core/Fragment",
  "sap/m/MessageBox"

     ], (Controller, Filter, FilterOperator, Sorter, Fragment, MessageBox) => {
    "use strict";
    return Controller.extend("com.capmlearn.uicapm.controller.View1", {
        onInit() {
            
        
                this.getOwnerComponent().getModel("create").setData({
        EmpId: "",
        Name: "",
        Salary: "",
        Gender: "",
        Age:null
      });


        },
        onFilter() {
            var sQuery = this.getView().byId("idFilterName").getValue()
            
            var aFilter1 = new Filter("EmpId", FilterOperator.Contains, sQuery)
            var aFilter2 = new Filter("Name", FilterOperator.Contains, sQuery)
            var aFilter3 = new Filter("Salary", FilterOperator.Contains, sQuery)
            var aFilter = [aFilter1, aFilter2, aFilter3];
            // Wrap them inside a single OR filter
            var oMainFilter = new Filter({
                filters: aFilter,
                and: false
            });
            var oList = this.getView().byId("idEmpTable");
            var oBindList = oList.getBinding("items");
            oBindList.filter(oMainFilter);
        },
        onSort: function() {
            if (!this.bDescending) {
                this.bDescending = false;
            }
            var oSorter = new Sorter("EmpId", this.bDescending);
            var oList = this.getView().byId("idEmpTable");
            var oBinding = oList.getBinding("items");
            oBinding.sort(oSorter);
            this.bDescending = !this.bDescending;
        },
        
onOpenCreateDialog: async function () {
      if (!this._oDialog) {
        this._oDialog = await Fragment.load({
          id: this.getView().getId(),
          name: "com.capmlearn.uicapm.fragments.CreateProduct",
          controller: this
        });
        this.getView().addDependent(this._oDialog);
        this._oDialog.setModel(this.getOwnerComponent().getModel("create"), "create");
      }
      // Reset the form each time
      this.getOwnerComponent().getModel("create").setData({ EmpId: "", Name: "", Salary: "", Gender: "", Age:null });
      this._oDialog.open();
    },
    
 onCancelCreate: function () {
      this._oDialog.close();
    },
    
onSaveCreate: function () {
  const oCreate = this.getOwnerComponent().getModel("create");
  const d = oCreate.getData();

  // UI validation
  if (!d.EmpId || !d.Name) {
    sap.m.MessageBox.warning("EmpId and Name are required.");
    return;
  }
  if (!d.Gender) {
    const oSel = this.byId("inpGender");
    if (oSel) oSel.setValueState(sap.ui.core.ValueState.Error);
    sap.m.MessageBox.warning("Please select Gender.");
     if (oSel) oSel.setValueState(sap.ui.core.ValueState.None);
    return;
  } else {
    const oSel = this.byId("inpGender");
    if (oSel) oSel.setValueState(sap.ui.core.ValueState.None);
  }

  const oListBinding = this.byId("idEmpTable").getBinding("items");
  const ctx = oListBinding.create({
    EmpId : d.EmpId.trim(),
    Name  : d.Name.trim(),
    Salary: (d.Salary ?? "").toString().trim(),
    Gender: d.Gender,  // "Male" | "Female" | "Others"
    Age:d.Age
  });

  ctx.created().then(() => {
    sap.m.MessageToast.show("Employee created");
    this._oDialog.close();
  }).catch(err => {
    sap.m.MessageBox.error("Create failed: " + (err && err.message ? err.message : err));
  });
},
onOpenUpdateDialog: async function (oEvent) {
  const oContext = oEvent.getSource().getBindingContext(); // Row context (OData V4)
  if (!oContext) {
    MessageBox.error("No context found for this row.");
    return;
  }

  // 🚀 CRITICAL FIX — wait until backend finishes reading this entity
  await oContext.requestObject();

  if (!this._oUpdateDialog) {
    this._oUpdateDialog = await Fragment.load({
      id: this.getView().getId(),
      name: "com.capmlearn.uicapm.fragments.UpdateEmployee",
      controller: this
    });
    this.getView().addDependent(this._oUpdateDialog);
  }

  // Now safe to bind (because data has been read)
  const sPath = oContext.getPath();
  this._oUpdateDialog.bindElement({ path: sPath });

  this._oUpdateDialog.open();
},    
onCancelUpdate: function () {
  const oModel = this.getView().getModel();
  const oCtx   = this._oUpdateDialog.getBindingContext();
  const sPath  = oCtx && oCtx.getPath();

  if (sPath && oModel.hasPendingChanges()) {
    // Revert only the pending changes for this entity
    oModel.resetChanges([sPath]);
  }
  this._oUpdateDialog.close();
},
    
onConfirmUpdate: async function () {
  const oModel = this.getView().getModel();  // OData V4
  const oCtx   = this._oUpdateDialog.getBindingContext();

  const data = oCtx.getObject();  // snapshot

  if (!data.Gender) {
    sap.m.MessageBox.warning("Please select Gender.");
    return;
  }

  try {

    // Normalize string fields
    oCtx.setProperty("Name", (data.Name ?? "").trim());
    oCtx.setProperty("Salary", (data.Salary ?? "").toString().trim()); // Salary is STRING - OK

    // Age must be integer → validate & convert
    if (data.Age === "" || data.Age === null || data.Age === undefined) {
      oCtx.setProperty("Age", null);   // allow null if your CAP allows nullable
    } else {
      const ageInt = parseInt(data.Age, 10);
      if (isNaN(ageInt)) {
        sap.m.MessageBox.error("Age must be a number.");
        return;
      }
      oCtx.setProperty("Age", ageInt);   // Correct: send integer NOT string
    }

    await oModel.submitBatch("$auto");
    await oCtx.requestObject();

    sap.m.MessageToast.show("Employee updated");
    this._oUpdateDialog.close();

  } catch (e) {
    sap.m.MessageBox.error("Update failed: " + (e && e.message ? e.message : e));
  }
},
onDeleteRow: async function (oEvent) {
  const oCtx = oEvent.getSource().getBindingContext();
  const oModel = this.getView().getModel();

  sap.m.MessageBox.confirm("Do you really want to delete this employee?", {
    actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
    onClose: async (sAction) => {
      if (sAction === sap.m.MessageBox.Action.OK) {
        try {
          await oCtx.delete("$auto");
          await oModel.submitBatch("$auto");
          sap.m.MessageToast.show("Employee deleted");
        } catch (e) {
          sap.m.MessageBox.error("Delete failed: " + (e && e.message ? e.message : e));
        }
      }
    },
    
  });
},
onItemPress: function (oEvent) {

  // Correct row from the event
  const oItem = oEvent.getParameter("listItem");
  const oCtx  = oItem.getBindingContext();

  if (!oCtx) {
    console.warn("No binding context found");
    return;
  }

  const EmpId = oCtx.getProperty("EmpId");

  // Navigate using your route and parameter name
  this.getOwnerComponent().getRouter().navTo("RouteViewDetail", {
    EmpId: EmpId
  });
}

 
    });
});