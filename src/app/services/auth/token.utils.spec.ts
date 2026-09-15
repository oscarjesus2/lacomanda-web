import { isJwtActive } from './token.utils';

describe('isJwtActive', () => {
  function tokenWithExpiration(exp: number): string {
    const payload = btoa(JSON.stringify({
      exp,
      sub: 'user-id',
      preferred_username: 'user',
    }))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return `header.${payload}.signature`;
  }

  it('acepta un token que seguirá vigente después del margen', () => {
    const token = tokenWithExpiration(Math.floor(Date.now() / 1000) + 120);

    expect(isJwtActive(token)).toBeTrue();
  });

  it('rechaza un token vencido o malformado', () => {
    const expired = tokenWithExpiration(Math.floor(Date.now() / 1000) - 1);

    expect(isJwtActive(expired)).toBeFalse();
    expect(isJwtActive('not-a-jwt')).toBeFalse();
    expect(isJwtActive(null)).toBeFalse();
  });
});
