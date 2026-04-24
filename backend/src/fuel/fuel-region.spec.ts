import { resolveDieselRegion } from './fuel-region';

describe('resolveDieselRegion', () => {
  it('uses east malaysia pricing when locality contains Sabah', () => {
    expect(resolveDieselRegion('Sandakan, Sabah')).toBe('east_malaysia');
  });

  it('uses east malaysia pricing when locality contains Sarawak', () => {
    expect(resolveDieselRegion('Kuching, Sarawak')).toBe('east_malaysia');
  });

  it('uses east malaysia pricing when locality contains Labuan', () => {
    expect(resolveDieselRegion('W.P. Labuan')).toBe('east_malaysia');
  });

  it('uses east malaysia pricing for a district mapped to an east malaysia state', () => {
    expect(resolveDieselRegion('Miri')).toBe('east_malaysia');
  });

  it('uses peninsular pricing for a Peninsular Malaysia locality', () => {
    expect(resolveDieselRegion('Kuala Sepetang, Perak')).toBe('peninsular');
  });

  it('uses peninsular pricing for unknown locality text', () => {
    expect(resolveDieselRegion('Unknown Fishing Jetty')).toBe('peninsular');
  });

  it('uses peninsular pricing when locality is empty', () => {
    expect(resolveDieselRegion()).toBe('peninsular');
  });
});
