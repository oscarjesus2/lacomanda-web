import { NEVER, of } from 'rxjs';

import { CajaMantenimientoComponent } from './caja-mantenimiento.component';

describe('CajaMantenimientoComponent - licencia Comercio', () => {
  function crear(planCodigo = 'COMERCIO') {
    const service = {
      getAllCaja: jasmine.createSpy('getAllCaja').and.returnValue(of({
        Success: true,
        Data: [],
      })),
      getCanalesVentaByCaja: jasmine.createSpy('getCanalesVentaByCaja')
        .and.returnValue(of([])),
      crear: jasmine.createSpy('crear').and.returnValue(of({ Success: true })),
      actualizar: jasmine.createSpy('actualizar').and.returnValue(of({ Success: true })),
    };
    const canalSrv = {
      listarDisponibles: jasmine.createSpy('listarDisponibles').and.returnValue(of([])),
    };
    const component = new CajaMantenimientoComponent(
      service as any,
      { close: jasmine.createSpy('close') } as any,
      canalSrv as any,
      { open: jasmine.createSpy('open') } as any,
      {
        obtenerEstado: () => of({
          licencia: { PlanCodigo: planCodigo },
          sinSuscripcion: false,
          error: false,
          habilitadas: new Set<string>(),
        }),
      } as any,
    );

    return { component, service, canalSrv };
  }

  it('oculta la columna de canal y no solicita su catálogo para Comercio', () => {
    const { component, canalSrv } = crear();

    component.ngOnInit();

    expect(component.modoComercio).toBeTrue();
    expect(component.displayedColumns).not.toContain('canal');
    expect(canalSrv.listarDisponibles).not.toHaveBeenCalled();
  });

  it('mantiene el comportamiento completo para otra licencia', () => {
    const { component, canalSrv } = crear('INTEGRAL');

    component.ngOnInit();

    expect(component.modoComercio).toBeFalse();
    expect(component.displayedColumns).toContain('canal');
    expect(canalSrv.listarDisponibles).toHaveBeenCalledTimes(1);
  });

  it('desactiva internamente las opciones propias del restaurante al crear', () => {
    const { component } = crear();
    component.ngOnInit();

    component.nuevo();

    expect(component.m.EmitePrecuenta).toBeFalse();
    expect(component.m.EmiteComanda).toBeFalse();
    expect(component.m.PermiteDividirPedido).toBeFalse();
    expect(component.m.PrecuentaLlevarDeliveryAutomatica).toBeFalse();
    expect(component.m.PermitirPagoTaxistas).toBeFalse();
    expect(component.m.Activo).toBeTrue();
  });

  it('no consulta ni modifica canales al editar una caja de Comercio', () => {
    const { component, service } = crear();
    component.ngOnInit();
    const caja = {
      IdCaja: 7,
      Descripcion: 'Venta administración',
      Activo: true,
      IdCanalVentaDefecto: 1,
      IdCanalesVenta: [1],
      EmitePrecuenta: true,
      EmiteComanda: true,
      EmiteDescuento: true,
      PermiteDividirPedido: true,
      PermiteCierreParcial: true,
      EnvioElectronicoOnline: true,
      PrecuentaLlevarDeliveryAutomatica: true,
      PermitirPagoTaxistas: true,
    } as any;

    component.onEdit(caja);

    expect(service.getCanalesVentaByCaja).not.toHaveBeenCalled();
    expect(component.m.IdCanalVentaDefecto).toBe(1);
    expect(component.m.IdCanalesVenta).toEqual([1]);
    expect(component.m.EmitePrecuenta).toBeFalse();
    expect(component.m.EmiteComanda).toBeFalse();
  });

  it('al guardar Comercio conserva los canales y normaliza los campos ocultos', () => {
    const { component, service } = crear();
    component.ngOnInit();
    component.nuevo();
    component.form = { invalid: false } as any;
    component.m.IdCanalesVenta = [99];
    component.m.EmiteComanda = true;
    service.crear.and.returnValue(NEVER);

    component.onSubmit();

    expect(component.m.IdCanalesVenta).toEqual([99]);
    expect(component.m.EmiteComanda).toBeFalse();
    expect(service.crear).toHaveBeenCalledWith(component.m);
  });

  it('al guardar otra licencia actualiza los canales seleccionados', () => {
    const { component, service } = crear('INTEGRAL');
    component.ngOnInit();
    component.nuevo();
    component.form = { invalid: false } as any;
    component.canalesSeleccionados = [2, 4];
    service.crear.and.returnValue(NEVER);

    component.onSubmit();

    expect(component.m.IdCanalesVenta).toEqual([2, 4]);
    expect(service.crear).toHaveBeenCalledWith(component.m);
  });
});
