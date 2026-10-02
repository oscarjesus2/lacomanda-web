import { of, Subject, throwError } from 'rxjs';
import { CanalVentaEnum, PedidoEstadoEnum } from 'src/app/enums/enum';

import { VentaComponent } from './venta.component';

describe('VentaComponent - canales por estación', () => {
  function crearComponente(modoMozo: boolean): VentaComponent {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    component.isModoMozo = modoMozo;
    component.canalVentaEnum = CanalVentaEnum;
    component.idCanalVentaSelected = CanalVentaEnum.ESPACIO;
    component.idCanalVentaDefectoCaja = CanalVentaEnum.ESPACIO;
    component.listaTipoPedidos = [];
    return component;
  }

  it('oculta Entrada en la estación de mozo aunque esté configurado', () => {
    const component = crearComponente(true);
    component.listaTipoPedidos = [
      { IdCanalVenta: CanalVentaEnum.ESPACIO },
      { IdCanalVenta: CanalVentaEnum.ENTRADAS },
    ] as any;

    component.actualizarFlagsCanales();

    expect(component.isEspacio).toBeTrue();
    expect(component.isEntrada).toBeFalse();
  });

  it('mantiene Entrada visible en la estación de caja', () => {
    const component = crearComponente(false);
    component.listaTipoPedidos = [
      { IdCanalVenta: CanalVentaEnum.ENTRADAS },
    ] as any;
    component.idCanalVentaSelected = CanalVentaEnum.ENTRADAS;

    component.actualizarFlagsCanales();

    expect(component.isEntrada).toBeTrue();
  });

  it('no selecciona Entrada como canal predeterminado en modo mozo', () => {
    const component = crearComponente(true);
    component.listaTipoPedidos = [
      { IdCanalVenta: CanalVentaEnum.ENTRADAS },
      { IdCanalVenta: CanalVentaEnum.DELIVERY },
    ] as any;
    component.idCanalVentaDefectoCaja = CanalVentaEnum.ENTRADAS;
    const seleccionarCanal = spyOn(component, 'canalVenta');

    component.actualizarFlagsCanales();

    expect(seleccionarCanal).toHaveBeenCalledOnceWith(CanalVentaEnum.DELIVERY);
  });

  it('ignora una selección directa de Entrada en modo mozo', () => {
    const component = crearComponente(true);
    const limpiarPedido = spyOn<any>(component, 'limpiarPedido');
    const abrirEntradas = spyOn(component, 'abrirEntradas');

    component.canalVenta(CanalVentaEnum.ENTRADAS);

    expect(limpiarPedido).not.toHaveBeenCalled();
    expect(abrirEntradas).not.toHaveBeenCalled();
    expect(component.idCanalVentaSelected).toBe(CanalVentaEnum.ESPACIO);
  });
});

describe('VentaComponent - posiciones del tablero de espacios', () => {
  it('distingue mesas unidas, divididas, ocupadas y con precuenta usando su estado real', () => {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    const casos = [
      { ocupado: 0, precuenta: false, estado: 'free', etiqueta: 'Libre' },
      { ocupado: 1, precuenta: false, estado: 'busy', etiqueta: 'En uso' },
      { ocupado: 1, precuenta: true, estado: 'prebill', etiqueta: 'Precuenta' },
      { ocupado: 2, precuenta: false, estado: 'free', etiqueta: 'Libre' },
      { ocupado: 3, precuenta: false, estado: 'split', etiqueta: 'Dividida' },
      { ocupado: 4, precuenta: false, estado: 'joined', etiqueta: 'Unida' },
    ];

    for (const caso of casos) {
      const espacio = { Ocupado: caso.ocupado, TienePrecuenta: caso.precuenta } as any;
      expect(component.estadoTableroEspacio(espacio)).toBe(caso.estado);
      expect(component.etiquetaEstadoTableroEspacio(espacio)).toBe(caso.etiqueta);
    }
  });

  it('respeta la matriz de siete columnas usada en el mantenimiento', () => {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;

    expect(component.posicionEnTablero(1)).toBe('1 / 1');
    expect(component.posicionEnTablero(7)).toBe('1 / 7');
    expect(component.posicionEnTablero(8)).toBe('2 / 1');
    expect(component.posicionEnTablero(63)).toBe('9 / 7');
    expect(component.posicionEnTablero(0)).toBeNull();
    expect(component.posicionEnTablero(64)).toBeNull();
  });

  it('cuenta las mesas reales y no las casillas vacías del ambiente', () => {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    component.listaEspacios_x_Ambiente = [
      { Numero: 1, Visible: true },
      { Numero: 2 },
      { Numero: 0, Visible: false },
      { Numero: 3, Visible: false },
    ] as any;

    expect(component.cantidadEspaciosTablero).toBe(2);
  });
});

