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
      // Initialize the "create" JSON model with defaults
      this.getOwnerComponent().getModel("create").setData({
        Name: "",
        Salary: "",
        Gender: "",
        Age: null
      });

      // (Optional) Register MessageManager for consistent messaging
      const oMM = sap.ui.getCore().getMessageManager();
      oMM.registerObject(this.getView(), true);
      this.getView().setModel(oMM.getMessageModel(), "message");
    },

    /* ===========================
     * Helpers: validation & errors
     * =========================== */

    // Allow-list validation for Gender (case-insensitive)
    _isValidGender(v) {
      if (!v) return false;
      const s = String(v).trim().toLowerCase();
      return s === "male" || s === "female" || s === "others";
    },

    // Normalize to canonical values stored in backend
    _normalizeGender(v) {
      if (!v) return v;
      const s = String(v).trim().toLowerCase();
      if (s === "male") return "male";
      if (s === "female") return "female";
      if (s === "others") return "others";
      return v; // leave invalid; backend (CAP @assert.enum) will reject
    },

    // Extract meaningful text/target from OData V4/CAP error responses
    _extractBackendError(err) {
      const tryJSON = (txt) => { try { return JSON.parse(txt); } catch (e) { return null; } };

      // OData V4: HttpError shape with cause
      if (err && err.cause) {
        if (typeof err.cause.message === "string" && err.cause.message.trim()) {
          return { text: err.cause.message };
        }
        if (typeof err.cause.responseText === "string") {
          const parsed = tryJSON(err.cause.responseText);
          if (parsed && parsed.error) {
            const main = parsed.error.message?.value || parsed.error.message || "Request failed.";
            const details = Array.isArray(parsed.error.details) ? parsed.error.details.map(d => d.message).filter(Boolean) : [];
            return { text: main, details, target: parsed.error.target };
          }
        }
      }

      // jQuery-like XHR (OData V2) fallback
      if (err && err.responseText) {
        const parsed = tryJSON(err.responseText);
        if (parsed && parsed.error) {
          const main = parsed.error.message?.value || parsed.error.message || "Request failed.";
          const details = Array.isArray(parsed.error.details) ? parsed.error.details.map(d => d.message).filter(Boolean) : [];
          return { text: main, details, target: parsed.error.target };
        }
      }

      // CAP direct
      if (err && err.error) {
        const main = err.error.message?.value || err.error.message || err.message || "Request failed.";
        const details = Array.isArray(err.error.details) ? err.error.details.map(d => d.message).filter(Boolean) : [];
        return { text: main, details, target: err.error.target };
      }

      if (typeof err === "string") return { text: err };
      if (err && err.message) return { text: err.message };

      return { text: "Request failed." };
    },

    // Optional: push messages to MessageManager (for a MessagePopover later)
    _addMessage(msg, type = MessageType.Error, target) {
      const oMM = sap.ui.getCore().getMessageManager();
      oMM.addMessages(new sap.ui.core.Message({
        message: msg,
        type,
        target,
        processor: this.getView().getModel()
      }));
    },

    /* ===========================
     * Filter / Sort
     * =========================== */

    onFilter() {
      const sQuery = this.getView().byId("idFilterName").getValue();

      const aFilter = [
        new Filter("ID",  FilterOperator.Contains, sQuery),
        new Filter("Name",   FilterOperator.Contains, sQuery),
        new Filter("Salary", FilterOperator.Contains, sQuery) // Salary is string in CDS
      ];

      const oMainFilter = new Filter({ filters: aFilter, and: false }); // OR
      const oList = this.getView().byId("idEmpTable");
      oList.getBinding("items").filter(oMainFilter);
    },

    onSort() {
      if (typeof this.bDescending !== "boolean") {
        this.bDescending = false;
      }
      const oSorter = new Sorter("ID", this.bDescending);
      const oList = this.getView().byId("idEmpTable");
      oList.getBinding("items").sort(oSorter);
      this.bDescending = !this.bDescending;
    },

    /* ===========================
     * Create
     * =========================== */

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
      this.getOwnerComponent().getModel("create").setData({
        Name: "", Salary: "", Gender: "", Age: null
      });

      // Clear any previous state on Gender input
      const oInpGender = this.byId("inpGender");
      if (oInpGender) {
        oInpGender.setValueState(sap.ui.core.ValueState.None);
        oInpGender.setValueStateText("");
      }

      this._oDialog.open();
    },

    onCancelCreate() {
      this._oDialog.close();
    },

    // Since Gender is an Input: validate live
    onGenderLiveChange(oEvent) {
      const oInp = oEvent.getSource();
      const val = oInp.getValue();
      if (this._isValidGender(val)) {
        oInp.setValueState(sap.ui.core.ValueState.Success);
        oInp.setValueStateText("");
      } else {
        oInp.setValueState(sap.ui.core.ValueState.Error);
        oInp.setValueStateText("Allowed values: Male, Female, Others");
      }
    },

    onGenderChange(oEvent) {
      const oInp = oEvent.getSource();
      const norm = this._normalizeGender(oInp.getValue());
      oInp.setValue(norm);

      if (this._isValidGender(norm)) {
        oInp.setValueState(sap.ui.core.ValueState.None);
        oInp.setValueStateText("");
      } else {
        oInp.setValueState(sap.ui.core.ValueState.Error);
        oInp.setValueStateText("Allowed values: Male, Female, Others");
      }
    },

    onSaveCreate: function () {
      const oCreate = this.getOwnerComponent().getModel("create");
      const d = oCreate.getData();

      // Basic required checks
      if (!d.Name) {
        sap.m.MessageBox.warning("ID and Name are required.");
        return;
      }

      // Gender validation (Input)
      const oInpGender = this.byId("inpGender");
      const normalizedGender = this._normalizeGender(d.Gender);
      if (!this._isValidGender(normalizedGender)) {
        if (oInpGender) {
          oInpGender.setValueState(sap.ui.core.ValueState.Error);
          oInpGender.setValueStateText("Allowed values: Male, Female, Others");
          oInpGender.focus();
        }
        sap.m.MessageBox.warning("Please provide a valid Gender: Male, Female, or Others.");
        return;
      } else if (oInpGender) {
        oInpGender.setValueState(sap.ui.core.ValueState.None);
      }

      // Normalize Age on create too
      let normalizedAge = null;
      if (d.Age !== "" && d.Age !== null && d.Age !== undefined) {
        const ageInt = parseInt(d.Age, 10);
        if (isNaN(ageInt)) {
          sap.m.MessageBox.error("Age must be a number.");
          return;
        }
        normalizedAge = ageInt;
      }

      // Create (OData V4 ListBinding#create)
      const oListBinding = this.byId("idEmpTable").getBinding("items");
      const ctx = oListBinding.create({
        //EmpId : d.EmpId.trim(),
        Name  : d.Name.trim(),
        Salary: (d.Salary ?? "").toString().trim(),
        Gender: normalizedGender,   // send canonical value
        Age   : normalizedAge
      });

      ctx.created()
        .then(() => {
          sap.m.MessageToast.show("Employee created");
          this._oDialog.close();

          this._applyEmpSort();
        })
        .catch(err => {
          const { text, details, target } = this._extractBackendError(err);

          // If backend error targets Gender, mark the field
          if (target && /gender/i.test(target)) {
            const oSel = this.byId("inpGender");
            if (oSel) {
              oSel.setValueState(sap.ui.core.ValueState.Error);
              oSel.setValueStateText(text);
              oSel.focus();
            }
          }

          const full = [text].concat(details || []).filter(Boolean).join("\n");
          sap.m.MessageBox.error(full || "Create failed.");

          // Optionally push into MessageManager
          // this._addMessage(full || text, MessageType.Error, target);
        });
    },

    /* ===========================
     * Update (OData V4)
     * =========================== */

    onOpenUpdateDialog: async function (oEvent) {
      const oContext = oEvent.getSource().getBindingContext(); // Row context
      if (!oContext) {
        MessageBox.error("No context found for this row.");
        return;
      }

      // Ensure the row entity is read
      await oContext.requestObject();

      if (!this._oUpdateDialog) {
        this._oUpdateDialog = await Fragment.load({
          id: this.getView().getId(),
          name: "com.capmlearn.uicapm.fragments.UpdateEmployee",
          controller: this
        });
        this.getView().addDependent(this._oUpdateDialog);
      }

      const sPath = oContext.getPath();
      this._oUpdateDialog.bindElement({ path: sPath });

      // Clear gender state if the Update dialog has a gender input
      const oUpdGender = this._oUpdateDialog.byId && this._oUpdateDialog.byId("inpGenderUpdate");
      if (oUpdGender) {
        oUpdGender.setValueState(sap.ui.core.ValueState.None);
        oUpdGender.setValueStateText("");
      }

      this._oUpdateDialog.open();
    },

    onCancelUpdate() {
      const oModel = this.getView().getModel();
      const oCtx   = this._oUpdateDialog.getBindingContext();
      const sPath  = oCtx && oCtx.getPath();

      if (sPath && oModel.hasPendingChanges()) {
        oModel.resetChanges([sPath]);
      }
      this._oUpdateDialog.close();
    },

    onConfirmUpdate: async function () {
      const oModel = this.getView().getModel();  // OData V4
      const oCtx   = this._oUpdateDialog.getBindingContext();
      const data   = oCtx.getObject();           // snapshot

      // Validate gender
      if (!this._isValidGender(data.Gender)) {
        sap.m.MessageBox.warning("Please provide a valid Gender: male, female, or others.");
        const oInpUpd = this._oUpdateDialog.byId && this._oUpdateDialog.byId("inpGenderUpdate");
        if (oInpUpd) {
          oInpUpd.setValueState(sap.ui.core.ValueState.Error);
          oInpUpd.setValueStateText("Allowed values: Male, Female, Others");
          oInpUpd.focus();
        }
        return;
      }

      try {
        // Normalize values before submit
        oCtx.setProperty("Name", (data.Name ?? "").trim());
        oCtx.setProperty("Salary", (data.Salary ?? "").toString().trim());
        oCtx.setProperty("Gender", this._normalizeGender(data.Gender));

        if (data.Age === "" || data.Age === null || data.Age === undefined) {
          oCtx.setProperty("Age", null);
        } else {
          const ageInt = parseInt(data.Age, 10);
          if (isNaN(ageInt)) {
            sap.m.MessageBox.error("Age must be a number.");
            return;
          }
          oCtx.setProperty("Age", ageInt);
        }

        await oModel.submitBatch("$auto");
        await oCtx.requestObject(); // refresh after submit

        sap.m.MessageToast.show("Employee updated");
        this._oUpdateDialog.close();
        this._applyEmpSort();

      } catch (e) {
        const { text, details } = this._extractBackendError(e);
        const full = [text].concat(details || []).filter(Boolean).join("\n");
        sap.m.MessageBox.error(full || "Update failed.");
      }
    },

    /* ===========================
     * Delete
     * =========================== */

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
              const { text, details } = this._extractBackendError(e);
              const full = [text].concat(details || []).filter(Boolean).join("\n");
              sap.m.MessageBox.error(full || "Delete failed.");
            }
          }
        },
      });
    },

    /* ===========================
     * Navigation
     * =========================== */

    onItemPress(oEvent) {
      const oItem = oEvent.getParameter("listItem");
      const oCtx  = oItem.getBindingContext();

      if (!oCtx) {
        // eslint-disable-next-line no-console
        console.warn("No binding context found");
        return;
      }

      const ID = oCtx.getProperty("ID");
      this.getOwnerComponent().getRouter().navTo("RouteViewDetail", { ID });
    },
    // Put this in your controller
_applyEmpSort: function () {
  const oList = this.byId("idEmpTable");
  const oBinding = oList.getBinding("items");

  // If EmpId is string in your model, use comparator; if it's Integer, you can drop the comparator
  const oSorter = new sap.ui.model.Sorter(
    "ID",
    /* descending */ false,
    /* group */ false,
    /* comparator */ function (a, b) {
      const na = Number(a), nb = Number(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb)) {
        return na - nb; // numeric ascending
      }
      // fallback to string compare
      return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
    }
  );

  oBinding.sort(oSorter);
}

  });
});
