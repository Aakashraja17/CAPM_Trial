// sap.ui.define([], function () {
//   "use strict";
//   return {
//     subtotal: function (qty, price) {
//       // gracefully handle missing/undefined values
//       const q = Number(qty);
//       const p = Number(price);
//       if (!isFinite(q) || !isFinite(p)) return ""; // or "0.00"
//       const v = q * p;
//       return v.toFixed(2); // format to 2 decimals
//     }
//   };
// });
sap.ui.define([], function () {
  "use strict";
  function toNumberSafe(v) {
    if (v == null) return NaN;
    // normalize any "1,200.00 ₹" → "1200.00"
    const s = String(v).replace(/[^\d.-]/g, ""); // remove commas, currency, spaces
    return Number(s);
  }
  return {
    subtotal: function (qty, price) {
      const q = toNumberSafe(qty);
      const p = toNumberSafe(price);
      if (!isFinite(q) || !isFinite(p)) return "0.00";  // show zero instead of blank
      return (q * p).toFixed(2);
    }
  };
});