describe('VentaComponent - pedidos pendientes de cobro', () => {
  function pedido(estado: PedidoEstadoEnum, id = 1): any {
    return {
      IdPedido: id,
      NroCuenta: 1,
      IdEspacio: 8,
      NroPedido: `L${id}`,
      Cliente: 'Cliente',
      IdCanalVenta: CanalVentaEnum.ESPACIO,
      Estado: estado,
      Total: 25,
      Posicion: id,
      Visible: true,
    };
  }

  it('separa únicamente los pedidos pendientes de cobro visibles', () => {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    component.listaPedidosPendientes = [
      pedido(PedidoEstadoEnum.Activo),
      pedido(PedidoEstadoEnum.PendienteCobro, 2),
      { ...pedido(PedidoEstadoEnum.PendienteCobro, 3), Visible: false },
    ];

    expect(component.pedidosPendientesCobro.map(item => item.IdPedido)).toEqual([2]);
  });

  it('un pendiente de cobro no permite operar la comanda pero sí cobrarla', () => {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    component.procesarPedido = true;
    component.idPedidoCobrar = 10;
    component.nroCuentaCobrar = 1;
    component.pedidoPendienteCobroSeleccionado = pedido(
      PedidoEstadoEnum.PendienteCobro,
      10,
    );

    expect(component.esPedidoPendienteCobro).toBeTrue();
    expect(component.puedeOperarPedidoPersistido).toBeFalse();
    expect(component.puedeCobrarPedido).toBeTrue();
  });

  it('al abrir la bandeja conserva solo los pendientes de cobro', () => {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    component.isModoMozo = false;
    component.listaPedidosPendientes = [
      pedido(PedidoEstadoEnum.Activo),
      pedido(PedidoEstadoEnum.PendienteCobro, 2),
    ];
    spyOn<any>(component, 'limpiarPedido');

    component.mostrarPedidosPendientesCobro();

    expect(component.mostrandoPendientesCobro).toBeTrue();
    expect(component.listaPedido_x_Canal.map(item => item.IdPedido)).toEqual([2]);
    expect(component.MostrarOcultarPanelEspacio).toBeTrue();
    expect(component.MostrarOcultarPanelProducto).toBeFalse();
  });

  it('muestra el tipo y número reales del espacio original', () => {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    component.listaEspaciosTotal = [
      { IdEspacio: 8, Descripcion: 'BARRA', Numero: 3 } as any,
    ];

    expect(component.nombreEspacioOriginal(pedido(PedidoEstadoEnum.PendienteCobro)))
      .toBe('BARRA 3');
  });

  it('usa el identificador como respaldo si el espacio ya no está disponible', () => {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    component.listaEspaciosTotal = [];

    expect(component.nombreEspacioOriginal(pedido(PedidoEstadoEnum.PendienteCobro)))
      .toBe('#8');
  });

  it('no expone ni abre pendientes de cobro en la estación de mozo', () => {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    component.isModoMozo = true;
    component.listaPedidosPendientes = [
      pedido(PedidoEstadoEnum.PendienteCobro),
    ];
    const limpiarPedido = spyOn<any>(component, 'limpiarPedido');

    component.mostrarPedidosPendientesCobro();

    expect(component.esEstacionCaja).toBeFalse();
    expect(component.pedidosPendientesCobro).toEqual([]);
    expect(limpiarPedido).not.toHaveBeenCalled();
    expect(component.mostrandoPendientesCobro).toBeFalsy();
  });

  it('habilita Anular pedido únicamente para una cuenta guardada', () => {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    component.idPedidoCobrar = 0;
    component.nroCuentaCobrar = 0;
    component.enviandoPedido = false;
    expect(component.isAnularPedidoDisabled).toBeTrue();

    component.idPedidoCobrar = 25;
    component.nroCuentaCobrar = 1;
    expect(component.isAnularPedidoDisabled).toBeFalse();

    component.enviandoPedido = true;
    expect(component.isAnularPedidoDisabled).toBeTrue();
  });

  it('oculta Anular pedido de caja durante el procesamiento normal', () => {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    component.idPedidoCobrar = 25;
    component.nroCuentaCobrar = 1;
    component.enviandoPedido = false;
    component.procesarPedido = false;
    component.pedidoPendienteCobroSeleccionado = null;

    expect(component.mostrarAnularPedidoCaja).toBeTrue();

    component.procesarPedido = true;
    expect(component.mostrarAnularPedidoCaja).toBeFalse();
  });

  it('mantiene Anular pedido para un pendiente de cobro', () => {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    component.idPedidoCobrar = 25;
    component.nroCuentaCobrar = 1;
    component.enviandoPedido = false;
    component.procesarPedido = true;
    component.pedidoPendienteCobroSeleccionado = pedido(
      PedidoEstadoEnum.PendienteCobro,
      25,
    );

    expect(component.mostrarAnularPedidoCaja).toBeTrue();
  });
});

