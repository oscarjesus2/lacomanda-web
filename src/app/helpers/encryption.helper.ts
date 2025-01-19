import * as forge from 'node-forge';

// Clave pública RSA (reemplaza con tu clave real)
const PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy9m3RJdnl2jrpsWjHp3h
8979xvah581F1TbxugMgSWsCJa+zBYy+4gsxuW5XmBrFhQCZ5gL/DoNox8yktgRL
cdv5SvjVfnlp7P1UCg5dwOSi6t/3yhjIskoVpoK/ZhU62XDuyb1UkWyUUq2OK15l
6X0+41BYAh9YXT60CnyYSdXB5H2b4vuZcFqS61ikAXF1gxN5Hq+oYhKafqajtpud
wF42CaefWNjGirhdBzmIB/rweTkXw1EXlFeYMt8p0HShqRlSZrkP/WBtPrR8Evwo
cCeLSsld+ul0mnPa57nHO18DXwHnbLqygcDnIOkRBKHlEjtHzp2vu5Jb0joFiwi1
JwIDAQAB
-----END PUBLIC KEY-----
`;

// Función para encriptar datos con RSA
export function encryptPassword(password: string): string {
  const rsa = forge.pki.publicKeyFromPem(PUBLIC_KEY);
  const encrypted = rsa.encrypt(password, 'RSA-OAEP', {
    md: forge.md.sha256.create(),            // Hash principal
    mgf1: forge.mgf.mgf1.create(forge.md.sha256.create())  // MGF1 con SHA-256
});
  return forge.util.encode64(encrypted); // Retorna el cifrado en Base64
}
