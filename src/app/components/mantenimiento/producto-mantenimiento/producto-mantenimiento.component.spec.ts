import { of } from 'rxjs';
import { CARACTERISTICAS_LICENCIA } from 'src/app/constants/caracteristicas-licencia';
import { ProductoMantenimientoComponent } from './producto-mantenimiento.component';

describe('ProductoMantenimientoComponent - catálogos por licencia', () => {
  function crearComponente(
    habilitadas: readonly string[],
    planCodigo = 'INTEGRAL',
  ) {
    const respuestaVacia = of({ Success: true, Data: [] });
    const productoService = {
      getAllProductos: jasmine.createSpy().and.returnValue(respuestaVacia),
    };
    const claseComboService = {
      getSeccionMenu: jasmine.createSpy().and.returnValue(respuestaVacia),
    };
    const areaImpresionService = {
      listar: jasmine.createSpy().and.returnValue(of([])),
    };
    const licenciaTenantService = {
      invalidar: jasmine.createSpy(),
      obtenerEstado: jasmine.createSpy().and.returnValue(of({
        licencia: { PlanCodigo: planCodigo, Caracteristicas: [] },
        sinSuscripcion: false,
        error: false,
        habilitadas: new Set(habilitadas),
      })),
      evaluar: jasmine.createSpy().and.callFake(
        (estado: any, codigo: string) => estado.habilitadas.has(codigo),
      ),
      tieneCaracteristica: jasmine.createSpy().and.callFake(
        (codigo: string) => of(habilitadas.includes(codigo)),
      ),
    };

    const componente = new ProductoMantenimientoComponent(
      {} as any,
      {} as any,
      productoService as any,
      { getFamilias: () => respuestaVacia } as any,
      { getColores: () => respuestaVacia } as any,
      { getMoneda: () => respuestaVacia } as any,
      claseComboService as any,
      { getGrupos: () => respuestaVacia } as any,
      { getImpuestoPais: () => respuestaVacia } as any,
      { show: jasmine.createSpy(), hide: jasmine.createSpy() } as any,
      areaImpresionService as any,
      { get: () => of({}) } as any,
      { listar: () => respuestaVacia } as any,
      {} as any,
      licenciaTenantService as any,
      {} as any,
      { listarActivas: () => respuestaVacia } as any,
      { listar: () => respuestaVacia } as any,
      { listar: () => respuestaVacia } as any,
    );

    return {
      componente,
      productoService,
      claseComboService,
      areaImpresionService,
    };
  }

  it('no consulta catálogos de restaurante para la licencia Comercio', () => {
    const dependencias = crearComponente([
      CARACTERISTICAS_LICENCIA.AlmacenGestion,
      CARACTERISTICAS_LICENCIA.OperacionCaja,
      CARACTERISTICAS_LICENCIA.VentasDirecta,
    ], 'COMERCIO');

    dependencias.componente.ngOnInit();

    expect(dependencias.productoService.getAllProductos).toHaveBeenCalled();
    expect(dependencias.areaImpresionService.listar).not.toHaveBeenCalled();
    expect(dependencias.claseComboService.getSeccionMenu).not.toHaveBeenCalled();
    expect(dependencias.componente.operacionCajaHabilitada).toBeFalse();
    expect(dependencias.componente.productosMenusHabilitados).toBeFalse();
    expect(dependencias.componente.modoComercio).toBeTrue();
    expect(dependencias.componente.mostrarDescripcionCarta).toBeFalse();
    expect(dependencias.componente.displayedColumns).not.toContain('tipo');
    expect(dependencias.componente.displayedColumns).not.toContain('posicion');

    dependencias.componente.p.DescripcionCarta = 'Debe limpiarse';
    (dependencias.componente as any).aplicarDefaultsComercio();
    expect(dependencias.componente.p.DescripcionCarta).toBeUndefined();

    dependencias.componente.p.DescripcionCarta = 'No debe enviarse';
    const payload = (dependencias.componente as any).construirPayload();
    expect(Object.prototype.hasOwnProperty.call(
      payload,
      'DescripcionCarta',
    )).toBeFalse();
  });

  it('carga áreas y secciones cuando ambas características están incluidas', () => {
    const dependencias = crearComponente([
      CARACTERISTICAS_LICENCIA.OperacionCaja,
      CARACTERISTICAS_LICENCIA.ProductosMenus,
    ]);

    dependencias.componente.ngOnInit();

    expect(dependencias.areaImpresionService.listar).toHaveBeenCalledTimes(1);
    expect(dependencias.claseComboService.getSeccionMenu).toHaveBeenCalledTimes(1);
    expect(dependencias.componente.operacionCajaHabilitada).toBeTrue();
    expect(dependencias.componente.productosMenusHabilitados).toBeTrue();
    expect(dependencias.componente.mostrarDescripcionCarta).toBeTrue();

    dependencias.componente.p.DescripcionCarta = 'Texto para la carta';
    const payload = (dependencias.componente as any).construirPayload();
    expect(payload.DescripcionCarta).toBe('Texto para la carta');
  });
});
