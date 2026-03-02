module.exports = (srv) => {
  const { Employees} = srv.entities;

  // Map variations to canonical enum members
  const normalizeGender = (val) => {
    if (val == null) return val;
    const v = String(val).trim().toLowerCase();
    if (v === 'm' || v === 'male')    return 'Male';
    if (v === 'f' || v === 'female')  return 'Female';
    if (v === 'o' || v === 'other' || v === 'others') return 'Others';
    return null;
  };

  const validateGender = (req) => {
    if (!('gender' in req.data)) return; // not part of the request payload
    const normalized = normalizeGender(req.data.gender);
    if (!normalized) {
      req.reject(400, "Invalid gender. Allowed values: 'Male' | 'Female' | 'Others'.");
    }
    req.data.gender = normalized;
  };

  srv.before('CREATE', Employees, (req) => {
    validateGender(req);
    if (!req.data.gender) req.reject(400, "Gender is mandatory.");
  });

  srv.before('UPDATE', Employees, (req) => {
    validateGender(req);
  });

};