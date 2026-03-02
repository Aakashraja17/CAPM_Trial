sap.ui.define(["sap/ui/core/mvc/Controller",
     "sap/ui/model/Filter",
      "sap/ui/model/FilterOperator",
       "sap/ui/model/Sorter",
"sap/ui/core/Fragment",
  "sap/m/MessageToast",
  "sap/m/MessageBox"

     ], (Controller, Filter, FilterOperator, Sorter, Fragment, MessageToast, MessageBox) => {
    "use strict";
    return Controller.extend("com.capmlearn.uicapm.controller.View1", {
        onInit() {
            
        
                this.getOwnerComponent().getModel("create").setData({
        EmpId: "",
        Name: "",
        Salary: ""
      });


        },
        onFilter() {
            // let aFilters=[]
            // let sName=this.getView().byId("idFilterName").getValue()
            // if(sName){
            //     let filterName=[new Filter("Name", FilterOperator.Contains,sName),
            //         new Filter("EmpId", FilterOperator.Contains,sName),
            //         new Filter("Salary", FilterOperator.Contains,sName)
            //     ];
            //     aFilters.push(filterName)
            // }
            // let oTable=this.getView().byId("idEmpTable")
            // let oBinding= oTable.getBinding("items")
            //     oBinding.filter(aFilters)
            var sQuery = this.getView().byId("idFilterName").getValue()
            // var oTable = this.byId("idEmpTable");
            // var oBinding = oTable.getBinding("items");
            // if (!sQuery) {
            //     // Clear search → show all
            //     oBinding.filter([]);
            //     return;
            // }
            
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
      this.getOwnerComponent().getModel("create").setData({ EmpId: "", Name: "", Salary: "" });
      this._oDialog.open();
    },
    
 onCancelCreate: function () {
      this._oDialog.close();
    },
    
onSaveCreate: function () {
      const oCreateData = this.getOwnerComponent().getModel("create").getData();

      // Simple required validation
      if (!oCreateData.EmpId || !oCreateData.Name) {
        MessageBox.warning("EmpId and Name are required.");
        return;
      }

      const oTable = this.byId("idEmpTable");
      const oListBinding = oTable.getBinding("items"); // OData V4 ListBinding

      try {
        const oContext = oListBinding.create({
          EmpId: oCreateData.EmpId.trim(),
          Name: oCreateData.Name.trim(),
          Salary: (oCreateData.Salary ?? "").toString().trim()
        });
        
oContext.created().then(() => {
          MessageToast.show("Employee created");
          this._oDialog.close();
        }).catch((err) => {
          MessageBox.error("Create failed: " + (err && err.message ? err.message : err));
        });
      } catch (e) {
        MessageBox.error("Unexpected error: " + e.message);
      }
    },
    
 onOpenUpdateDialog: async function (oEvent) {
      const oContext = oEvent.getSource().getBindingContext(); // Row context (OData V4)
      if (!oContext) {
        MessageBox.error("No context found for this row.");
        return;
      }

      if (!this._oUpdateDialog) {
        this._oUpdateDialog = await Fragment.load({
          id: this.getView().getId(),
          name: "com.capmlearn.uicapm.fragments.UpdateEmployee",
          controller: this
        });
        this.getView().addDependent(this._oUpdateDialog);
      }

      // Bind the dialog to the row's path so controls inside use {EmpId}, {Name}, {Salary}
      const sPath = oContext.getPath(); // e.g., "/Employees(ID=...)"
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
  const oModel = this.getView().getModel();  // OData V4 model
  const oCtx   = this._oUpdateDialog.getBindingContext(); // bound row

  try {
    // Option A (sync): read current values from the context snapshot
    const oData = oCtx.getObject(); // { EmpId, Name, Salary, ... }

    // Simple validation (example)
    if (!oData || !oData.Name || !oData.Name.trim()) {
      sap.m.MessageBox.warning("Name is required.");
      return;
    }

    // If you want to normalize/trim before submitting, set properties explicitly:
    oCtx.setProperty("Name",   oData.Name.trim());
    oCtx.setProperty("Salary", (oData.Salary ?? "").toString().trim());
    // EmpId is usually immutable; if editable, you could also set it

    // Submit pending changes (PATCH)
    await oModel.submitBatch("$auto");
 sap.m.MessageToast.show("Employee updated");
    this._oUpdateDialog.close();

  } catch (e) {
    sap.m.MessageBox.error("Update failed: " + (e && e.message ? e.message : e));
  }
  const oTable = this.byId("idEmpTable");
const oListBinding = oTable.getBinding("items");

await oModel.submitBatch("$auto");
oListBinding.refresh();   // triggers reread of /Employees

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
    }
  });
}

    



    
 
    });
});