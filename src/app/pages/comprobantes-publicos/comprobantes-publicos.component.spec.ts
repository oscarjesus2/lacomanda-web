import { of } from 'rxjs';
import { ComprobantesPublicosComponent } from './comprobantes-publicos.component';

describe('ComprobantesPublicosComponent', () => {
  it('carga los tipos españoles del backend sin mostrar boleta', () => {
    const service = jasmine.createSpyObj('ComprobantesPublicosService', [
      'listarSucursales',
      'seleccionarSucursal',
      'obtenerConfiguracion'
    ]);
    service.listarSucursales.and.returnValue(of({
      Success: true,
      Message: 'Sucursales disponibles.',
      Data: [{ TenantId: 'Y9383590H', Nombre: 'Burjassot' }]
    }));
    service.obtenerConfiguracion.and.returnValue(of({
      Success: true,
      Message: 'Configuración disponible.',
      Data: {
        PaisISO2: 'ES',
        TiposDocumento: [
          { IdTipoDocumento: 1, Descripcion: 'Factura' },
          { IdTipoDocumento: 5, Descripcion: 'Factura simplificada' },
          { IdTipoDocumento: 6, Descripcion: 'Factura rectificativa' }
        ],
        TiposIdentidad: ['DNI', 'NIE', 'NIF', 'PAS']
      }
    }));
    const header = jasmine.createSpyObj('HeaderService', ['hideHeader', 'showHeader']);
    const route = {
      snapshot: { queryParamMap: { get: () => 'Y9383590H' } }
    };
    const component = new ComprobantesPublicosComponent(
      service,
      header,
      route as any
    );

    component.ngOnInit();

    expect(component.paisISO2).toBe('ES');
    expect(component.tiposDocumento.map(item => item.Descripcion)).toEqual([
      'Factura',
      'Factura simplificada',
      'Factura rectificativa'
    ]);
    expect(component.tiposDocumento.some(item => item.Descripcion === 'Boleta')).toBeFalse();
    expect(component.tipoDocumento).toBe(1);
    expect(component.documentoClientePlaceholder).toBe('DNI / NIE / NIF / PAS');
  });

  it('no permite consultar hasta seleccionar un tipo del catálogo', () => {
    const component = Object.create(ComprobantesPublicosComponent.prototype);
    component.tenantId = 'tenant-es';
    component.tipoDocumento = null;
    component.serie = 'SERIE';
    component.numero = 10;
    component.numeroIdentificacion = '12345678Z';
    component.fechaEmision = '2026-09-20';
    component.total = 15;

    expect(component.formularioValido()).toBeFalse();
  });
});
