import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { NivelUsuarioEnum } from '../../enums/enum';
import { AlertaStockCesia, ConsultaAlertasStockCesia } from '../../models/cesia-stock.models';
import { RespuestaCesia } from '../../models/cesia.models';
import { TenantTextPipe } from '../../pipes/tenant-text.pipe';
import { BandejaNotificacionesService } from '../../services/bandeja-notificaciones.service';
import { CesiaStockService, EstadoCesiaStock } from '../../services/cesia-stock.service';
import { CesiaService } from '../../services/cesia.service';
import { LicenciaTenantService } from '../../services/licencia-tenant.service';
import { NotificacionesPushService } from '../../services/notificaciones-push.service';
import { StorageService } from '../../services/storage.service';
import { StockAlmacenConsultaComponent } from '../mantenimiento/stock-almacen-consulta/stock-almacen-consulta.component';
import { CesiaAssistantComponent } from './cesia-assistant.component';

describe('CesiaAssistantComponent · chat y mensajes sin leer', () => {
  let fixture: ComponentFixture<CesiaAssistantComponent>;
  let component: CesiaAssistantComponent;
  let estado: BehaviorSubject<EstadoCesiaStock>;
  let respuesta: Subject<RespuestaCesia>;
  let events: Subject<NavigationEnd>;
  let consultar: jasmine.Spy;
  let dialog: { open: jasmine.Spy };
  let bandeja: { tipos: jasmine.Spy; marcarLeida: jasmine.Spy; suscribir: jasmine.Spy };
  let canales: { obtenerPreferencias: jasmine.Spy; cambiarPreferenciaPush: jasmine.Spy };
  let sesion: { TenantID: string; Cultura: string; User: { IdUsuario: number; IdNivel: number } };
  let autenticado: boolean;
  let visibilidad: jasmine.Spy;

  const alerta = (tipo: AlertaStockCesia['Tipo'] = 'STOCK_BAJO', id = 10): AlertaStockCesia => ({
    Clave: `${id}:1`, Tipo: tipo, IdArticulo: id, Articulo: `Arroz ${id}`, Unidad: 'kg',
    StockRegistrado: 10, ConsumoPendiente: 6, StockEstimado: 4, StockMinimo: 5,
    ConsumoPorHora: 2, HorasHastaAgotamiento: 2,
  });
  const consulta = (alertas = [alerta()]): ConsultaAlertasStockCesia => ({
    GeneradoUtc: '2026-10-16T09:00:00Z', HorasProyeccion: 4, HorasObservacion: 2,
    ArticulosEvaluados: 10, ConsumosSinConfiguracion: 0, Alertas: alertas,
  });
  const contestacion = (): RespuestaCesia => ({
    Respuesta: 'Comprueba las existencias físicas antes de reponer.', Plan: 'Integral',
    Fuentes: [], Sugerencias: [], RecomiendaTicket: false,
  });
  const element = (): HTMLElement => fixture.nativeElement;
  function publicar(data = consulta()): void {
    estado.next({ habilitado: true, error: false, consulta: data });
    fixture.detectChanges();
  }
  function abrir(): void {
    element().querySelector<HTMLButtonElement>('.cesia__launcher')!.click();
    fixture.detectChanges();
  }
  function cerrar(): void {
    element().querySelector<HTMLButtonElement>('.cesia__close')!.click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    autenticado = true;
    sesion = { TenantID: 'tenant-a', Cultura: 'es-PE', User: { IdUsuario: 5, IdNivel: NivelUsuarioEnum.Administrador } };
    visibilidad = spyOnProperty(document, 'visibilityState', 'get').and.returnValue('visible');
    estado = new BehaviorSubject<EstadoCesiaStock>({ habilitado: false, error: false, consulta: null });
    respuesta = new Subject<RespuestaCesia>();
    events = new Subject<NavigationEnd>();
    consultar = jasmine.createSpy('consultar').and.returnValue(respuesta);
    dialog = { open: jasmine.createSpy('open') };
    // Los canales y la suscripción pueden estar apagados: no son requisitos del chat.
    bandeja = {
      tipos: jasmine.createSpy('tipos').and.resolveTo([{ Codigo: 'CESIA_STOCK', Recibir: false }]),
      marcarLeida: jasmine.createSpy('marcarLeida'), suscribir: jasmine.createSpy('suscribir'),
    };
    canales = {
      obtenerPreferencias: jasmine.createSpy('obtenerPreferencias').and.resolveTo({ RecibirPorPush: false, RecibirPorCorreo: false }),
      cambiarPreferenciaPush: jasmine.createSpy('cambiarPreferenciaPush'),
    };
    await TestBed.configureTestingModule({
      imports: [CommonModule, FormsModule, MatIconModule],
      declarations: [CesiaAssistantComponent, TenantTextPipe],
      providers: [
        { provide: Router, useValue: { url: '/dashboard', events: events.asObservable() } },
        { provide: StorageService, useValue: {
          isAuthenticated: () => autenticado, getCurrentSession: () => sesion, getCurrentUser: () => sesion.User,
        } },
        { provide: CesiaService, useValue: { consultar } },
        { provide: LicenciaTenantService, useValue: { obtenerLicencia: () => of({ PlanNombre: 'Integral' }) } },
        { provide: CesiaStockService, useValue: { estado$: estado.asObservable() } },
        { provide: MatDialog, useValue: dialog },
        { provide: BandejaNotificacionesService, useValue: bandeja },
        { provide: NotificacionesPushService, useValue: canales },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CesiaAssistantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('recibe el mensaje de stock aunque la suscripción, correo y push estén apagados', () => {
    publicar();
    expect(component.mensajes.filter(m => m.stock).length).toBe(1);
    expect(component.pendientesLectura).toBe(1);
    abrir();
    expect(element().textContent).toContain('He detectado una alerta');
    expect(element().textContent).toContain('próximas 4 horas');
    expect(bandeja.tipos).not.toHaveBeenCalled();
    expect(canales.obtenerPreferencias).not.toHaveBeenCalled();
  });

  it('parpadea y muestra el contador hasta abrir el chat sin tocar la campana ni preferencias', () => {
    expect(element().querySelector('.cesia__unread-badge')).toBeNull();
    publicar();
    const launcher = element().querySelector<HTMLButtonElement>('.cesia__launcher')!;
    expect(launcher.classList).toContain('cesia__launcher--unread');
    expect(launcher.getAttribute('aria-label')).toContain('1 mensaje pendiente de leer');
    expect(launcher.querySelector('.cesia__unread-badge')!.textContent).toBe('1');
    const animation = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'none' : 'cesia-unread';
    expect(getComputedStyle(launcher).animationName).toBe(animation);
    abrir();
    expect(component.pendientesLectura).toBe(0);
    cerrar();
    expect(element().querySelector('.cesia__launcher--unread')).toBeNull();
    expect(element().querySelector('.cesia__unread-badge')).toBeNull();
    expect(bandeja.marcarLeida).not.toHaveBeenCalled();
    expect(bandeja.suscribir).not.toHaveBeenCalled();
    expect(canales.cambiarPreferenciaPush).not.toHaveBeenCalled();
  });

  it('no duplica mensajes ni vuelve a parpadear por cada sondeo o variación de cantidad', () => {
    publicar(); abrir(); cerrar();
    publicar({ ...consulta([{ ...alerta(), StockEstimado: 3 }]), GeneradoUtc: '2026-10-16T09:01:00Z' });
    expect(component.mensajes.filter(m => m.stock).length).toBe(1);
    expect(component.mensajes.find(m => m.stock)!.stock!.consulta!.Alertas[0].StockEstimado).toBe(3);
    expect(component.pendientesLectura).toBe(0);
  });

  it('vuelve a avisar por una alerta nueva, mayor gravedad o resolución', () => {
    publicar(); abrir(); cerrar();
    publicar(consulta([alerta('SIN_STOCK')]));
    expect(component.pendientesLectura).toBe(1);
    abrir(); cerrar();
    publicar(consulta([alerta('SIN_STOCK'), alerta('STOCK_BAJO', 20)]));
    expect(component.pendientesLectura).toBe(1);
    abrir(); cerrar();
    publicar(consulta([]));
    expect(component.pendientesLectura).toBe(1);
    expect(component.mensajes.filter(m => m.stock).length).toBe(1);
  });

  it('avisa de una respuesta normal que llega con el chat cerrado', () => {
    abrir();
    component.enviar('¿Qué debo comprobar?');
    cerrar();
    respuesta.next(contestacion());
    fixture.detectChanges();
    expect(component.pendientesLectura).toBe(1);
    expect(element().querySelector('.cesia__launcher--unread')).not.toBeNull();
    abrir();
    expect(element().textContent).toContain('Comprueba las existencias físicas');
    expect(component.pendientesLectura).toBe(0);
  });

  it('cuenta mensajes de chat, no la cantidad de artículos afectados', () => {
    abrir(); component.enviar('¿Qué reviso?'); cerrar();
    publicar(consulta([alerta(), alerta('SIN_STOCK', 20)]));
    respuesta.next(contestacion());
    fixture.detectChanges();
    expect(element().querySelector('.cesia__unread-badge')!.textContent).toBe('2');
  });

  it('sitúa una novedad de stock al final para verla al abrir el chat, sin duplicarla', () => {
    publicar(); abrir(); component.enviar('¿Qué hago?');
    respuesta.next(contestacion()); cerrar();
    publicar(consulta([alerta('SIN_STOCK')]));
    expect(component.mensajes[component.mensajes.length - 1].stock!.consulta!.Alertas[0].Tipo).toBe('SIN_STOCK');
    expect(component.mensajes.filter(m => m.stock).length).toBe(1);
    expect(component.pendientesLectura).toBe(1);
  });

  it('solo considera leídas las respuestas cuando el chat está abierto en una pestaña visible', () => {
    abrir();
    visibilidad.and.returnValue('hidden');
    publicar();
    expect(component.pendientesLectura).toBe(1);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(component.pendientesLectura).toBe(1);
    visibilidad.and.returnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(component.pendientesLectura).toBe(0);
    publicar(consulta([alerta('SIN_STOCK')]));
    expect(component.pendientesLectura).toBe(0);
  });

  it('expande el detalle dentro del chat y abre existencias filtradas sin IDs duplicados', () => {
    publicar(consulta([alerta(), { ...alerta(), Clave: '10:2' }, alerta('SIN_STOCK', 20)]));
    abrir();
    expect(element().querySelector('.cesia__stock-details')).toBeNull();
    const expandir = element().querySelector<HTMLButtonElement>('.cesia__stock-action')!;
    expandir.click(); fixture.detectChanges();
    expect(expandir.getAttribute('aria-expanded')).toBe('true');
    expect(element().querySelectorAll('.cesia__stock-details article').length).toBe(3);
    expect(element().textContent).toContain('Arroz 10');
    expect(element().textContent).toContain('Ver cálculo');
    element().querySelector<HTMLButtonElement>('.cesia__stock-details button')!.click();
    expect(dialog.open).toHaveBeenCalledWith(StockAlmacenConsultaComponent, jasmine.objectContaining({
      data: { idsArticulos: [10, 20] },
    }));
  });

  it('envía las evidencias al responder sobre el mensaje sin exceder el límite del historial', () => {
    publicar(consulta(Array.from({ length: 30 }, (_, i) => alerta('STOCK_BAJO', i + 1))));
    abrir();
    component.enviar('¿Por qué me avisas del arroz?');
    const request = consultar.calls.mostRecent().args[0];
    const historial = request.Historial.find((m: { Texto: string }) => m.Texto.includes('Estimación de'));
    expect(historial.Texto).toContain('2026-10-16T09:00:00Z');
    expect(historial.Texto).toContain('Arroz 1: STOCK_BAJO');
    expect(historial.Texto).toContain('comprometido 6');
    expect(historial.Texto).toContain('No es un inventario físico');
    expect(historial.Texto.length).toBeLessThanOrEqual(1600);
    expect(request.Pregunta).toBe('¿Por qué me avisas del arroz?');
  });

  it('explica un fallo sin presentar la última consulta como actual ni afirmar que no hay alertas', () => {
    publicar(); abrir(); cerrar();
    estado.next({ habilitado: true, error: true, consulta: consulta() });
    fixture.detectChanges(); abrir();
    expect(element().textContent).toContain('No se ha podido actualizar');
    expect(element().textContent).not.toContain('No se detectan alertas');
    expect(component.mensajes.find(m => m.stock)!.stock!.consulta!.Alertas.length).toBe(1);
    cerrar();
    estado.next({ habilitado: true, error: true, consulta: consulta() });
    expect(component.pendientesLectura).toBe(0);
  });

  it('comunica también el error inicial sin inventar existencias', () => {
    estado.next({ habilitado: true, error: true, consulta: null });
    fixture.detectChanges(); abrir();
    expect(element().textContent).toContain('No se ha podido actualizar');
    expect(element().querySelector('.cesia__stock-action')).toBeNull();
  });

  it('retira el mensaje y su contador cuando se revoca el acceso al stock', () => {
    publicar();
    estado.next({ habilitado: false, error: false, consulta: null });
    fixture.detectChanges();
    expect(component.pendientesLectura).toBe(0);
    expect(component.mensajes.some(m => m.stock)).toBeFalse();
  });

  it('borra la conversación y cancela respuestas anteriores al cambiar de tenant o usuario', () => {
    publicar(); abrir(); component.enviar('Consulta privada del tenant A'); cerrar();
    sesion.TenantID = 'tenant-b';
    sesion.User.IdUsuario = 6;
    events.next(new NavigationEnd(1, '/dashboard', '/dashboard'));
    respuesta.next(contestacion());
    fixture.detectChanges();
    expect(component.mensajes.length).toBe(1);
    expect(component.cargando).toBeFalse();
    expect(component.pendientesLectura).toBe(0);
    expect(component.abierto).toBeFalse();
  });

  it('oculta Cesia y borra los mensajes privados al cerrar sesión', () => {
    publicar(); abrir();
    autenticado = false;
    events.next(new NavigationEnd(1, '/iniciar-sesion', '/iniciar-sesion'));
    fixture.detectChanges();
    expect(element().querySelector('.cesia')).toBeNull();
    expect(component.mensajes.length).toBe(1);
    expect(component.pendientesLectura).toBe(0);
  });

  it('mantiene el detalle largo dentro del scroll del chat con los estilos centralizados', async () => {
    publicar(consulta(Array.from({ length: 20 }, (_, i) => alerta('STOCK_BAJO', i + 1))));
    abrir();
    element().querySelector<HTMLButtonElement>('.cesia__stock-action')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const panel = element().querySelector<HTMLElement>('.cesia__panel')!;
    panel.style.width = '320px'; panel.style.height = '480px'; panel.style.animation = 'none';
    const mensajes = element().querySelector<HTMLElement>('.cesia__messages')!;
    expect(getComputedStyle(mensajes).overflowY).toBe('auto');
    expect(mensajes.scrollHeight).toBeGreaterThan(mensajes.clientHeight);
    expect(mensajes.scrollWidth).toBeLessThanOrEqual(mensajes.clientWidth + 1);
    expect(panel.scrollHeight).toBeLessThanOrEqual(panel.clientHeight + 1);
    mensajes.scrollTop = mensajes.scrollHeight;
    expect(mensajes.scrollTop).toBeGreaterThan(0);
    expect(panel.scrollTop).toBe(0);
  });
});
