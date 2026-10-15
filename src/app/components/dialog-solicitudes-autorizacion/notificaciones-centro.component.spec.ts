import { CommonModule } from '@angular/common';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Pipe, PipeTransform } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject, of } from 'rxjs';
import { BandejaNotificacionesService } from 'src/app/services/bandeja-notificaciones.service';
import { CesiaStockService } from 'src/app/services/cesia-stock.service';
import { NotificacionesPushService } from 'src/app/services/notificaciones-push.service';
import { SolicitudAutorizacionService } from 'src/app/services/solicitud-autorizacion.service';
import { SolicitudesAutorizacionRealtimeService } from 'src/app/services/solicitudes-autorizacion-realtime.service';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { NotificacionResumen } from 'src/app/models/notificacion.models';
import { DialogSolicitudesAutorizacionComponent } from './dialog-solicitudes-autorizacion.component';
import { SolicitudesAutorizacionBotonComponent } from '../solicitudes-autorizacion-boton/solicitudes-autorizacion-boton.component';
import { ES_TEXTS } from 'src/app/services/localization/tenant-texts.es';

@Pipe({ name: 'tenantText' })
class TextoBandejaPipe implements PipeTransform {
  transform(key: string): string {
    return ({ notificationCenter: 'Notificaciones', notificationSettings: 'Configurar notificaciones',
      notificationInboxHint: ES_TEXTS.notificationInboxHint, notificationSettingsHint: ES_TEXTS.notificationSettingsHint,
      notifyByPushHint: ES_TEXTS.notifyByPushHint } as Record<string, string>)[key] ?? key;
  }
}

