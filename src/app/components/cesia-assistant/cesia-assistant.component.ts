import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MensajeCesia } from '../../models/cesia.models';
import { CesiaService } from '../../services/cesia.service';
import { LicenciaTenantService } from '../../services/licencia-tenant.service';
import { StorageService } from '../../services/storage.service';
import { CesiaStockService, EstadoCesiaStock } from '../../services/cesia-stock.service';
import { AlertaStockCesia } from '../../models/cesia-stock.models';
import { TenantTextCatalogService, TenantTextKey } from '../../services/localization/tenant-text-catalog.service';
import { StockAlmacenConsultaComponent } from '../mantenimiento/stock-almacen-consulta/stock-almacen-consulta.component';

@Component({
  selector: 'app-cesia-assistant',
  templateUrl: './cesia-assistant.component.html',
})
export class CesiaAssistantComponent implements OnInit, OnDestroy {
  @ViewChild('mensajesScroll') private mensajesScroll?: ElementRef<HTMLElement>;
  abierto = false;
  cargando = false;
  pregunta = '';
  rutaActual = '';
  plan = '';
  sugerencias: string[] = [];
  imagenDataUrl = '';
  errorImagen = '';
  readonly portalUrl = environment.customerPortalUrl;
  readonly mensajes: MensajeCesia[] = [
    {
      rol: 'assistant',
      texto: 'Hola, soy Cesia, tu asistente de LaComanda. Puedo explicarte cualquier función paso a paso y teniendo en cuenta tu licencia.',
    },
  ];

  private readonly destroy$ = new Subject<void>();
  private readonly cambioSesion$ = new Subject<void>();
  private sesion = '';
  private mensajeStock?: MensajeCesia;
  private gravedadesStock = new Map<string, number>();
  private stockSinLeer = false;
  private respuestasSinLeer = 0;

  constructor(
    private readonly router: Router,
    private readonly storage: StorageService,
    private readonly cesia: CesiaService,
    private readonly licencia: LicenciaTenantService,
    private readonly stock: CesiaStockService,
    private readonly dialog: MatDialog,
    private readonly texts: TenantTextCatalogService,
  ) {}

  ngOnInit(): void {
    this.actualizarRuta(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(event => this.actualizarRuta(event.urlAfterRedirects));
    // El chat consulta Cesia directamente: nunca depende de suscripciones de
    // notificación, correo, push ni del estado de lectura de la campana.
    this.stock.estado$.pipe(takeUntil(this.destroy$))
      .subscribe(estado => this.actualizarStock(estado));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.cambioSesion$.next();
    this.cambioSesion$.complete();
  }

  get visible(): boolean {
    return this.storage.isAuthenticated() && !this.esRutaPublica(this.rutaActual);
  }

  abrir(): void {
    this.sincronizarSesion();
    if (!this.visible) return;
    this.abierto = true;
    this.marcarChatLeido();
    this.desplazarAlFinal();
    if (!this.plan) {
      this.licencia
        .obtenerLicencia()
        .pipe(takeUntil(this.destroy$), takeUntil(this.cambioSesion$))
        .subscribe(value => this.plan = value?.PlanNombre ?? 'LaComanda');
    }
  }

  cerrar(): void {
    this.abierto = false;
  }

  enviar(preguntaSugerida?: string): void {
    this.sincronizarSesion();
    const texto = (preguntaSugerida ?? this.pregunta).trim();
    if (!this.visible || !texto || this.cargando) return;

    const historial = this.mensajes
      .slice(-10)
      .map(mensaje => ({ Rol: mensaje.rol, Texto: this.textoHistorial(mensaje) }));
    const imagen = this.imagenDataUrl || undefined;
    this.mensajes.push({ rol: 'user', texto, imagenUrl: imagen });
    this.desplazarAlFinal();
    this.pregunta = '';
    this.imagenDataUrl = '';
    this.errorImagen = '';
    this.cargando = true;
    this.sugerencias = [];
    this.cesia.consultar({
      Pregunta: texto,
      RutaActual: this.rutaActual,
      ImagenDataUrl: imagen,
      Historial: historial,
    }).pipe(takeUntil(this.destroy$), takeUntil(this.cambioSesion$)).subscribe({
      next: response => {
        this.plan = response.Plan || this.plan;
        this.mensajes.push({
          rol: 'assistant',
          texto: response.Respuesta,
          fuentes: response.Fuentes,
          recomiendaTicket: response.RecomiendaTicket,
        });
        this.sugerencias = response.Sugerencias ?? [];
        this.cargando = false;
        this.recibirRespuesta();
      },
      error: () => {
        this.mensajes.push({
          rol: 'assistant',
          texto: 'Ahora mismo no puedo preparar una respuesta. Inténtalo de nuevo en unos instantes o abre un ticket en el Portal LaComanda.',
          recomiendaTicket: true,
        });
        this.cargando = false;
        this.recibirRespuesta();
      },
    });
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviar();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.abierto) this.cerrar();
  }

