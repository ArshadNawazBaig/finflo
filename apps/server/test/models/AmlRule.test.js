/** AmlRule schema — required fields and type/severity enums. */
const mongoose = require('mongoose');
const AmlRule = require('../../src/models/AmlRule');

const base = () => ({
  user: new mongoose.Types.ObjectId(),
  name: 'Large Transaction',
  type: 'threshold',
  severity: 'high',
  conditions: { amount: 1000000 },
});

describe('AmlRule schema', () => {
  it('validates a complete rule', () => {
    expect(new AmlRule(base()).validateSync()).toBeUndefined();
  });

  it('requires user, name and type (severity defaults to medium)', () => {
    const err = new AmlRule({}).validateSync();
    ['user', 'name', 'type'].forEach((f) => expect(err.errors[f]).toBeTruthy());
    expect(err.errors.severity).toBeUndefined(); // has a default
  });

  it('rejects unknown type / severity', () => {
    expect(new AmlRule({ ...base(), type: 'fuzzy' }).validateSync().errors.type).toBeTruthy();
    expect(new AmlRule({ ...base(), severity: 'apocalyptic' }).validateSync().errors.severity).toBeTruthy();
  });

  it('accepts each rule type', () => {
    ['threshold', 'velocity', 'pattern', 'structuring'].forEach((type) => {
      expect(new AmlRule({ ...base(), type }).validateSync()).toBeUndefined();
    });
  });
});
