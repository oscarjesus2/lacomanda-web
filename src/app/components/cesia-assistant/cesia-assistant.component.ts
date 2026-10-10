import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, filter, takeUntil } from 'rxjs';
import { environment } from 'src/environments/environment';
import { MensajeCesia } from '../../models/cesia.models';
import { CesiaService } from '../../services/cesia.service';
import { LicenciaTenantService } from '../../services/licencia-tenant.service';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-cesia-assistant',
  templateUrl: './cesia-assistant.component.html',
  styleUrls: ['./cesia-assistant.component.css'],
})
export class CesiaAssistantComponent implements OnInit, OnDestroy {
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

  constructor(
    private readonly router: Router,
    private readonly storage: StorageService,
    private readonly cesia: CesiaService,
    private readonly licencia: LicenciaTenantService,
  ) {}

  ngOnInit(): void {
    this.actualizarRuta(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
      )
      .subscribe(event => this.actualizarRuta(event.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get visible(): boolean {
    return this.storage.isAuthenticated() && !this.esRutaPublica(this.rutaActual);
  }

  abrir(): void {
    this.abierto = true;
    if (!this.plan) {
      this.licencia
        .obtenerLicencia()
        .pipe(takeUntil(this.destroy$))
        .subscribe(value => this.plan = value?.PlanNombre ?? 'LaComanda');
    }
  }

  cerrar(): void {
    this.abierto = false;
  }

  enviar(preguntaSugerida?: string): void {
    const texto = (preguntaSugerida ?? this.pregunta).trim();
    if (!texto || this.cargando) return;

    const historial = this.mensajes
      .slice(-10)
      .map(mensaje => ({ Rol: mensaje.rol, Texto: mensaje.texto }));
    const imagen = this.imagenDataUrl || undefined;
    this.mensajes.push({ rol: 'user', texto, imagenUrl: imagen });
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
    }).pipe(takeUntil(this.destroy$)).subscribe({
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
      },
      error: () => {
        this.mensajes.push({
          rol: 'assistant',
          texto: 'Ahora mismo no puedo preparar una respuesta. Inténtalo de nuevo en unos instantes o abre un ticket en el Portal LaComanda.',
          recomiendaTicket: true,
        });
        this.cargando = false;
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
    this.sugerencias = this.sugerenciasIniciales(this.rutaActual);
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