describe('VentaComponent - centro de caja', () => {
  function crearComponente(): VentaComponent {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    component.isModoMozo = false;
    component.procesarPedido = false;
    component.idPedidoCobrar = 0;
    component.espacioSelected = {} as any;
    component.listaPedidosPendientes = [];
    component.canalVentaEnum = CanalVentaEnum;
    component.idCanalVentaSelected = CanalVentaEnum.ESPACIO;
    return component;
  }

  it('se muestra únicamente cuando la caja no tiene una operación seleccionada', () => {
    const component = crearComponente();

    expect(component.mostrarCentroCaja).toBeTrue();

    component.espacioSelected = { IdEspacio: 17 } as any;
    expect(component.mostrarCentroCaja).toBeFalse();

    component.isModoMozo = true;
    expect(component.mostrarCentroCaja).toBeFalse();
  });

  it('resume solo cuentas visibles que aún requieren atención', () => {
    const component = crearComponente();
    component.listaPedidosPendientes = [
      { IdCanalVenta: CanalVentaEnum.ESPACIO, Estado: PedidoEstadoEnum.Activo, Total: 100, Visible: true } as any,
      { IdCanalVenta: CanalVentaEnum.ESPACIO, Estado: PedidoEstadoEnum.PendienteCobro, Total: 35.5, Visible: true } as any,
      { IdCanalVenta: CanalVentaEnum.ESPACIO, Estado: PedidoEstadoEnum.Pagado, Total: 80, Visible: true } as any,
      { IdCanalVenta: CanalVentaEnum.ESPACIO, Estado: PedidoEstadoEnum.Activo, Total: 20, Visible: false } as any,
      { IdCanalVenta: CanalVentaEnum.DELIVERY, Estado: PedidoEstadoEnum.Activo, Total: 60, Visible: true } as any,
    ];

    expect(component.cuentasAbiertas.length).toBe(3);
    expect(component.cantidadOperacionesAbiertasCanal).toBe(2);
    expect(component.importePendienteCanal).toBe(135.5);
    expect(component.cantidadPendientesCobroCanal).toBe(1);
  });

  it('adapta la guía inicial al canal Llevar', () => {
    const component = crearComponente();
    component.idCanalVentaSelected = CanalVentaEnum.PARA_LLEVAR;

    expect(component.canalAdmitePedidosDirectos).toBeTrue();
    expect(component.iconoEstadoInicialCanal).toBe('takeout_dining');
    expect(component.etiquetaEstadoInicialCanal).toBe('takeawayReady');
    expect(component.tituloEstadoInicialCanal).toBe('selectTakeawayOrderToStart');
    expect(component.tituloCanalSinPedidos).toBe('noTakeawayOrders');
  });
});

