import { FormBuilder } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { ConfiguracionInicialComponent } from './configuracion-inicial.component';

describe('ConfiguracionInicialComponent logo del negocio', () => {
  let component: ConfiguracionInicialComponent;
  let snack: jasmine.SpyObj<any>;
  let configuracion: jasmine.SpyObj<any>;
  let texts: jasmine.SpyObj<any>;

  beforeEach(() => {
    snack = jasmine.createSpyObj('MatSnackBar', ['open']);
    configuracion = jasmine.createSpyObj('ConfiguracionService', [
      'get',
      'save',
      'saveInitial',
      'obtenerLogo',
      'guardarLogo',
      'eliminarLogo',
    ]);
    texts = jasmine.createSpyObj('TenantTextCatalogService', ['get']);
    texts.get.and.callFake((key: string) => key);
    component = new ConfiguracionInicialComponent(
      new FormBuilder(),
      snack,
      configuracion,
      jasmine.createSpyObj('TipoIdentidadPaisService', ['byPais']),
      jasmine.createSpyObj('MonedaService', ['getMonedaPorPais']),
      jasmine.createSpyObj('LicenciaTenantService', ['obtenerEstado', 'evaluar']),
      jasmine.createSpyObj('MatDialogRef', ['close']),
      texts,
      { modoInicial: false },
    );
  });

  it('rechaza archivos que no son imágenes admitidas', () => {
    const archivo = new File(['gif'], 'logo.gif', { type: 'image/gif' });

    component.seleccionarLogo(eventoArchivo(archivo));

    expect(configuracion.guardarLogo).not.toHaveBeenCalled();
    expect(snack.open).toHaveBeenCalledWith(
      'businessLogoInvalid',
      'ok',
      jasmine.any(Object),
    );
  });

  it('guarda y muestra una vista previa del logo válido', () => {
    const archivo = new File(['png'], 'marca.png', { type: 'image/png' });
    configuracion.guardarLogo.and.returnValue(of({ Success: true }));
    spyOn(URL, 'createObjectURL').and.returnValue('blob:logo');

    component.seleccionarLogo(eventoArchivo(archivo));

    expect(configuracion.guardarLogo).toHaveBeenCalledWith(archivo);
    expect(component.logoPreviewUrl).toBe('blob:logo');
    expect(component.logoProcesando).toBeFalse();
    expect(snack.open).toHaveBeenCalledWith(
      'businessLogoSaved',
      'ok',
      jasmine.any(Object),
    );
  });

  it('recupera el estado al fallar la carga del logo', () => {
    const archivo = new File(['png'], 'marca.png', { type: 'image/png' });
    configuracion.guardarLogo.and.returnValue(throwError(() => ({
      error: { Message: 'No se pudo cargar' },
    })));

    component.seleccionarLogo(eventoArchivo(archivo));

    expect(component.logoProcesando).toBeFalse();
    expect(snack.open).toHaveBeenCalledWith(
      'No se pudo cargar',
      'ok',
      jasmine.any(Object),
    );
  });

  it('elimina el logo configurado y libera su vista previa', () => {
    component.logoPreviewUrl = 'blob:logo';
    configuracion.eliminarLogo.and.returnValue(of({ Success: true }));
    spyOn(URL, 'revokeObjectURL');

    component.eliminarLogo();

    expect(configuracion.eliminarLogo).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:logo');
    expect(component.logoPreviewUrl).toBeNull();
    expect(component.logoProcesando).toBeFalse();
  });

  function eventoArchivo(archivo: File): Event {
    return {
      target: { files: [archivo], value: 'seleccionado' },
    } as unknown as Event;
  }
});
