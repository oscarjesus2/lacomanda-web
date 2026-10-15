import { EMPTY, of, Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { CARACTERISTICAS_LICENCIA } from 'src/app/constants/caracteristicas-licencia';
import { ProductoMantenimientoComponent } from './producto-mantenimiento.component';

describe('ProductoMantenimientoComponent - catálogos por licencia', () => {
  function crearComponente(
    habilitadas: readonly string[],
    planCodigo = 'INTEGRAL',
  ) {
    const respuestaVacia = of({ Success: true, Data: [] });
    const productoService = {
      crear: jasmine.createSpy().and.returnValue(EMPTY),
      actualizar: jasmine.createSpy().and.returnValue(EMPTY),
      getAllProductos: jasmine.createSpy().and.returnValue(respuestaVacia),
      obtenerImagen: jasmine.createSpy().and.returnValue(of(new Blob())),
      guardarImagen: jasmine.createSpy().and.returnValue(of({
        Success: true,
        Data: true,
      })),
      eliminarImagen: jasmine.createSpy().and.returnValue(of({
        Success: true,
        Data: true,
      })),
    };
    const claseComboService = {
      getSeccionMenu: jasmine.createSpy().and.returnValue(respuestaVacia),
    };
    const areaImpresionService = {
      listar: jasmine.createSpy().and.returnValue(of([])),
    };
    const proveedorService = {
      listar: jasmine.createSpy().and.returnValue(respuestaVacia),
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
      proveedorService as any,
    );

    return {
      componente,
      productoService,
      claseComboService,
      areaImpresionService,
      proveedorService,
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
    expect(dependencias.proveedorService.listar).not.toHaveBeenCalled();
    expect(dependencias.componente.operacionCajaHabilitada).toBeFalse();
    expect(dependencias.componente.productosMenusHabilitados).toBeFalse();
    expect(dependencias.componente.modoComercio).toBeTrue();
    expect(dependencias.componente.mostrarDescripcionCarta).toBeFalse();
    expect(dependencias.componente.mostrarFotoCartaDigital).toBeFalse();
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

    const productoConImagen = {
      IdProducto: 15,
      TieneImagen: true,
      PresentacionesCompra: [],
      ProductoAreaImpresion: [],
    } as any;
    dependencias.componente.onEdit(productoConImagen);
    expect(dependencias.productoService.obtenerImagen).not.toHaveBeenCalled();

    dependencias.componente.imagenSeleccionada = new File(
      ['imagen'],
      'producto.png',
      { type: 'image/png' },
    );
    (dependencias.componente as any).guardarImagenSiCorresponde(15, true);
    expect(dependencias.productoService.guardarImagen).not.toHaveBeenCalled();
    expect(dependencias.productoService.eliminarImagen).not.toHaveBeenCalled();

    const input = document.createElement('input');
    input.type = 'file';
    dependencias.componente.seleccionarImagen({ target: input } as any);
    expect(dependencias.componente.imagenSeleccionada).toBeUndefined();

    dependencias.componente.imagenSeleccionada = new File(
      ['otra imagen'],
      'otra.png',
      { type: 'image/png' },
    );
    dependencias.componente.eliminarImagenPendiente = true;
    dependencias.componente.quitarImagen();
    expect(dependencias.componente.imagenSeleccionada).toBeUndefined();
    expect(dependencias.componente.eliminarImagenPendiente).toBeFalse();
  });

  it('no consulta proveedores al abrir el mantenimiento ni sin Compras', () => {
    const dependencias = crearComponente([
      CARACTERISTICAS_LICENCIA.AlmacenGestion,
    ]);

    dependencias.componente.ngOnInit();
    dependencias.componente.p.ControlDirectoStock = true;
    dependencias.componente.toggleConfiguracionAvanzada();

    expect(dependencias.proveedorService.listar).not.toHaveBeenCalled();
    expect(dependencias.componente.comprasHabilitadas).toBeFalse();
  });

  it('carga proveedores una sola vez al abrir compras avanzadas', () => {
    const dependencias = crearComponente([
      CARACTERISTICAS_LICENCIA.AlmacenGestion,
      CARACTERISTICAS_LICENCIA.AlmacenCompras,
    ]);
    dependencias.proveedorService.listar.and.returnValue(of({
      Success: true,
      Data: [
        { IdProveedor: 1, RazonSocial: 'Activo', Activo: true },
        { IdProveedor: 2, RazonSocial: 'Inactivo', Activo: false },
      ],
    }));

    dependencias.componente.ngOnInit();
    expect(dependencias.proveedorService.listar).not.toHaveBeenCalled();

    dependencias.componente.p.ControlDirectoStock = true;
    dependencias.componente.toggleConfiguracionAvanzada();
    dependencias.componente.toggleConfiguracionAvanzada();
    dependencias.componente.toggleConfiguracionAvanzada();

    expect(dependencias.proveedorService.listar).toHaveBeenCalledTimes(1);
    expect(dependencias.componente.proveedores.map(p => p.IdProveedor))
      .toEqual([1]);
  });

  it('carga áreas y secciones cuando ambas características están incluidas', () => {
    spyOn(URL, 'createObjectURL').and.returnValue('blob:producto');
    spyOn(URL, 'revokeObjectURL');
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
    expect(dependencias.componente.mostrarFotoCartaDigital).toBeTrue();

    dependencias.componente.p.DescripcionCarta = 'Texto para la carta';
    const payload = (dependencias.componente as any).construirPayload();
    expect(payload.DescripcionCarta).toBe('Texto para la carta');

    dependencias.componente.onEdit({
      IdProducto: 25,
      TieneImagen: true,
      PresentacionesCompra: [],
      ProductoAreaImpresion: [],
    } as any);
    expect(dependencias.productoService.obtenerImagen).toHaveBeenCalledWith(25);
    expect(dependencias.componente.imagenPrevisualizacion)
      .toBe('blob:producto');

    dependencias.componente.onEdit({
      IdProducto: 26,
      TieneImagen: false,
      PresentacionesCompra: [],
      ProductoAreaImpresion: [],
    } as any);
    expect(dependencias.productoService.obtenerImagen)
      .not.toHaveBeenCalledWith(26);

    const imagenPendiente = new Subject<Blob>();
    dependencias.productoService.obtenerImagen
      .and.returnValue(imagenPendiente.asObservable());
    dependencias.componente.onEdit({
      IdProducto: 27,
      TieneImagen: true,
      PresentacionesCompra: [],
      ProductoAreaImpresion: [],
    } as any);
    dependencias.componente.modoComercio = true;
    imagenPendiente.next(new Blob());
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    dependencias.componente.modoComercio = false;

    const archivo = new File(
      ['imagen'],
      'producto.png',
      { type: 'image/png' },
    );
    const transfer = new DataTransfer();
    transfer.items.add(archivo);
    const input = document.createElement('input');
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: transfer.files });
    dependencias.componente.seleccionarImagen({ target: input } as any);
    expect(dependencias.componente.imagenSeleccionada).toBe(archivo);

    (dependencias.componente as any).guardarImagenSiCorresponde(25, true);
    expect(dependencias.productoService.guardarImagen)
      .toHaveBeenCalledWith(25, archivo);

    dependencias.componente.p.IdProducto = 25;
    dependencias.componente.p.TieneImagen = true;
    dependencias.componente.quitarImagen();
    expect(dependencias.componente.eliminarImagenPendiente).toBeTrue();
    (dependencias.componente as any).guardarImagenSiCorresponde(25, true);
    expect(dependencias.productoService.eliminarImagen).toHaveBeenCalledWith(25);
  });

  it('una opción de menú nace exclusiva y Carta conserva venta individual', () => {
    const { componente } = crearComponente([
      CARACTERISTICAS_LICENCIA.ProductosMenus,
    ]);

    componente.p.Tipo = 1;
    componente.p.IdClaseCombo = 4;
    componente.p.VentaIndividual = true;
    componente.cambiarSeccionMenu();

    expect(componente.p.VentaIndividual).toBeFalse();
    componente.p.Precio = 8;
    componente.p.SinPrecio = true;
    componente.p.PrecioMinimo = 3;
    componente.p.VentaIndividual = false;
    componente.cambiarVentaIndividual();

    expect(componente.p.Visible).toBeTrue();
    expect(componente.p.Precio).toBe(0);
    expect(componente.p.SinPrecio).toBeFalse();
    expect(componente.p.PrecioMinimo).toBe(0);

    componente.p.Tipo = 0;
    componente.cambiarTipoProducto();
    expect(componente.p.IdClaseCombo).toBe(0);
    expect(componente.p.VentaIndividual).toBeTrue();
  });

  describe('precio de venta', () => {
    beforeEach(() => { spyOn(Swal, 'fire'); });

    function crearProducto(tipo = 3, idProducto = 0) {
      const contexto = crearComponente([]);
      Object.assign(contexto.componente.p, {
        IdProducto: idProducto, NombreCorto: 'Ginger ale para combinado',
        NombreCompleto: 'Ginger ale para combinado', Tipo: tipo,
        Precio: 0, SinPrecio: false, PrecioMinimo: 0,
        Posicion: 1, PosicionComplemento: 1, FactorComplemento: 20,
        Qty: 1, IdClaseCombo: 0, VentaIndividual: true,
      });
      contexto.componente.productoForm = { invalid: false, controls: {} } as any;
      (contexto.componente as any).configuracionAvanzadaHabilitada = true;
      return contexto;
    }

    for (const tipo of [0, 1, 2, 3]) {
      for (const id of [0, 42]) {
        it(`impide ${id ? 'editar' : 'crear'} tipo ${tipo} con cero y Sin precio en No`, () => {
          const { componente, productoService } = crearProducto(tipo, id);
          expect(componente.requierePrecioPositivo()).toBeTrue();
          componente.onSubmit();
          expect(Swal.fire).toHaveBeenCalledWith('Validación',
            'El precio debe ser mayor que cero cuando «Sin precio» está en «No».', 'info');
          expect(productoService.crear).not.toHaveBeenCalled();
          expect(productoService.actualizar).not.toHaveBeenCalled();
        });
      }
    }

    for (const precio of [null, undefined, -1, NaN, Infinity]) {
      it(`rechaza el precio inválido ${precio} antes de enviar al servidor`, () => {
        const { componente, productoService } = crearProducto();
        componente.p.Precio = precio as number;
        componente.onSubmit();
        expect(productoService.crear).not.toHaveBeenCalled();
        expect(Swal.fire).toHaveBeenCalled();
      });
    }

    for (const id of [0, 42]) {
      it(`permite ${id ? 'editar' : 'crear'} complemento con precio positivo`, () => {
        const { componente, productoService } = crearProducto(3, id);
        componente.p.Precio = 0.01;
        componente.onSubmit();
        expect(id ? productoService.actualizar : productoService.crear)
          .toHaveBeenCalledWith(jasmine.objectContaining({ Precio: 0.01, SinPrecio: false }));
        expect(Swal.fire).not.toHaveBeenCalled();
      });
    }

    it('permite precio abierto con mínimo y revalida al volver Sin precio a No', () => {
      const { componente, productoService } = crearProducto();
      componente.p.SinPrecio = true;
      componente.p.PrecioMinimo = 1;
      expect(componente.requierePrecioPositivo()).toBeFalse();
      componente.onSubmit();
      expect(productoService.crear).toHaveBeenCalledTimes(1);

      componente.p.SinPrecio = false;
      expect(componente.requierePrecioPositivo()).toBeTrue();
      componente.onSubmit();
      expect(productoService.crear).toHaveBeenCalledTimes(1);
      expect(Swal.fire).toHaveBeenCalled();
    });

    it('conserva el precio incluido para opciones exclusivas de menú', () => {
      const { componente, productoService } = crearProducto(1);
      componente.p.IdClaseCombo = 2;
      componente.p.VentaIndividual = false;
      expect(componente.requierePrecioPositivo()).toBeFalse();
      componente.onSubmit();
      expect(productoService.crear).toHaveBeenCalledWith(jasmine.objectContaining({ Precio: 0, VentaIndividual: false }));
      expect(Swal.fire).not.toHaveBeenCalled();
    });

    it('sigue exigiendo precio para opciones de menú vendidas individualmente', () => {
      const { componente, productoService } = crearProducto(1);
      componente.p.IdClaseCombo = 2;
      expect(componente.requierePrecioPositivo()).toBeTrue();
      componente.onSubmit();
      expect(productoService.crear).not.toHaveBeenCalled();
    });
  });
});
