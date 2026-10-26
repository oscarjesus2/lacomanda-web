import { CommonModule } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { of, Subject } from 'rxjs';
import { CanalVentaEnum, EstadoPreparacionPedidoEnum, TipoLineaPreparacionPedidoEnum } from '../../enums/enum';
import { LineaPreparacionCocina } from '../../models/preparacion-cocina.models';
import { CocinaService } from '../../services/cocina.service';
import { PreparacionRealtimeService } from '../../services/preparacion-realtime.service';
import { HeaderService } from '../../services/header.service';
import { CocinaComponent } from './cocina.component';

@Pipe({ name: 'tenantText' })
class TextoPruebaPipe implements PipeTransform {
  transform(key: string): string {
    return ({ orderAttendant: 'Camarero', customerQrOrder: 'Pedido del cliente por QR', cancelledPreparationItem: 'ANULADO' } as Record<string, string>)[key] ?? key;
  }
}

describe('CocinaComponent - tarjetas de preparación', () => {
  let fixture: ComponentFixture<CocinaComponent>;
  let servicio: jasmine.SpyObj<CocinaService>;
  let cambios: Subject<void>;
  let realtime: { cambios$: Subject<void>; iniciar: jasmine.Spy; detener: jasmine.Spy };
  let header: jasmine.SpyObj<HeaderService>;

  const producto: LineaPreparacionCocina = {
    IdPedido: 1, NroCuenta: 1, Item: 1, TipoLinea: TipoLineaPreparacionPedidoEnum.Producto,
    NroPedido: 1, IdCanalVenta: 2, Espacio: 'Mesa', NumeroEspacio: 1, Ambiente: 'Salón',
    Mozo: 'Óscar Bautista', EstacionOrigen: 'Caja principal', EsAutopedidoQr: false,
    Cliente: 'Cliente', Direccion: '', Referencia: '', Producto: 'Chicharron Pollo',
    Cantidad: 1, Observacion: '', FechaEnvioUtc: '2026-10-26T14:29:00Z',
    EstadoPreparacion: EstadoPreparacionPedidoEnum.Enviado,
  };

  beforeEach(async () => {
    cambios = new Subject<void>();
    header = jasmine.createSpyObj<HeaderService>('header', ['hideHeader', 'showHeader']);
    realtime = { cambios$: cambios, iniciar: jasmine.createSpy('iniciar'), detener: jasmine.createSpy('detener') };
    servicio = jasmine.createSpyObj<CocinaService>('CocinaService', ['listarLineas', 'obtenerEstacion', 'cambiarEstado', 'ocultarLinea']);
    servicio.listarLineas.and.returnValue(of({ Success: true, Message: '', Data: [producto] }));
    servicio.obtenerEstacion.and.returnValue(of({
      Success: true, Message: '', Data: { Descripcion: 'Preparación', AreasPreparacion: ['BAR', 'COCINA'] },
    }));
    servicio.cambiarEstado.and.returnValue(of({ Success: true, Message: '', Data: true }));
    servicio.ocultarLinea.and.returnValue(of({ Success: true, Message: '', Data: true }));
    await TestBed.configureTestingModule({
      imports: [CommonModule, MatButtonModule, MatIconModule],
      declarations: [CocinaComponent, TextoPruebaPipe],
      providers: [
        { provide: CocinaService, useValue: servicio },
        { provide: PreparacionRealtimeService, useValue: realtime },
        { provide: HeaderService, useValue: header },
        { provide: MatDialog, useValue: { open: jasmine.createSpy('open') } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CocinaComponent);
  });

  afterEach(() => fixture?.destroy());

  it('oculta la cabecera al entrar y la restaura al salir, como Caja y Mozo', () => {
    fixture.detectChanges();
    expect(header.hideHeader).toHaveBeenCalledTimes(1);
    fixture.destroy();
    expect(header.showHeader).toHaveBeenCalledTimes(1);
  });

  for (const caso of [
    { estado: EstadoPreparacionPedidoEnum.Enviado, anulado: false, facturado: false, permitido: false },
    { estado: EstadoPreparacionPedidoEnum.EnPreparacion, anulado: false, facturado: false, permitido: false },
    { estado: EstadoPreparacionPedidoEnum.Preparado, anulado: false, facturado: false, permitido: false },
    { estado: EstadoPreparacionPedidoEnum.Entregado, anulado: false, facturado: false, permitido: true },
    ...[EstadoPreparacionPedidoEnum.Enviado, EstadoPreparacionPedidoEnum.EnPreparacion,
      EstadoPreparacionPedidoEnum.Preparado, EstadoPreparacionPedidoEnum.Entregado].flatMap(estado => [
      { estado, anulado: true, facturado: false, permitido: true },
      { estado, anulado: false, facturado: true, permitido: true },
    ]),
  ]) {
    it(`solo ofrece ocultar en los tres casos permitidos (${JSON.stringify(caso)})`, () => {
      servicio.listarLineas.and.returnValue(of({ Success: true, Message: '', Data: [
        { ...producto, EstadoPreparacion: caso.estado, EsAnulado: caso.anulado, EsFacturado: caso.facturado },
      ] }));
      fixture.detectChanges();
      expect(!!fixture.nativeElement.querySelector('.kitchen-ticket__hide')).toBe(caso.permitido);
      if (!caso.permitido) {
        fixture.componentInstance.ocultar(fixture.componentInstance.lineas[0]);
        expect(servicio.ocultarLinea).not.toHaveBeenCalled();
      }
    });
  }

  it('oculta únicamente la línea seleccionada y conserva el estado de preparación enviado al servidor', () => {
    const entregada = { ...producto, EstadoPreparacion: EstadoPreparacionPedidoEnum.Entregado };
    servicio.listarLineas.and.returnValue(of({ Success: true, Message: '', Data: [entregada] }));
    fixture.detectChanges();
    servicio.listarLineas.and.returnValue(of({ Success: true, Message: '', Data: [] }));

    (fixture.nativeElement.querySelector('.kitchen-ticket__hide') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(servicio.ocultarLinea).toHaveBeenCalledOnceWith({
      IdPedido: 1, NroCuenta: 1, Item: 1, SubItem: undefined, TipoLinea: TipoLineaPreparacionPedidoEnum.Producto,
    });
    expect(entregada.EstadoPreparacion).toBe(EstadoPreparacionPedidoEnum.Entregado);
    expect(fixture.nativeElement.querySelectorAll('.kitchen-ticket').length).toBe(0);
  });

  it('permite abrir el historial desde la barra de herramientas', () => {
    fixture.detectChanges();
    fixture.componentInstance.verHistorial();
    expect(TestBed.inject(MatDialog).open).toHaveBeenCalled();
  });

  it('muestra la tarjeta recibida junto al contador y permite empezar su preparación', () => {
    fixture.detectChanges();
    fixture.detectChanges();
    const columna = fixture.nativeElement.querySelector('.kitchen-column--sent') as HTMLElement;
    expect(columna.querySelector('header strong')?.textContent?.trim()).toBe('1');
    expect(columna.querySelectorAll('.kitchen-ticket').length).toBe(1);
    expect(columna.textContent).toContain('Chicharron Pollo');
    expect(columna.textContent).toContain('Pedido #1');
    expect(columna.textContent).toContain('Mesa 1');
    expect(columna.textContent).toContain('Camarero');
    expect(columna.textContent).toContain('Óscar Bautista');
    expect(columna.textContent).toContain('Caja principal');
    columna.querySelector<HTMLButtonElement>('.kitchen-ticket__action')!.click();
    expect(servicio.cambiarEstado).toHaveBeenCalledWith(jasmine.objectContaining({
      IdPedido: 1, Item: 1, EstadoPreparacion: EstadoPreparacionPedidoEnum.EnPreparacion,
    }));
  });

  it('muestra un mensaje vacío en las columnas sin productos', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.kitchen-column__empty').length).toBe(3);
  });

  for (const canal of [CanalVentaEnum.PARA_LLEVAR, CanalVentaEnum.DELIVERY]) {
    it(`incluye el nombre del cliente junto al número del pedido en el canal ${canal}`, () => {
      servicio.listarLineas.and.returnValue(of({ Success: true, Message: '', Data: [
        { ...producto, IdCanalVenta: canal, Cliente: '  Oscar  ', Direccion: 'Calle Mayor 1' },
      ] }));

      fixture.detectChanges();

      const tarjeta = fixture.nativeElement.querySelector('.kitchen-ticket') as HTMLElement;
      expect(tarjeta.querySelector('.kitchen-ticket__header strong')?.textContent?.trim()).toBe('Pedido #1 - Oscar');
      expect(tarjeta.textContent).toContain(canal === CanalVentaEnum.DELIVERY ? 'Delivery' : 'Para llevar');
      if (canal === CanalVentaEnum.DELIVERY) {
        expect(tarjeta.querySelector('.kitchen-ticket__delivery')?.textContent).toContain('Calle Mayor 1');
      }
    });
  }

  for (const caso of [
    { canal: CanalVentaEnum.ESPACIO, cliente: 'Oscar' },
    { canal: CanalVentaEnum.DELIVERY, cliente: '   ' },
    { canal: CanalVentaEnum.PARA_LLEVAR, cliente: '' },
  ]) {
    it(`mantiene solo el número para mesa o sin nombre de cliente (${caso.canal}, '${caso.cliente}')`, () => {
      servicio.listarLineas.and.returnValue(of({ Success: true, Message: '', Data: [
        { ...producto, IdCanalVenta: caso.canal, Cliente: caso.cliente },
      ] }));

      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.kitchen-ticket__header strong')?.textContent?.trim()).toBe('Pedido #1');
    });
  }

  it('mantiene visible una anulación recibida por SignalR y oculta sus acciones', () => {
    fixture.detectChanges();
    servicio.listarLineas.and.returnValue(of({ Success: true, Message: '', Data: [
      { ...producto, EsAnulado: true, MotivoAnulacion: 'Sin existencias', FechaAnulacionUtc: '2026-10-26T15:00:00Z' },
    ] }));
    cambios.next();
    fixture.detectChanges();
    const tarjeta = fixture.nativeElement.querySelector('.kitchen-ticket') as HTMLElement;
    expect(tarjeta).not.toBeNull();
    expect(tarjeta.textContent).toContain('Chicharron Pollo');
    expect(tarjeta.textContent).toContain('ANULADO');
    expect(tarjeta.textContent).toContain('Sin existencias');
    expect(tarjeta.querySelector('.kitchen-ticket__action')).toBeNull();
    expect(tarjeta.classList).toContain('kitchen-ticket--cancelled');
  });

  it('identifica el origen QR y mantiene visibles el espacio y la estación de envío', () => {
    servicio.listarLineas.and.returnValue(of({ Success: true, Message: '', Data: [
      { ...producto, EsAutopedidoQr: true, Espacio: 'Box', NumeroEspacio: 7 },
    ] }));
    fixture.detectChanges();
    const tarjeta = fixture.nativeElement.querySelector('.kitchen-ticket') as HTMLElement;
    expect(tarjeta.textContent).toContain('Box 7');
    expect(tarjeta.textContent).toContain('Pedido del cliente por QR');
    expect(tarjeta.textContent).toContain('Caja principal');
  });

  it('incorpora los productos al recibir SignalR y no consulta por temporizador', fakeAsync(() => {
    servicio.listarLineas.and.returnValue(of({ Success: true, Message: '', Data: [] }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.kitchen-ticket').length).toBe(0);

    servicio.listarLineas.and.returnValue(of({ Success: true, Message: '', Data: [producto] }));
    tick(60_000);
    expect(servicio.listarLineas).toHaveBeenCalledTimes(1);
    cambios.next();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.kitchen-ticket').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Chicharron Pollo');
    fixture.destroy();
    expect(realtime.detener).toHaveBeenCalled();
  }));

  it('agrupa avisos recibidos durante una consulta y recupera los cambios al finalizar', () => {
    const pendiente = new Subject<any>();
    servicio.listarLineas.and.returnValue(pendiente);
    fixture.detectChanges();
    cambios.next();
    cambios.next();
    expect(servicio.listarLineas).toHaveBeenCalledTimes(1);
    servicio.listarLineas.and.returnValue(of({ Success: true, Message: '', Data: [producto] }));
    pendiente.next({ Success: true, Message: '', Data: [] });
    pendiente.complete();
    fixture.detectChanges();
    expect(servicio.listarLineas).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Chicharron Pollo');
    fixture.destroy();
    cambios.next();
    expect(servicio.listarLineas).toHaveBeenCalledTimes(2);
  });

  it('retira las tarjetas entregadas cuando SignalR avisa de que la cuenta fue cobrada', () => {
    servicio.listarLineas.and.returnValue(of({ Success: true, Message: '', Data: [
      { ...producto, EstadoPreparacion: EstadoPreparacionPedidoEnum.Entregado },
    ] }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.kitchen-ticket').length).toBe(1);
    servicio.listarLineas.and.returnValue(of({ Success: true, Message: '', Data: [] }));

    cambios.next();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.kitchen-ticket').length).toBe(0);
    expect(fixture.nativeElement.querySelector('.kitchen-column--delivered header strong')?.textContent?.trim()).toBe('0');
  });

  it('coloca cada producto en la columna correspondiente a su estado', () => {
    servicio.listarLineas.and.returnValue(of({ Success: true, Message: '', Data: [
      producto,
      { ...producto, Item: 2, EstadoPreparacion: EstadoPreparacionPedidoEnum.EnPreparacion },
      { ...producto, Item: 3, EstadoPreparacion: EstadoPreparacionPedidoEnum.Preparado },
      { ...producto, Item: 4, EstadoPreparacion: EstadoPreparacionPedidoEnum.Entregado },
    ] }));
    fixture.detectChanges();
    const columnas = fixture.nativeElement.querySelectorAll('.kitchen-column') as NodeListOf<HTMLElement>;
    columnas.forEach(columna => expect(columna.querySelectorAll('.kitchen-ticket').length).toBe(1));
    expect(columnas[1].querySelector('.kitchen-ticket__action')?.textContent).toContain('Marcar preparado');
    expect(columnas[2].querySelector('.kitchen-ticket__action')).toBeNull();
    expect(columnas[3].querySelector('.kitchen-ticket__action')).toBeNull();
  });
});
