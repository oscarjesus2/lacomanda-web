import { HttpBackend, HttpRequest, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { EstacionTipoEnum } from '../enums/enum';
import { DispositivoTipoEnum } from '../models/device.models';
import { generarInstaladorCaja, InstaladorCajaWindowsService, nombreInstalador } from './instalador-caja-windows.service';

describe('Descarga del instalador de caja', () => {
  const sha256 = 'abcd'.repeat(16);
  const config = { tenantId: "café'&%PATH%", identificadorEstacion: 'caja-ñ', apiUrl: 'https://api.demo.test/api',
    origen: 'https://demo.test' };
  const token = 'privado.' + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + '.firma';
  let sesion: any;
  let plataforma: DispositivoTipoEnum;
  let estaciones: jasmine.SpyObj<any>;
  let manifest: jasmine.Spy;
  let servicio: InstaladorCajaWindowsService;

  beforeEach(() => {
    plataforma = DispositivoTipoEnum.PC_WINDOWS;
    sesion = { Ip: config.identificadorEstacion, TenantID: config.tenantId, Token: token,
      User: { TipoCompu: EstacionTipoEnum.CAJA }, RefreshToken: 'privado-refresco' };
    estaciones = jasmine.createSpyObj('estaciones', ['getAll']);
    estaciones.getAll.and.returnValue(of({ Success: true, Data: [{ Tipo: EstacionTipoEnum.CAJA,
      IdCaja: 1, IdentificadorUnico: config.identificadorEstacion }] }));
    manifest = jasmine.createSpy('manifiesto').and.returnValue(of(new HttpResponse({ body: { sha256 } })));
    servicio = new InstaladorCajaWindowsService({ handle: manifest } as HttpBackend,
      { getCurrentSession: () => sesion } as any, { getIdentifier: () => config.identificadorEstacion } as any,
      { getDeviceType: () => plataforma } as any, estaciones);
  });

  it('descarga un CMD y lee el manifiesto público sin cabeceras de sesión', async () => {
    spyOn(HTMLAnchorElement.prototype, 'click');
    const objeto = spyOn(URL, 'createObjectURL').and.returnValue('blob:prueba');
    expect(await servicio.descargar()).toEqual({ tenantId: config.tenantId, identificadorEstacion: config.identificadorEstacion });
    const peticion = manifest.calls.first().args[0] as HttpRequest<unknown>;
    expect(peticion.url).toBe('/assets/caja-windows/manifiesto.json');
    expect(peticion.headers.keys()).toEqual([]);
    const contenido = await (objeto.calls.first().args[0] as Blob).text();
    expect(nombreInstalador).toMatch(/\.cmd$/);
    expect(contenido).not.toContain(token);
    expect(contenido).not.toContain('privado-refresco');
    const datos = /LACOMANDA_CONFIG_INSTALACION=([A-Za-z0-9+/=]+)"/.exec(contenido)[1];
    const json = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(datos), c => c.charCodeAt(0))));
    expect(Object.keys(json).sort()).toEqual(['apiUrl', 'identificadorEstacion', 'origen', 'tenantId']);
    expect(json.tenantId).toBe(config.tenantId);
    expect(json.identificadorEstacion).toBe(config.identificadorEstacion);
    expect(json.origen).toBe(window.location.origin);
  });

  it('usa datos UTF-8 separados del código, valida el ZIP y detiene la ejecución si el manifiesto es inválido', () => {
    const cmd = generarInstaladorCaja(config, sha256);
    expect(cmd).not.toContain(config.tenantId);
    expect(cmd).not.toContain(config.identificadorEstacion);
    expect(cmd).toContain(sha256);
    expect(cmd.indexOf('Get-FileHash')).toBeLessThan(cmd.indexOf('Expand-Archive'));
    expect(cmd.indexOf('Expand-Archive')).toBeLessThan(cmd.indexOf('install.ps1'));
    expect(cmd.split('\r\n').every(linea => linea.length < 8191)).toBeTrue();
    expect(() => generarInstaladorCaja(config, sha256 + "'")).toThrow();
  });

  it('exige sesión, identificador coincidente y estación de caja en una PC Windows', () => {
    expect(servicio.identidad).toBeDefined();
    plataforma = DispositivoTipoEnum.MOVIL_ANDROID;
    expect(servicio.identidad).toBeUndefined();
    plataforma = DispositivoTipoEnum.PC_WINDOWS;
    sesion.User.TipoCompu = EstacionTipoEnum.MOZO;
    expect(servicio.identidad).toBeUndefined();
    sesion.User.TipoCompu = EstacionTipoEnum.CAJA;
    sesion.Ip = 'otra-estacion';
    expect(servicio.identidad).toBeUndefined();
    sesion = null;
    expect(servicio.identidad).toBeUndefined();
  });

  it('rechaza una estación que haya dejado de ser caja y evita iniciar la descarga', async () => {
    estaciones.getAll.and.returnValue(of({ Success: true, Data: [{ Tipo: EstacionTipoEnum.MOZO,
      IdCaja: 1, IdentificadorUnico: config.identificadorEstacion }] }));
    await expectAsync(servicio.descargar()).toBeRejectedWithError(/vinculado/);
    expect(manifest).not.toHaveBeenCalled();
  });

  it('revalida la sesión después de la respuesta del manifiesto', async () => {
    manifest.and.callFake(() => {
      sesion.TenantID = 'otro';
      return of(new HttpResponse({ body: { sha256 } }));
    });
    const blob = spyOn(URL, 'createObjectURL');
    await expectAsync(servicio.descargar()).toBeRejectedWithError(/cambiado/);
    expect(blob).not.toHaveBeenCalled();
  });
});