describe('VentaComponent - acceso a reservas', () => {
  function crearComponente(publicada: boolean): VentaComponent {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    (component as any).reservasService = {
      obtenerEstadoPublicacion: () => of({ Data: publicada }),
    };
    component.reservasHabilitadas = false;
    return component;
  }

  it('oculta Reservas cuando su publicación está desactivada', () => {
    const component = crearComponente(false);

    (component as any).actualizarVisibilidadReservas(true);

    expect(component.reservasHabilitadas).toBeFalse();
  });

  it('muestra Reservas cuando la licencia y su publicación están activas', () => {
    const component = crearComponente(true);

    (component as any).actualizarVisibilidadReservas(true);

    expect(component.reservasHabilitadas).toBeTrue();
  });

  it('no consulta la configuración cuando la licencia no incluye reservas', () => {
    const component = crearComponente(true);
    const obtenerEstadoPublicacion = spyOn(
      (component as any).reservasService,
      'obtenerEstadoPublicacion',
    ).and.callThrough();

    (component as any).actualizarVisibilidadReservas(false);

    expect(obtenerEstadoPublicacion).not.toHaveBeenCalled();
    expect(component.reservasHabilitadas).toBeFalse();
  });

  it('oculta Reservas cuando el estado de publicación no está disponible', () => {
    const component = crearComponente(true);
    (component as any).reservasService.obtenerEstadoPublicacion = () =>
      throwError(() => new Error('Configuración no publicada'));

    (component as any).actualizarVisibilidadReservas(true);

    expect(component.reservasHabilitadas).toBeFalse();
  });
});

describe('VentaComponent - cambio entre mesas', () => {
  it('conserva la mesa actual hasta que el nuevo pedido termina de cargar', async () => {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    const respuesta$ = new Subject<any>();
    const limpiarPedido = spyOn<any>(component, 'limpiarPedido').and.callFake(() => undefined);
    spyOn<any>(component, 'rellenarHeaderPedido');
    spyOn<any>(component, 'getPedidoDetByResponse').and.returnValue([]);
    spyOn(component, 'actualizarDatosGrilla');

    (component as any).pedidoService = {
      FindPedidoByIdEspacio: () => respuesta$.asObservable(),
    };
    (component as any).secuenciaSeleccionPedido = 7;
    component.aplicarFiltroUnirEspacio = false;
    component.espacioSelected = { IdEspacio: 17 } as any;

    const carga = component.handleEspacioOcupada({ IdEspacio: 12 } as any, 7);

    expect(limpiarPedido).not.toHaveBeenCalled();
    expect(component.espacioSelected.IdEspacio).toBe(17);

    respuesta$.next({ Data: [{}] });
    respuesta$.complete();
    await carga;

    expect(limpiarPedido).toHaveBeenCalledTimes(1);
    expect(component.espacioSelected.IdEspacio).toBe(12);
  });
});

