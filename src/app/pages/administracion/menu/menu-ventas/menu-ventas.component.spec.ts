import {
  CARACTERISTICAS_LICENCIA as C,
  expandirExigencia,
} from 'src/app/constants/caracteristicas-licencia';
import { MenuVentasComponent } from './menu-ventas.component';

describe('MenuVentasComponent por licencia', () => {
  function crear(
    habilitadas: string[],
    planCodigo = 'INTEGRAL',
  ): MenuVentasComponent {
    const licencia = {
      evaluar: (estado: any, exigencia: any) =>
        expandirExigencia(exigencia).every(codigo =>
          estado.habilitadas.has(codigo),
        ),
    };

    const component = new MenuVentasComponent(
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      null as any,
      licencia as any,
      null as any,
      null as any,
    );

    (component as any).estadoLicencia = {
      licencia: { PlanCodigo: planCodigo },
      sinSuscripcion: false,
      error: false,
      habilitadas: new Set(habilitadas),
    };
    return component;
  }

  function etiquetasReportes(component: MenuVentasComponent): string[] {
    const seccion = component.ventasMenu.find(x => x.title === 'Reportes')!;
    return component.itemsVisibles(seccion).map(x => x.label);
  }

  it('en Inicio conserva reportes básicos y oculta los análisis avanzados', () => {
    const etiquetas = etiquetasReportes(crear([C.OperacionReportes]));

    expect(etiquetas).toContain('Ventas por producto');
    expect(etiquetas).toContain('Resumen de ventas');
    expect(etiquetas).toContain('Resumen de documentos');
    expect(etiquetas).toContain('Contable');
    expect(etiquetas).not.toContain('Productividad');
    expect(etiquetas).not.toContain('Espacios y servicio');
    expect(etiquetas).not.toContain('Sin rotación');
    expect(etiquetas).not.toContain('Descuentos');
    expect(etiquetas).not.toContain('Recurrencia');
    expect(etiquetas).not.toContain('Incidencias');
    expect(etiquetas).not.toContain('Calidad docs.');
  });

  it('muestra los análisis avanzados cuando la licencia los incluye', () => {
    const etiquetas = etiquetasReportes(
      crear([C.OperacionReportes, C.ReportesAnaliticos]),
    );

    expect(etiquetas).toContain('Productividad');
    expect(etiquetas).toContain('Espacios y servicio');
    expect(etiquetas).toContain('Calidad docs.');
  });

  it('muestra al Gerente todas las opciones de administración habilitadas por licencia', () => {
    const component = crear([
      C.OperacionReportes,
      C.ReportesAnaliticos,
      C.OperacionCaja,
      C.VentasDirecta,
    ]);

    const visibles = component.seccionesVisibles
      .flatMap(section => component.itemsVisibles(section))
      .map(item => item.label);

    expect(visibles).toContain('Usuarios');
    expect(visibles).toContain('Productos');
    expect(visibles).toContain('Clientes');
    expect(visibles).toContain('Contable');
    expect(visibles.length).toBeGreaterThan(1);
  });

  it('reserva las tres herramientas internas al usuario de soporte', () => {
    const component = crear([
      C.OperacionComprobantes,
      C.VentasMesa,
      C.VentasPagoCuentaOnline,
    ]);
    (component as any).paisISO2 = 'PE';
    const configuracion = component.ventasMenu.find(
      section => section.title === 'Configuracion',
    )!;

    const sinSoporte = component.itemsVisibles(configuracion)
      .map(item => item.label);
    expect(sinSoporte).not.toContain('Facturación electrónica');
    expect(sinSoporte).not.toContain('Monitor SUNAT');
    expect(sinSoporte).not.toContain('Cobro móvil');

    (component as any).esUsuarioSoporteLaComanda = true;
    const conSoporte = component.itemsVisibles(configuracion)
      .map(item => item.label);
    expect(conSoporte).toContain('Facturación electrónica');
    expect(conSoporte).toContain('Monitor SUNAT');
    expect(conSoporte).toContain('Cobro móvil');
  });

  it('muestra el monitor AEAT únicamente para soporte en España', () => {
    const component = crear([C.OperacionComprobantes]);
    (component as any).paisISO2 = 'ES';
    const configuracion = component.ventasMenu.find(
      section => section.title === 'Configuracion',
    )!;

    const sinSoporte = component.itemsVisibles(configuracion)
      .map(item => item.label);
    expect(sinSoporte).not.toContain('Monitor AEAT');

    (component as any).esUsuarioSoporteLaComanda = true;
    const conSoporte = component.itemsVisibles(configuracion)
      .map(item => item.label);
    expect(conSoporte).toContain('Sistema fiscal AEAT');
    expect(conSoporte).toContain('Monitor AEAT');
    expect(conSoporte).not.toContain('Monitor SUNAT');
  });

  it('en Comercio muestra caja y turnos sin opciones propias de restaurante', () => {
    const component = crear(
      [C.OperacionCaja, C.VentasDirecta],
      'COMERCIO',
    );

    const visibles = component.seccionesVisibles
      .flatMap(section => component.itemsVisibles(section))
      .map(item => item.label);

    expect(visibles).toContain('Caja');
    expect(visibles).toContain('Abrir turno');
    expect(visibles).toContain('Cerrar turno');
    expect(visibles).not.toContain('Áreas de impresión');
    expect(visibles).not.toContain('Estación');
    expect(visibles).not.toContain('Esta estación');
  });

  it('usa un icono genérico para Productos', () => {
    const component = crear([C.VentasDirecta]);
    const maestros = component.ventasMenu.find(
      section => section.title === 'Maestros',
    )!;
    const productos = (maestros.children as any[]).find(
      item => item.title === 'Productos',
    );

    expect(productos?.icon).toBe('sell');
  });
});
