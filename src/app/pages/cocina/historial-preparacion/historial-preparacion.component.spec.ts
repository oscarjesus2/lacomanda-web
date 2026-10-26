import { of, Subject, throwError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CocinaService } from '../../../services/cocina.service';
import { PreparacionRealtimeService } from '../../../services/preparacion-realtime.service';
import { EstadoPreparacionPedidoEnum } from '../../../enums/enum';
import { HistorialPreparacionComponent } from './historial-preparacion.component';

@Pipe({ name: 'tenantText' })
class TextoHistorialPruebaPipe implements PipeTransform {
  transform(): string { return 'Camarero'; }
}

describe('HistorialPreparacionComponent', () => {
  let servicio: jasmine.SpyObj<any>;
  let cambios: Subject<void>;
  let component: HistorialPreparacionComponent;

  beforeEach(() => {
    servicio = jasmine.createSpyObj('cocina', ['listarHistorial']);
    servicio.listarHistorial.and.returnValue(of({ Success: true, Data: [] }));
    cambios = new Subject<void>();
    component = new HistorialPreparacionComponent(servicio, { cambios$: cambios } as any, { close: () => {} } as any);
  });

  afterEach(() => component.ngOnDestroy());

  it('renderiza la lista con comanda, cliente, estado al ocultar, usuario y motivo', async () => {
    servicio.listarHistorial.and.returnValue(of({ Success: true, Data: [{
      IdPedido: 1, NroCuenta: 2, Item: 1, TipoLinea: 2, NroPedido: 8, IdCanalVenta: 2,
      Espacio: 'Mesa', NumeroEspacio: 1, Ambiente: 'Salón', Cliente: 'Oscar', Producto: 'Sopa', Cantidad: 1,
      Mozo: 'Ana', EstacionOrigen: 'Caja principal', EsFacturado: true,
      EstadoPreparacion: EstadoPreparacionPedidoEnum.Entregado,
      EstadoPreparacionAlOcultar: EstadoPreparacionPedidoEnum.Preparado, UsuarioOcultaPreparacion: 'chef01',
      MotivoOcultacionPreparacion: 3, FechaEnvioUtc: '2026-10-26T10:00:00Z',
      FechaOcultadoPreparacionUtc: '2026-10-26T10:30:00Z',
    }] }));
    await TestBed.configureTestingModule({
      declarations: [HistorialPreparacionComponent, TextoHistorialPruebaPipe],
      imports: [CommonModule, FormsModule, NoopAnimationsModule, MatFormFieldModule, MatInputModule,
        MatSelectModule, MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule],
      providers: [
        { provide: CocinaService, useValue: servicio },
        { provide: PreparacionRealtimeService, useValue: { cambios$: cambios } },
        { provide: MatDialogRef, useValue: { close: () => {} } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(HistorialPreparacionComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const texto = (fixture.nativeElement as HTMLElement).querySelector('table')!.textContent!;
    for (const dato of ['#8', 'Cuenta 2', 'Sopa', 'Oscar', 'Mesa 1', 'Ana', 'Preparado', 'chef01', 'Facturado']) {
      expect(texto).toContain(dato);
    }
    fixture.destroy();
  });

  it('convierte el intervalo de días locales a UTC e incluye el último día completo', () => {
    component.desde = '2026-10-24';
    component.hasta = '2026-10-26';

    component.cargar();

    expect(servicio.listarHistorial).toHaveBeenCalledOnceWith(
      new Date(2026, 9, 24).toISOString(), new Date(2026, 9, 27).toISOString(),
    );
  });

  it('filtra por el estado al ocultar aunque el estado actual haya cambiado', () => {
    component.dataSource.data = [{
      NroPedido: 18, Producto: 'Pizza', Cliente: 'Oscar', EstadoPreparacion: EstadoPreparacionPedidoEnum.Entregado,
      EstadoPreparacionAlOcultar: EstadoPreparacionPedidoEnum.Preparado,
    }] as any;
    component.texto = 'oscar';
    component.estado = EstadoPreparacionPedidoEnum.Preparado;
    component.filtrar();
    expect(component.dataSource.filteredData.length).toBe(1);
    expect(component.nombreEstado(component.dataSource.data[0])).toBe('Preparado');
    component.estado = EstadoPreparacionPedidoEnum.Entregado;
    component.filtrar();
    expect(component.dataSource.filteredData.length).toBe(0);
  });

  it('agrupa avisos de SignalR durante la carga y no vuelve a consultar al cerrar', () => {
    const pendiente = new Subject<any>();
    servicio.listarHistorial.and.returnValue(pendiente);
    component.ngOnInit();
    cambios.next();
    cambios.next();
    expect(servicio.listarHistorial).toHaveBeenCalledTimes(1);
    servicio.listarHistorial.and.returnValue(of({ Success: true, Data: [] }));
    pendiente.next({ Success: true, Data: [] });
    pendiente.complete();
    expect(servicio.listarHistorial).toHaveBeenCalledTimes(2);
    component.ngOnDestroy();
    cambios.next();
    expect(servicio.listarHistorial).toHaveBeenCalledTimes(2);
  });

  it('rechaza periodos vacíos y permite reintentar tras un fallo de conexión', () => {
    component.desde = '';
    component.cargar();
    expect(servicio.listarHistorial).not.toHaveBeenCalled();
    component.desde = '2026-10-26';
    component.hasta = '2026-10-26';
    servicio.listarHistorial.and.returnValue(throwError(() => ({ error: { Message: 'Sin conexión' } })));
    component.cargar();
    expect(component.cargando).toBeFalse();
    expect(component.error).toBe('Sin conexión');
  });
});