describe('VentaComponent - acciones de la fila seleccionada', () => {
  function crearComponente(tipo: number, complementos: any[] = []): VentaComponent {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    component.isVerComplementoDisabled = false;
    component.selectedRow = {
      Producto: { Tipo: tipo },
      PedidoComplemento: complementos,
    } as any;
    return component;
  }

  it('habilita Ver complemento solo para un producto con complementos', () => {
    const component = crearComponente(2, [{}]);

    expect(component.puedeVerComplementos).toBeTrue();

    component.selectedRow.Producto.Tipo = 0;
    expect(component.puedeVerComplementos).toBeFalse();

    component.selectedRow.Producto.Tipo = 2;
    component.selectedRow.PedidoComplemento = [];
    expect(component.puedeVerComplementos).toBeFalse();
  });

  it('respeta el bloqueo operativo aunque la fila tenga complementos', () => {
    const component = crearComponente(2, [{}]);

    component.isVerComplementoDisabled = true;

    expect(component.puedeVerComplementos).toBeFalse();
  });

  it('no abre el diálogo cuando la fila seleccionada no permite ver complementos', () => {
    const component = crearComponente(0);
    const abrirComplementos = spyOn(component, 'AgregarProductoComplemento');

    component.VerPedido();

    expect(abrirComplementos).not.toHaveBeenCalled();
  });

  it('abre el diálogo para un producto con complementos', () => {
    const component = crearComponente(2, [{}]);
    const abrirComplementos = spyOn(component, 'AgregarProductoComplemento');

    component.VerPedido();

    expect(abrirComplementos).toHaveBeenCalledOnceWith(component.selectedRow);
  });

  it('permite mostrar y volver a ocultar las acciones compactas', () => {
    const component = crearComponente(0);
    component.accionesCompactasAbiertas = false;

    component.alternarAccionesCompactas();
    expect(component.accionesCompactasAbiertas).toBeTrue();

    component.alternarAccionesCompactas();
    expect(component.accionesCompactasAbiertas).toBeFalse();
  });

  it('identifica explícitamente si una línea ya fue enviada a cocina', () => {
    const component = crearComponente(0);

    expect(component.productoEnviadoACocina({
      Item: 15,
      NumEnvios: 1,
      Producto: { Tipo: 0 },
      PedidoMenu: [],
      PedidoComplemento: [],
    } as any)).toBeTrue();
    expect(component.productoEnviadoACocina({
      Item: 15,
      NumEnvios: 0,
      Producto: { Tipo: 1, IdClaseCombo: 2 },
      PedidoMenu: [],
      PedidoComplemento: [],
    } as any)).toBeFalse();
    expect(component.productoEnviadoACocina({ Item: 0 } as any)).toBeFalse();
  });
});

