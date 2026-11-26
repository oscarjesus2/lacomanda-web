/**
 * Tracks a continuous loss of connectivity without changing the online flow.
 * The caller is responsible for checking the actual server availability.
 */
export class OfflineAvailability {
  static readonly offerDelayMs = 5 * 60 * 1000;

  private disconnectedAt: number | null = null;

  markUnavailable(now: number): void {
    if (this.disconnectedAt === null) {
      this.disconnectedAt = now;
    }
  }

  markAvailable(): void {
    this.disconnectedAt = null;
  }

  canOfferAutomatically(now: number): boolean {
    return this.disconnectedAt !== null
      && now - this.disconnectedAt >= OfflineAvailability.offerDelayMs;
  }

  canOfferManually(): boolean {
    return this.disconnectedAt !== null;
  }
}
