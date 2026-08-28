import {
  CARACTERISTICAS_LICENCIA as C,
  expandirExigencia,
} from 'src/app/constants/caracteristicas-licencia';
import { MenuVentasComponent } from './menu-ventas.component';

describe('MenuVentasComponent por licencia', () => {
  function crear(habilitadas: string[]): MenuVentasComponent {
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
      null as any,
      licencia as any,
      null as any,
    );

    (component as any).estadoLicencia = {
      licencia: {},
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
});