describe('VentaComponent - visibilidad contextual de acciones del mozo', () => {
  function crearComponente(): VentaComponent {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    component.procesarPedido = false;
    component.enviandoPedido = false;
    component.idPedidoCobrar = 0;
    component.nroCuentaCobrar = 0;
    component.espacioSelected = {} as any;
    component.listProductGrid = [];
    component.selectedRow = null;
    component.pedidoPendienteCobroSeleccionado = null;
    component.isComboDisabled = false;
    component.isVerComplementoDisabled = false;
    component.isEnviarPedidoDisabled = false;
    component.isPrecuentaDisabled = false;
    component.isBloquearDisabled = false;
    component.precuentaHabilitada = false;
    return component;
  }

  it('no muestra acciones sin un pedido, una mesa o una fila en contexto', () => {
    const component = crearComponente();

    expect(component.mostrarEnviarPedidoMozo).toBeFalse();
    expect(component.mostrarAnularPedidoMozo).toBeFalse();
    expect(component.mostrarRehacerMozo).toBeFalse();
    expect(component.hayAccionesSecundariasMozo).toBeFalse();
  });

  it('muestra solo la acción propia del tipo de fila seleccionada', () => {
    const component = crearComponente();
    component.selectedRow = {
      Producto: { Tipo: 1 },
      PedidoComplemento: [],
    } as any;

    expect(component.mostrarMenuMozo).toBeTrue();
    expect(component.mostrarComplementosMozo).toBeFalse();

    component.selectedRow = {
      Producto: { Tipo: 2 },
      PedidoComplemento: [{}],
    } as any;

    expect(component.mostrarMenuMozo).toBeFalse();
    expect(component.mostrarComplementosMozo).toBeTrue();
  });

  it('muestra Enviar pedido únicamente al editar líneas todavía no enviadas', () => {
    const component = crearComponente();
    component.procesarPedido = true;
    component.listProductGrid = [{
      Item: 4,
      NumEnvios: 1,
      Producto: { Tipo: 0 },
      PedidoMenu: [],
      PedidoComplemento: [],
    }] as any;

    expect(component.mostrarEnviarPedidoMozo).toBeFalse();

    component.listProductGrid.push({ Item: 0 } as any);

    expect(component.mostrarEnviarPedidoMozo).toBeTrue();
  });

  it('permite reintentar una opción de menú individual que quedó sin imprimir', () => {
    const component = crearComponente();
    component.procesarPedido = true;
    component.listProductGrid = [{
      Item: 4,
      NumEnvios: 0,
      Producto: { Tipo: 1, IdClaseCombo: 2 },
      PedidoMenu: [],
      PedidoComplemento: [],
    }] as any;

    expect(component.hayProductosPendientesEnvio).toBeTrue();
    expect(component.mostrarEnviarPedidoMozo).toBeTrue();
  });

  it('muestra Anular antes de editar y lo sustituye por las acciones de edición', () => {
    const component = crearComponente();
    component.idPedidoCobrar = 7;
    component.nroCuentaCobrar = 1;
    component.espacioSelected = { IdEspacio: 17 } as any;

    expect(component.mostrarAnularPedidoMozo).toBeTrue();
    expect(component.mostrarRehacerMozo).toBeTrue();

    component.procesarPedido = true;
    component.precuentaHabilitada = true;

    expect(component.mostrarAnularPedidoMozo).toBeFalse();
    expect(component.mostrarPrecuentaMozo).toBeTrue();

    component.listProductGrid = [{ Item: 0 }] as any;
    expect(component.mostrarPrecuentaMozo).toBeFalse();
  });
});

describe('VentaComponent - contexto de acciones en caja', () => {
  function crearComponente(): VentaComponent {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    component.procesarPedido = false;
    component.idPedidoCobrar = 0;
    component.espacioSelected = {} as any;
    return component;
  }

  it('mantiene las acciones generales cuando no hay un pedido en contexto', () => {
    const component = crearComponente();

    expect(component.hayContextoPedidoActivo).toBeFalse();
  });

  it('cambia a contexto Rehacer apenas se selecciona un espacio', () => {
    const component = crearComponente();
    component.espacioSelected = { IdEspacio: 17 } as any;

    expect(component.hayContextoPedidoActivo).toBeTrue();
  });

  it('rehace la pantalla si hay un espacio seleccionado aunque aún no se procese', () => {
    const component = crearComponente();
    component.espacioSelected = { IdEspacio: 17 } as any;
    const rehacer = spyOn(component, 'RehacerPantalla');
    const salir = spyOn(component, 'salir');

    component.toggleBloquear();

    expect(rehacer).toHaveBeenCalled();
    expect(salir).not.toHaveBeenCalled();
  });
});

