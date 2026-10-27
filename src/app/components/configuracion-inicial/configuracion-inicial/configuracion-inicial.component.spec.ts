import { FormBuilder } from '@angular/forms';
import { of, Subject, throwError } from 'rxjs';
import { ConfiguracionInicialComponent } from './configuracion-inicial.component';

describe('ConfiguracionInicialComponent logo del negocio', () => {
  let component: ConfiguracionInicialComponent;
  let snack: jasmine.SpyObj<any>;
  let configuracion: jasmine.SpyObj<any>;
  let texts: jasmine.SpyObj<any>;
  let dialog: jasmine.SpyObj<any>;

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
    dialog = jasmine.createSpyObj('MatDialogRef', ['close']);
    component = new ConfiguracionInicialComponent(
      new FormBuilder(),
      snack,
      configuracion,
      jasmine.createSpyObj('TipoIdentidadPaisService', ['byPais']),
      jasmine.createSpyObj('MonedaService', ['getMonedaPorPais']),
      jasmine.createSpyObj('LicenciaTenantService', ['obtenerEstado', 'evaluar']),
      dialog,
      texts,
      { modoInicial: false },
    );
  });

  for (const inicial of [true, false]) {
    it(`impide envíos repetidos mientras se guarda y permite reintentar tras un error (inicial=${inicial})`, () => {
      component.esModoInicial = inicial;
      component.formInicial.patchValue({ RazonSocial: 'Empresa', NombreComercial: 'Restaurante', Direccion: 'Calle 1', Telefono: '123456789' });
      component.form.patchValue({ PaisISO2: 'ES', IdTipoIdentidad: 'NIF', NumeroIdentificacion: '61167293N', RazonSocial: 'Empresa', NombreComercial: 'Restaurante', Direccion: 'Calle 1', Telefono: '123456789', IdMoneda: 'EUR' });
      const guardar = inicial ? configuracion.saveInitial : configuracion.save;
      const pendiente = new Subject<any>();
      guardar.and.returnValue(pendiente);

      component.guardar();
      component.guardar();

      expect(component.guardando).toBeTrue();
      expect(guardar).toHaveBeenCalledTimes(1);
      pendiente.error({ error: { Message: 'Sin conexión' } });
      expect(component.guardando).toBeFalse();
      expect(dialog.close).not.toHaveBeenCalled();
      guardar.and.returnValue(of({ IdConfig: 1 }));
      component.guardar();
      expect(guardar).toHaveBeenCalledTimes(2);
      expect(dialog.close).toHaveBeenCalledOnceWith(true);
    });
  }

  it('no bloquea el formulario ni envía si faltan datos obligatorios', () => {
    component.esModoInicial = true;

    component.guardar();

    expect(component.guardando).toBeFalse();
    expect(configuracion.saveInitial).not.toHaveBeenCalled();
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