  @HostListener('document:paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    if (!this.abierto || this.cargando) return;

    const item = Array.from(event.clipboardData?.items ?? [])
      .find(candidate => candidate.kind === 'file' && candidate.type.startsWith('image/'));
    const file = item?.getAsFile();
    if (!file) return;

    event.preventDefault();
    this.errorImagen = '';
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.errorImagen = 'La captura debe ser PNG, JPG o WEBP.';
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      this.errorImagen = 'La captura no puede superar 4 MB.';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.imagenDataUrl = reader.result;
        if (!this.pregunta.trim()) {
          this.pregunta = 'Analiza esta captura y dime qué significa y qué debo hacer.';
        }
      }
    };
    reader.onerror = () => this.errorImagen = 'No se pudo leer la captura pegada.';
    reader.readAsDataURL(file);
  }

  quitarImagen(): void {
    this.imagenDataUrl = '';
    this.errorImagen = '';
  }

  private actualizarRuta(url: string): void {
    this.rutaActual = url.split('?')[0].split('#')[0];
    this.sincronizarSesion();
    this.sugerencias = this.sugerenciasIniciales(this.rutaActual);
  }

  get pendientesLectura(): number {
    return (this.stockSinLeer ? 1 : 0) + this.respuestasSinLeer;
  }

  @HostListener('document:visibilitychange')
  @HostListener('window:focus')
  marcarChatLeido(): void {
    if (!this.abierto || !this.visible || document.visibilityState !== 'visible') return;
    this.stockSinLeer = false;
    this.respuestasSinLeer = 0;
  }

  etiquetaStock(alerta: AlertaStockCesia): TenantTextKey {
    return alerta.Tipo === 'SIN_STOCK' ? 'cesiaStockEmpty'
      : alerta.Tipo === 'RIESGO_AGOTAMIENTO' ? 'cesiaStockRisk' : 'cesiaStockLow';
  }

  revisarStock(mensaje: MensajeCesia): void {
    const idsArticulos = [...new Set(mensaje.stock?.consulta?.Alertas.map(a => a.IdArticulo) ?? [])];
    if (!idsArticulos.length || !this.visible) return;
    this.dialog.open(StockAlmacenConsultaComponent, {
      width: 'calc(100vw - 32px)', maxWidth: '1240px', height: 'calc(100vh - 32px)', maxHeight: '880px',
      panelClass: 'dialog-window--workspace', data: { idsArticulos },
    });
  }

  private actualizarStock(estado: EstadoCesiaStock): void {
    this.sincronizarSesion();
    if (!estado.habilitado || !this.visible) {
      if (this.mensajeStock) this.mensajes.splice(this.mensajes.indexOf(this.mensajeStock), 1);
      this.mensajeStock = undefined;
      this.gravedadesStock.clear();
      this.stockSinLeer = false;
      return;
    }
    const consulta = estado.consulta;
    if (!consulta && !estado.error) return;
    let hayNovedades = false;

    if (consulta && !estado.error) {
      const actuales = new Map(consulta.Alertas.map(alerta => [alerta.Clave,
        alerta.Tipo === 'SIN_STOCK' ? 3 : alerta.Tipo === 'RIESGO_AGOTAMIENTO' ? 2 : 1]));
      for (const [clave, gravedad] of actuales) {
        if (gravedad > (this.gravedadesStock.get(clave) ?? 0)) hayNovedades = true;
      }
      if (this.gravedadesStock.size && !actuales.size) hayNovedades = true;
      this.gravedadesStock = actuales;
    }

    if (!this.mensajeStock || this.mensajeStock.stock?.error !== estado.error
      || this.mensajeStock.stock?.consulta?.ConsumosSinConfiguracion !== consulta?.ConsumosSinConfiguracion) {
      hayNovedades = true;
    }

    // Un único mensaje vivo por consulta evita repetir la misma alerta cada minuto.
    if (!this.mensajeStock) {
      this.mensajeStock = { rol: 'assistant', texto: '' };
      this.mensajes.push(this.mensajeStock);
    }
    this.mensajeStock.texto = estado.error ? this.texts.get('cesiaStockUnavailable')
      : consulta!.Alertas.length ? this.texts.get(consulta!.Alertas.length === 1 ? 'cesiaStockChatSummaryOne' : 'cesiaStockChatSummary', {
        count: consulta!.Alertas.length, hours: consulta!.HorasProyeccion,
      }) : this.texts.get(consulta!.ArticulosEvaluados ? 'cesiaStockNoAlerts' : 'cesiaStockNoData');
    this.mensajeStock.stock = { consulta, error: estado.error, expandido: this.mensajeStock.stock?.expandido ?? false };
    if (hayNovedades) {
      this.stockSinLeer = true;
      // La novedad debe verse al final del chat, no quedar detrás de respuestas anteriores.
      this.mensajes.splice(this.mensajes.indexOf(this.mensajeStock), 1);
      this.mensajes.push(this.mensajeStock);
      this.desplazarAlFinal();
    }
    this.marcarChatLeido();
  }

  private recibirRespuesta(): void {
    this.respuestasSinLeer++;
    this.marcarChatLeido();
    this.desplazarAlFinal();
  }

  private desplazarAlFinal(): void {
    setTimeout(() => {
      const elemento = this.mensajesScroll?.nativeElement;
      if (this.abierto && elemento) elemento.scrollTop = elemento.scrollHeight;
    });
  }

  private sincronizarSesion(): void {
    const session = this.storage.getCurrentSession();
    const usuario = this.storage.getCurrentUser();
    const identidad = this.visible && session?.TenantID && usuario?.IdUsuario
      ? `${session.TenantID}:${usuario.IdUsuario}:${usuario.IdNivel}` : '';
    if (identidad === this.sesion) return;
    this.sesion = identidad;
    this.cambioSesion$.next();
    this.mensajes.splice(1);
    this.mensajeStock = undefined;
    this.gravedadesStock.clear();
    this.stockSinLeer = false;
    this.respuestasSinLeer = 0;
    this.cargando = false;
    this.abierto = false;
    this.plan = this.pregunta = this.imagenDataUrl = this.errorImagen = '';
  }

  private textoHistorial(mensaje: MensajeCesia): string {
    const consulta = mensaje.stock?.consulta;
    if (!consulta) return mensaje.texto;
    const cabecera = `${mensaje.texto}\nEstimación de ${consulta.GeneradoUtc}. No es un inventario físico en tiempo real.`
      + (mensaje.stock!.error ? ' No se ha podido actualizar.' : '')
      + (consulta.ConsumosSinConfiguracion ? ' Hay consumos sin configurar; previsión incompleta.' : '');
    const detalle = consulta.Alertas.map(a =>
      `${a.Articulo}: ${a.Tipo}, estimado ${a.StockEstimado} ${a.Unidad}, mínimo ${a.StockMinimo}, registrado ${a.StockRegistrado}, comprometido ${a.ConsumoPendiente}, consumo/h ${a.ConsumoPorHora ?? 'sin estimación'}, agotamiento/h ${a.HorasHastaAgotamiento ?? 'sin estimación'}.`);
    // La API admite 1600 caracteres por mensaje de historial.
    return [cabecera, ...detalle].join('\n').slice(0, 1600);
  }

  private sugerenciasIniciales(route: string): string[] {
    if (route.startsWith('/caja')) {
      return ['¿Cómo abro un turno?', '¿Cómo divido una cuenta?', '¿Qué reviso antes de cobrar?'];
    }
    if (route.startsWith('/mozo')) {
      return ['¿Cómo envío una comanda?', '¿Cómo cambio una mesa?', '¿Cómo configuro un menú?'];
    }
    if (route.startsWith('/administracion')) {
      return ['¿Cómo creo un producto?', '¿Cómo configuro una impresora?', '¿Cómo funciona una receta?'];
    }
    return ['¿Qué incluye mi licencia?', '¿Cómo configuro una estación?', '¿Cómo puedo empezar?'];
  }

  private esRutaPublica(route: string): boolean {
    return route.startsWith('/iniciar-sesion')
      || route.startsWith('/inicio')
      || route.startsWith('/estado-suscripcion')
      || route.startsWith('/mesa/')
      || route.startsWith('/reservas')
      || route.startsWith('/comprobantes');
  }
}