describe('VentaComponent - cancelación del traslado de producto', () => {
  it('lleva la vista compacta al canal de mesas al iniciar el traslado', () => {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    const producto = { Item: 1 } as any;
    component.vistaCompacta = 'pedido';
    component.espacioSelected = { IdEspacio: 17 } as any;
    component.ambienteActual = null;

    component.iniciarTraslado(producto);

    expect(component.vistaCompacta).toBe('catalogo');
    expect(component.productoParaTraslado).toBe(producto);
    expect(component.aplicarFiltroTrasladoProducto).toBeTrue();
    expect(component.MostrarOcultarPanelEspacio).toBeTrue();
    expect(component.MostrarOcultarPanelProducto).toBeFalse();
  });

  it('restaura la mesa origen sin alterar la lista maestra', async () => {
    const component = Object.create(VentaComponent.prototype) as VentaComponent;
    const ambiente = { IdAmbiente: 1, Descripcion: 'SALÓN' } as any;
    (component as any).spinnerService = {
      show: jasmine.createSpy('show'),
      hide: jasmine.createSpy('hide'),
    };
    component.espacioSelected = { IdEspacio: 17 } as any;
    component.listaEspaciosTotal = [
      {
        IdEspacio: 17,
        IdAmbiente: 1,
        Numero: 17,
        Ocupado: 1,
        Visible: true,
        Color: 'Pink',
      },
      {
        IdEspacio: 18,
        IdAmbiente: 1,
        Numero: 18,
        Ocupado: 0,
        Visible: true,
        Color: 'White',
      },
    ] as any;
    component.productoParaTraslado = { Item: 1 } as any;
    component.aplicarFiltroTrasladoProducto = true;
    component.aplicarFiltroCambioEspacio = false;
    component.aplicarFiltroUnirEspacio = false;
    component.aplicarFiltroTrasladarAEspacio = false;

    await component.MostrarEspacios_x_Ambiente(ambiente);

    expect(component.listaEspacios_x_Ambiente[0].Visible).toBeFalse();
    expect(component.listaEspaciosTotal[0].Visible).toBeTrue();

    component.cancelarTraslado();

    expect(component.aplicarFiltroTrasladoProducto).toBeFalse();
    expect(component.productoParaTraslado).toBeNull();
    expect(component.listaEspacios_x_Ambiente[0].Visible).toBeTrue();
  });
});

describe('VentaComponent - anulación de productos con aprobación', () => {
  const MI_USUARIO = 7;

  function crearComponente(puedeAprobar: boolean, dialogoDevuelve: unknown = { value: ' sin stock ' }) {
    const component = Object.create(VentaComponent.prototype) as any;
    component.puedeAprobarSolicitudes = puedeAprobar;
    component.idPedidoCobrar = 10;
    component.nroCuentaCobrar = 1;
    component.solicitudesPedido = new Map();
    component.listProductGrid = [];
    component.storageService = { getCurrentUser: () => ({ IdUsuario: MI_USUARIO }) };
    component.textCatalog = { get: (clave: string) => clave };
    component.dialog = {
      open: jasmine.createSpy('open').and.returnValue({ afterClosed: () => of(dialogoDevuelve) }),
    };
    return component;
  }

  function linea(item: number): any {
    return { Item: item, IdPedido: 10, NroCuenta: 1, Producto: { NombreCorto: 'Pisco sour' } };
  }

  function solicitud(item: number, idUsuarioSolicita: number): any {
    return { IdSolicitud: 99, IdPedido: 10, NroCuenta: 1, Item: item, IdUsuarioSolicita: idUsuarioSolicita, UsuarioSolicita: 'Ana', Motivo: 'error' };
  }

  it('sin permiso de aprobación envía una solicitud con el motivo en lugar de anular', () => {
    const component = crearComponente(false);
    const solicitar = spyOn(component, 'solicitarAnulacionProducto').and.resolveTo();
    const anular = spyOn(component, 'realizarEliminacion').and.resolveTo();

    component.deleteProductGrid(linea(3));

    expect(solicitar).toHaveBeenCalledOnceWith(jasmine.objectContaining({ Item: 3 }), 'sin stock');
    expect(anular).not.toHaveBeenCalled();
  });

  it('con permiso de aprobación anula directamente', () => {
    const component = crearComponente(true);
    const solicitar = spyOn(component, 'solicitarAnulacionProducto').and.resolveTo();
    const anular = spyOn(component, 'realizarEliminacion').and.resolveTo();

    component.deleteProductGrid(linea(3));

    expect(anular).toHaveBeenCalledOnceWith(jasmine.objectContaining({ Item: 3 }), 'sin stock');
    expect(solicitar).not.toHaveBeenCalled();
  });

  it('no hace nada si se cierra el teclado sin motivo', () => {
    const component = crearComponente(false, { value: '   ' });
    const solicitar = spyOn(component, 'solicitarAnulacionProducto').and.resolveTo();

    component.deleteProductGrid(linea(3));

    expect(solicitar).not.toHaveBeenCalled();
  });

  it('una línea con solicitud propia pendiente ofrece retirarla', () => {
    const component = crearComponente(false);
    component.solicitudesPedido.set(3, solicitud(3, MI_USUARIO));
    const cancelar = spyOn(component, 'cancelarSolicitudPendiente').and.resolveTo();

    component.deleteProductGrid(linea(3));

    expect(cancelar).toHaveBeenCalled();
    expect(component.dialog.open).not.toHaveBeenCalled();
  });

  it('un aprobador que toca una línea pendiente de otra persona la aprueba', () => {
    const component = crearComponente(true);
    component.solicitudesPedido.set(3, solicitud(3, 55));
    const aprobar = spyOn(component, 'aprobarSolicitudPendiente').and.resolveTo();

    component.deleteProductGrid(linea(3));

    expect(aprobar).toHaveBeenCalled();
    expect(component.dialog.open).not.toHaveBeenCalled();
  });

  it('solo marca como pendiente las líneas de la cuenta abierta', () => {
    const component = crearComponente(false);
    component.solicitudesPedido.set(3, solicitud(3, MI_USUARIO));

    expect(component.solicitudPendiente(linea(3))).toBeTruthy();
    expect(component.solicitudPendiente({ ...linea(3), IdPedido: 11 })).toBeUndefined();
    expect(component.solicitudPendiente(linea(0))).toBeUndefined();
  });

  it('al aprobarse la solicitud quita la línea de la grilla', () => {
    const component = crearComponente(false);
    component.listProductGrid = [linea(3), linea(4)];
    component.solicitudesPedido.set(3, solicitud(3, MI_USUARIO));
    spyOn(component, 'actualizarDatosGrilla');

    component.quitarItemAnulado(3);

    expect(component.listProductGrid.map((l: any) => l.Item)).toEqual([4]);
    expect(component.solicitudesPedido.has(3)).toBeFalse();
  });
});

