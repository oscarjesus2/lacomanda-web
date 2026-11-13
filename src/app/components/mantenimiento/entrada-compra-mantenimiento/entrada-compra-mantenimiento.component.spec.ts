import * as moment from 'moment';
import { EMPTY } from 'rxjs';
import { EntradaCompraMantenimientoComponent } from './entrada-compra-mantenimiento.component';

describe('EntradaCompraMantenimientoComponent: recepción', () => {
  it('guarda la fecha y hora seleccionadas como un instante', () => {
    const compras = jasmine.createSpyObj('EntradaCompraService', ['crear']);
    compras.crear.and.returnValue(EMPTY);
    const componente = new EntradaCompraMantenimientoComponent(
      {} as any, compras, {} as any, {} as any, {} as any
    );
    spyOn<any>(componente, 'formularioValido').and.returnValue(true);
    componente.formulario.FechaEmision = '2026-10-23';
    componente.formulario.FechaRecepcion = moment('2026-10-23', 'YYYY-MM-DD') as any;
    componente.horaRecepcion = '16:35:12';

    componente.guardar();

    const dto = compras.crear.calls.mostRecent().args[0];
    expect(dto.FechaEmision).toBe('2026-10-23');
    expect(dto.FechaRecepcion.toISOString()).toBe(new Date(2026, 9, 23, 16, 35, 12).toISOString());
  });

  it('recupera la hora local guardada al abrir un documento', () => {
    const componente = new EntradaCompraMantenimientoComponent(
      {} as any, {} as any, {} as any, {} as any, {} as any
    );
    const recepcion = new Date(2026, 9, 23, 16, 35, 12);

    (componente as any).cargarFormulario({
      FechaEmision: '2026-10-23', FechaRecepcion: recepcion.toISOString(),
      Detalles: [],
    });

    expect(componente.horaRecepcion).toBe('16:35:12');
    expect((componente.formulario.FechaRecepcion as Date).toISOString()).toBe(recepcion.toISOString());
  });

  it('conserva el instante original si no se modifica la recepción', () => {
    const compras = jasmine.createSpyObj('EntradaCompraService', ['actualizar']);
    compras.actualizar.and.returnValue(EMPTY);
    const componente = new EntradaCompraMantenimientoComponent(
      {} as any, compras, {} as any, {} as any, {} as any
    );
    spyOn<any>(componente, 'formularioValido').and.returnValue(true);
    const recepcion = new Date(2026, 9, 23, 16, 35, 12, 123);
    (componente as any).cargarFormulario({
      IdEntrada: 3, FechaEmision: '2026-10-23', FechaRecepcion: recepcion.toISOString(),
      Detalles: [],
    });

    componente.guardar();

    const dto = compras.actualizar.calls.mostRecent().args[1];
    expect(dto.FechaRecepcion.toISOString()).toBe(recepcion.toISOString());
  });
});