describe('Centro de notificaciones · plantilla real', () => {
  let fixture: ComponentFixture<DialogSolicitudesAutorizacionComponent>;
  let items: BehaviorSubject<NotificacionResumen[]>;
  let bandeja: any;
  let overlay: HTMLElement | undefined;
  const aviso = (id: string, leida: string | null = null): NotificacionResumen => ({ Id: id, CodigoTipo: 'CESIA_STOCK',
    Titulo: 'Hay algo que merece tu atención', Resumen: 'Previsión para cuatro horas', FechaUtc: '2026-10-15T12:00:00Z', LeidaUtc: leida });

  beforeEach(async () => {
    items = new BehaviorSubject([aviso('pendiente'), ...[1, 2, 3, 4, 5].map(i => aviso(`leida-${i}`, '2026-10-15T11:00:00Z'))]);
    bandeja = { notificaciones$: items.asObservable(), error$: of(false), actualizar: jasmine.createSpy().and.resolveTo(),
      tipos: jasmine.createSpy().and.resolveTo([{ Codigo: 'CESIA_STOCK', Nombre: 'Alertas de almacén', Descripcion: 'Stock y agotamiento', Recibir: true, PermiteCorreo: true, PermitePush: true }]),
      suscribir: jasmine.createSpy().and.resolveTo(), marcarLeida: jasmine.createSpy().and.callFake(async (id: string) => {
        items.next(items.value.map(n => n.Id === id ? { ...n, LeidaUtc: '2026-10-15T18:00:00Z' } : n));
      }) };
    await TestBed.configureTestingModule({
      imports: [CommonModule, MatDialogModule, MatIconModule, MatSlideToggleModule, MatButtonModule, RouterTestingModule, NoopAnimationsModule],
      declarations: [DialogSolicitudesAutorizacionComponent, TextoBandejaPipe],
      providers: [
        { provide: BandejaNotificacionesService, useValue: bandeja },
        { provide: MatDialogRef, useValue: { close: jasmine.createSpy() } },
        { provide: SolicitudAutorizacionService, useValue: {} },
        { provide: SolicitudesAutorizacionRealtimeService, useValue: { pendientes$: of([]), comprobantesFiscalesPendientes$: of([]), sincronizar: async () => {} } },
        { provide: CesiaStockService, useValue: { alertas$: of([]) } },
        { provide: TenantTextCatalogService, useValue: { get: (key: string) => key } },
        { provide: NotificacionesPushService, useValue: {
          obtenerPreferencias: async () => ({ RecibirPorCorreo: true, PuedeElegirCorreo: true }),
          obtenerEstadoGeneral: async () => ({ Habilitado: true, Disponible: true, PuedeElegir: true, Vinculado: true }),
          cambiarPreferenciaPush: jasmine.createSpy().and.resolveTo({ RecibirPorPush: true, RecibirPorCorreo: true }),
        } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(DialogSolicitudesAutorizacionComponent);
    fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges();
  });

  afterEach(() => {
    overlay?.remove();
    TestBed.inject(MatDialog).closeAll();
  });

  it('abrir desde la campana aplica el scroll interno en el MatDialog real', async () => {
    items.next(Array.from({ length: 20 }, (_, i) => aviso(`aviso-${i}`)));
    const dialog = TestBed.inject(MatDialog);
    const campana = new SolicitudesAutorizacionBotonComponent(
      { puedeVerCentroNotificaciones$: of(true) } as any, dialog,
      { habilitado$: of(true) } as any, { pendientes$: of(20) } as any,
    );
    campana.abrir();
    const ref = dialog.openDialogs[0];
    ref.componentRef!.changeDetectorRef.detectChanges();
    await fixture.whenStable();
    ref.componentRef!.changeDetectorRef.detectChanges();
    const contenedor = TestBed.inject(OverlayContainer).getContainerElement();
    const surface = contenedor.querySelector<HTMLElement>('.mat-mdc-dialog-surface')!;
    const panel = contenedor.querySelector<HTMLElement>('.mant-panel')!;
    expect(getComputedStyle(surface).overflowY).toBe('hidden');
    expect(getComputedStyle(panel).overflowY).toBe('auto');
    expect(surface.scrollHeight).toBeLessThanOrEqual(surface.clientHeight + 1);
    expect(Math.abs(panel.getBoundingClientRect().right - surface.getBoundingClientRect().right)).toBeLessThan(1);
    panel.scrollTop = panel.scrollHeight;
    expect(panel.scrollTop).toBeGreaterThan(0);
    expect(surface.scrollTop).toBe(0);
    const tuerca = panel.querySelector<HTMLElement>('.settings-button')!;
    const rect = tuerca.getBoundingClientRect();
    expect(tuerca.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))).toBeTrue();
  });

  // Reproduce el contenedor y el scroll de MatDialog con el tema global real.
  // Comprobar solo la existencia del botón no detecta si el título lo tapa.
  function montarEnDialogo(ancho = 760): HTMLElement {
    overlay = document.createElement('div');
    overlay.className = 'cdk-overlay-container';
    const wrapper = document.createElement('div');
    wrapper.className = 'cdk-global-overlay-wrapper';
    const pane = document.createElement('div');
    pane.className = 'cdk-overlay-pane dialog-window--compact';
    pane.style.width = `${ancho}px`;
    const container = document.createElement('div');
    container.className = 'mat-mdc-dialog-container';
    const surface = document.createElement('div');
    surface.className = 'mat-mdc-dialog-surface';
    surface.append(fixture.nativeElement);
    container.append(surface);
    pane.append(container);
    wrapper.append(pane);
    overlay.append(wrapper);
    document.body.append(overlay);
    return surface;
  }

  for (const ancho of [760, 320]) {
    it(`contiene el scroll en el panel, sin separación ni barra exterior (${ancho}px)`, async () => {
      bandeja.tipos.and.resolveTo(Array.from({ length: 8 }, (_, i) => ({
        Codigo: `TIPO_${i}`, Nombre: `Notificación ${i}`, Descripcion: 'Descripción de la notificación',
        Recibir: true, PermiteCorreo: true, PermitePush: true,
      })));
      await fixture.componentInstance.configurar();
      fixture.detectChanges();
      const surface = montarEnDialogo(ancho);
      const panel: HTMLElement = fixture.nativeElement.querySelector('.mant-panel');
      expect(getComputedStyle(panel).overflowY).toBe('auto');
      expect(getComputedStyle(surface).overflowY).toBe('hidden');
      expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);
      expect(surface.scrollHeight).toBeLessThanOrEqual(surface.clientHeight + 1);
      expect(Math.abs(panel.getBoundingClientRect().right - surface.getBoundingClientRect().right)).toBeLessThan(1);
      expect(panel.getBoundingClientRect().height).toBeLessThanOrEqual(window.innerHeight - 32);
      panel.scrollTop = panel.scrollHeight;
      expect(panel.scrollTop).toBeGreaterThan(0);
      expect(surface.scrollTop).toBe(0);
      expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth);
      comprobarBotonAccesible('.settings-button');
      comprobarBotonAccesible('.close-button');
      const volver: HTMLElement = fixture.nativeElement.querySelector('.operations-link');
      expect(volver.getBoundingClientRect().bottom).toBeLessThanOrEqual(panel.getBoundingClientRect().bottom);
    });
  }

  function comprobarBotonAccesible(selector: string): HTMLButtonElement {
    const boton: HTMLButtonElement = fixture.nativeElement.querySelector(selector);
    const rect = boton.getBoundingClientRect();
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(window.innerWidth);
    expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);
    expect(boton.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)))
      .withContext(`${selector} debe recibir el clic, no quedar debajo del título`).toBeTrue();
    return boton;
  }

  function comprobarSubtituloVisible(): void {
    const cabecera: HTMLElement = fixture.nativeElement.querySelector('.mant-panel__header');
    const subtitulo: HTMLElement = fixture.nativeElement.querySelector('.subtitle');
    expect(subtitulo.getBoundingClientRect().top - cabecera.getBoundingClientRect().bottom)
      .withContext('El mensaje debe quedar separado de la cabecera, no debajo de ella').toBeGreaterThanOrEqual(12);
    const texto = document.createRange();
    texto.selectNodeContents(subtitulo);
    for (const linea of Array.from(texto.getClientRects())) {
      expect(subtitulo.contains(document.elementFromPoint(linea.left + 2, linea.top + linea.height / 2)))
        .withContext('Cada línea del mensaje debe estar visible y sin capas por encima').toBeTrue();
    }
  }

  for (const ancho of [760, 320]) {
    it(`el mensaje se lee completo al abrir y al regresar desde configuración (${ancho}px)`, async () => {
      items.next([]);
      bandeja.tipos.and.resolveTo(Array.from({ length: 8 }, (_, i) => ({
        Codigo: `TIPO_${i}`, Nombre: `Notificación ${i}`, Descripcion: 'Descripción de la notificación',
        Recibir: true, PermiteCorreo: true, PermitePush: true,
      })));
      fixture.detectChanges();
      montarEnDialogo(ancho);
      comprobarSubtituloVisible();
      comprobarBotonAccesible('.settings-button').click();
      await fixture.whenStable(); fixture.detectChanges();
      comprobarSubtituloVisible();
      const panel: HTMLElement = fixture.nativeElement.querySelector('.mant-panel');
      panel.scrollTop = panel.scrollHeight;
      expect(panel.scrollTop).toBeGreaterThan(0);
      comprobarBotonAccesible('.settings-button').click();
      await fixture.whenStable(); fixture.detectChanges();
      comprobarSubtituloVisible();
    });
  }

  it('la tuerca de una bandeja vacía es visible y pulsable sobre el encabezado global', async () => {
    items.next([]);
    fixture.detectChanges();
    montarEnDialogo();
    comprobarBotonAccesible('.settings-button').click();
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.componentInstance.vista).toBe('preferencias');
    comprobarBotonAccesible('.settings-button');
    comprobarBotonAccesible('.close-button');
  });

  it('mantiene título, tuerca y cierre separados en un diálogo estrecho y con scroll', async () => {
    items.next(Array.from({ length: 20 }, (_, i) => aviso(`pendiente-${i}`)));
    fixture.detectChanges();
    montarEnDialogo(320);
    const panel: HTMLElement = fixture.nativeElement.querySelector('.mant-panel');
    panel.style.maxHeight = '260px';
    expect(panel.scrollHeight).toBeGreaterThan(panel.clientHeight);
    panel.scrollTop = panel.scrollHeight;
    expect(panel.scrollTop).toBeGreaterThan(0);
    const boton = comprobarBotonAccesible('.settings-button');
    boton.focus();
    expect(document.activeElement).toBe(boton);
    boton.click();
    await fixture.whenStable(); fixture.detectChanges();
    expect(boton.getAttribute('aria-pressed')).toBe('true');
    const titulo: HTMLElement = fixture.nativeElement.querySelector('h2');
    const cierre = comprobarBotonAccesible('.close-button');
    comprobarBotonAccesible('.settings-button');
    expect(titulo.getBoundingClientRect().right).toBeLessThanOrEqual(boton.getBoundingClientRect().left);
    expect(boton.getBoundingClientRect().right).toBeLessThanOrEqual(cierre.getBoundingClientRect().left);
    expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth);
    cierre.click();
    expect(TestBed.inject(MatDialogRef).close).toHaveBeenCalledOnceWith();
  });

  it('abre en bandeja compacta con tuerca y solo las tres últimas leídas', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.settings-button mat-icon')?.textContent).toContain('settings');
    expect(el.querySelectorAll('.notification-card').length).toBe(4);
    expect(el.querySelectorAll('.read-notifications .notification-card').length).toBe(3);
    expect(el.querySelector('mat-slide-toggle')).toBeNull();
    expect(el.querySelector('app-cesia-stock-panel')).toBeNull();
    expect(el.querySelector('details')).toBeNull();
    expect(el.querySelector('.notification-summary')?.getAttribute('href')).toBe('/notificaciones/pendiente');
  });

  it('la tuerca muestra tipos y canales separados y regresar restaura la bandeja', async () => {
    fixture.nativeElement.querySelector('.settings-button').click();
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('notificationTypes');
    expect(fixture.nativeElement.textContent).toContain('notificationChannels');
    expect(fixture.nativeElement.textContent).toContain('notifyByPush');
    expect(fixture.nativeElement.textContent).toContain('alsoNotifyByEmail');
    expect(fixture.nativeElement.querySelector('.notification-card')).toBeNull();
    fixture.nativeElement.querySelector('.settings-button').click();
    await fixture.whenStable(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notification-card')).not.toBeNull();
  });

  for (const disponible of [true, false]) {
    it(`muestra únicamente la descripción solicitada de push (disponible: ${disponible})`, async () => {
      await fixture.componentInstance.configurar();
      fixture.componentInstance.pushDisponible = disponible;
      fixture.componentInstance.recibirPush = false;
      fixture.detectChanges();
      const preferencia: HTMLElement = fixture.nativeElement.querySelector('.email-preference');
      const descripciones = preferencia.querySelectorAll('small');
      expect(descripciones.length).toBe(1);
      expect(descripciones[0].textContent?.trim()).toBe(
        'Para recibir push en este dispositivo necesitas permiso de notificaciones y una estación de administración vinculada.',
      );
    });
  }

  for (const disponible of [true, false]) {
    it(`permite intentar activar y apaga visualmente el interruptor si se rechaza (disponible: ${disponible})`, async () => {
      await fixture.componentInstance.configurar();
      fixture.componentInstance.pushDisponible = disponible;
      fixture.componentInstance.recibirPush = false;
      fixture.detectChanges();
      const cambiar = TestBed.inject(NotificacionesPushService).cambiarPreferenciaPush as jasmine.Spy;
      cambiar.and.rejectWith(new Error('Permiso rechazado'));
      const interruptor: HTMLButtonElement = fixture.nativeElement.querySelector('.email-preference button[role="switch"]');
      expect(interruptor.disabled).toBeFalse();
      interruptor.click();
      await fixture.whenStable(); fixture.detectChanges();
      expect(cambiar).toHaveBeenCalledOnceWith(true);
      expect(fixture.componentInstance.recibirPush).toBeFalse();
      expect(interruptor.getAttribute('aria-checked')).toBe('false');
      expect(interruptor.disabled).toBeFalse();
      expect(fixture.componentInstance.recibirPorCorreo).toBeTrue();
      cambiar.and.resolveTo({ RecibirPorPush: true, RecibirPorCorreo: true });
      interruptor.click();
      await fixture.whenStable(); fixture.detectChanges();
      expect(cambiar).toHaveBeenCalledTimes(2);
      expect(cambiar.calls.mostRecent().args).toEqual([true]);
      expect(interruptor.getAttribute('aria-checked')).toBe('true');
    });
  }

  it('marcar leído mueve el aviso sin abrir ni resolver una operación', async () => {
    fixture.nativeElement.querySelector('.mark-read').click();
    await fixture.whenStable(); fixture.detectChanges();
    expect(bandeja.marcarLeida).toHaveBeenCalledOnceWith('pendiente');
    expect(fixture.componentInstance.pendientes.length).toBe(0);
    expect(fixture.componentInstance.leidas.length).toBe(3);
  });

  it('si falla el guardado al apagar, restaura el interruptor encendido sin cambiar correo', async () => {
    await fixture.componentInstance.configurar();
    fixture.detectChanges();
    const cambiar = TestBed.inject(NotificacionesPushService).cambiarPreferenciaPush as jasmine.Spy;
    cambiar.and.rejectWith(new Error('Sin conexión'));
    const interruptor: HTMLButtonElement = fixture.nativeElement.querySelector('.email-preference button[role="switch"]');
    interruptor.click();
    await fixture.whenStable(); fixture.detectChanges();
    expect(cambiar).toHaveBeenCalledOnceWith(false);
    expect(fixture.componentInstance.recibirPush).toBeTrue();
    expect(interruptor.getAttribute('aria-checked')).toBe('true');
    expect(fixture.componentInstance.recibirPorCorreo).toBeTrue();
  });

  it('fallo de guardado de tipo restaura la selección y mantiene canales', async () => {
    await fixture.componentInstance.configurar();
    const tipo = fixture.componentInstance.tipos[0];
    bandeja.suscribir.and.rejectWith(new Error('sin red'));
    await fixture.componentInstance.cambiarTipo(tipo, false);
    expect(tipo.Recibir).toBeTrue();
    expect(fixture.componentInstance.errorTipos).toBeTrue();
    expect(fixture.componentInstance.recibirPush).toBeTrue();
    expect(fixture.componentInstance.recibirPorCorreo).toBeTrue();
  });

  it('la bandeja operativa sigue accesible aunque no haya notificaciones sin leer', () => {
    items.next([]);
    fixture.componentInstance.solicitudes = [{ IdSolicitud: 123, Tipo: 'AnularProducto', Descripcion: 'Producto', Ubicacion: 'Mesa 7' } as any];
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.operations-link').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('notificationOperationsHint');
    expect(fixture.nativeElement.querySelectorAll('.request-card').length).toBe(1);
  });
});