describe('VentaComponent - solicitudes sobre la cuenta', () => {
  function crearComponente(solicitudes: any[]) {
    const component = Object.create(VentaComponent.prototype) as any;
    component.solicitudesCuenta = solicitudes;
    component.textCatalog = { get: (clave: string, params?: any) => params ? `${clave}:${params.user}` : clave };
    return component;
  }

  const solicitud = (tipo: string, usuario = 'Ana') => ({
    IdSolicitud: 1,
    Tipo: tipo,
    Descripcion: 'Cuenta completa',
    UsuarioSolicita: usuario,
  });

  it('encuentra la solicitud pendiente por tipo', () => {
    const component = crearComponente([solicitud('AnularPedido')]);

    expect(component.solicitudCuentaPendiente('AnularPedido')).toBeTruthy();
    expect(component.solicitudCuentaPendiente('CambiarCamarero')).toBeUndefined();
  });

  it('resume las solicitudes pendientes con quién las pidió', () => {
    const component = crearComponente([solicitud('AnularPedido'), solicitud('CambiarCamarero', 'Luis')]);

    expect(component.resumenSolicitudesCuenta).toBe(
      'Cuenta completa (requestedBy:Ana) · Cuenta completa (requestedBy:Luis)',
    );
  });

  it('solicita un motivo específico al anular el pedido completo', async () => {
    const component = crearComponente([]);
    component.espacioSelected = {
      IdEspacio: 17,
      Descripcion: 'MESA',
      Numero: 17,
    };
    component.idPedidoCobrar = 7;
    component.puedeAprobarSolicitudes = true;
    component.dialog = {
      open: jasmine.createSpy().and.returnValue({ afterClosed: () => of(undefined) }),
    };

    await component.AnularPedido();

    const configuracion = component.dialog.open.calls.mostRecent().args[1];
    expect(configuracion.data.requiredMessage).toBe('voidReasonRequired');
    expect(configuracion.data.placeholder).toBe('enterVoidReason');
    expect(configuracion.data.maxLength).toBe(120);
  });
});
