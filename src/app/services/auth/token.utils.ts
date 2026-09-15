interface JwtExpirationPayload {
  exp?: number;
}

/** Comprueba la expiración declarada por un JWT sin validar su firma. */
export function isJwtActive(
  token: string | null | undefined,
  clockSkewSeconds = 30,
): boolean {
  if (!token) return false;

  try {
    const encodedPayload = token.split('.')[1];
    if (!encodedPayload) return false;

    const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - base64.length % 4) % 4),
      '=',
    );
    const payload = JSON.parse(atob(paddedBase64)) as JwtExpirationPayload;
    return typeof payload.exp === 'number'
      && Number.isFinite(payload.exp)
      && payload.exp > Math.floor(Date.now() / 1000) + clockSkewSeconds;
  } catch {
    return false;
  }
}
