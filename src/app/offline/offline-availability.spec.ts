import { OfflineAvailability } from './offline-availability';

describe('OfflineAvailability', () => {
  let availability: OfflineAvailability;

  beforeEach(() => {
    availability = new OfflineAvailability();
  });

  it('does not offer offline access while the server is available', () => {
    expect(availability.canOfferManually()).toBeFalse();
    expect(availability.canOfferAutomatically(1_000_000)).toBeFalse();
  });

  it('allows manual access immediately and offers it after five minutes', () => {
    availability.markUnavailable(10_000);

    expect(availability.canOfferManually()).toBeTrue();
    expect(availability.canOfferAutomatically(309_999)).toBeFalse();
    expect(availability.canOfferAutomatically(310_000)).toBeTrue();
  });

  it('keeps the start of the outage when further requests fail', () => {
    availability.markUnavailable(10_000);
    availability.markUnavailable(200_000);

    expect(availability.canOfferAutomatically(310_000)).toBeTrue();
  });

  it('starts a new five-minute period after a confirmed recovery', () => {
    availability.markUnavailable(10_000);
    availability.markAvailable();
    availability.markUnavailable(100_000);

    expect(availability.canOfferAutomatically(310_000)).toBeFalse();
    expect(availability.canOfferAutomatically(400_000)).toBeTrue();
  });
});
