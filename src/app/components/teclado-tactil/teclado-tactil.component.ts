import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';

import { TenantTextKey } from 'src/app/services/localization/tenant-text-catalog.service';

type AccionTecla =
  | 'escribir'
  | 'borrar'
  | 'mayus'
  | 'simbolos'
  | 'letras';

export interface TeclaTactil {
  /** Rótulo universal (letras, cifras, signos). */
  etiqueta?: string;
  /** Rótulo traducido, para las teclas de servicio. */
  clave?: TenantTextKey;
  accion: AccionTecla;
  /** Carácter que se escribe cuando la acción es escribir. */
  valor?: string;
  ancha?: boolean;
  espacio?: boolean;
  activa?: boolean;
}

type CampoTexto = HTMLInputElement | HTMLTextAreaElement;

const DIGITOS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const FILA_SUPERIOR = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
const FILA_MEDIA = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'];
const FILA_INFERIOR = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];
const SIMBOLOS_FILA_1 = ['!', '"', '#', '$', '%', '&', '/', '(', ')', '='];
const SIMBOLOS_FILA_2 = ['?', '¿', '¡', '+', '*', "'", ':', ';', ',', '.'];
const SIMBOLOS_FILA_3 = ['[', ']', '{', '}', '<', '>', '\\', '|', '^', '~'];

/**
 * Teclado en pantalla, el mismo del acceso: aparece solo cuando la persona lo
 * pide, ocupa el borde inferior y reparte las teclas en el ancho disponible.
 *
 * No sustituye al teclado del equipo: escribe sobre el campo indicado como lo
 * haría cualquier persona tecleando, así que ambos conviven.
 */
@Component({
  selector: 'app-teclado-tactil',
  templateUrl: './teclado-tactil.component.html',
  styleUrls: ['./teclado-tactil.component.css'],
})
export class TecladoTactilComponent implements AfterViewInit, OnDestroy {
  /** Campo sobre el que escribe. */
  @Input() destino?: CampoTexto | ElementRef<CampoTexto> | null;

  /** Nombre del campo para el aviso «Escribiendo en: …». */
  @Input() campo = '';

  /** La persona pulsó «Entrar». */
  @Output() enviar = new EventEmitter<void>();

  @ViewChild('panel') private panel?: ElementRef<HTMLElement>;

  abierto = false;

  /**
   * Las filas son un dato estable, no un getter: si se recalcularan en cada
   * ciclo de detección, *ngFor reharía las teclas entre el mousedown y el
   * mouseup y el navegador nunca llegaría a emitir el clic.
   */
  filas: TeclaTactil[][] = [];

  /** Marca en el body mientras el teclado ocupa el borde inferior. */
  private static readonly MarcaAbierto = 'teclado-en-pantalla';

  private mayus = false;
  private simbolos = false;
  private abrirAlTocar?: (evento: PointerEvent) => void;

  constructor() {
    this.redibujar();
  }

  ngAfterViewInit(): void {
    // El panel vive pegado al viewport: colgado del body escapa del diálogo,
    // que recorta y desplaza su contenido.
    const nodo = this.panel?.nativeElement;
    if (nodo) document.body.appendChild(nodo);

    const campo = this.campoDestino;
    if (!campo || !this.esPantallaTactil) return;

    // En una estación táctil no hay teclado físico: tocar el campo ofrece este,
    // y se evita el del sistema, que taparía el diálogo.
    campo.setAttribute('inputmode', 'none');
    this.abrirAlTocar = () => this.abrir();
    campo.addEventListener('pointerup', this.abrirAlTocar);
  }

  ngOnDestroy(): void {
    const campo = this.campoDestino;
    if (campo && this.abrirAlTocar) {
      campo.removeEventListener('pointerup', this.abrirAlTocar);
    }

    // El panel cuelga del body: si el diálogo se cierra, se va con él.
    document.body.classList.remove(TecladoTactilComponent.MarcaAbierto);
    this.panel?.nativeElement.remove();
  }

  /** Identidad estable de cada tecla, para que *ngFor no las rehaga. */
  identificar = (indice: number, tecla: TeclaTactil): string =>
    `${indice}:${tecla.accion}:${tecla.clave ?? tecla.etiqueta ?? ''}`;

  identificarFila = (indice: number): number => indice;

  alternar(): void {
    if (this.abierto) this.cerrar();
    else this.abrir();
  }

  abrir(): void {
    this.abierto = true;
    // Lo que haya encima sube: el teclado ocupa el borde inferior.
    document.body.classList.add(TecladoTactilComponent.MarcaAbierto);
    this.enfocarCampo();
  }

  cerrar(): void {
    this.abierto = false;
    document.body.classList.remove(TecladoTactilComponent.MarcaAbierto);
    this.enfocarCampo();
  }

  /** Evita que la tecla robe el foco al campo, que es donde se escribe. */
  sostenerFoco(evento: Event): void {
    evento.preventDefault();
  }

  pulsar(tecla: TeclaTactil): void {
    switch (tecla.accion) {
      case 'escribir':
        this.escribir(tecla.valor ?? '');
        break;
      case 'borrar':
        this.borrar();
        break;
      case 'mayus':
        this.mayus = !this.mayus;
        this.redibujar();
        break;
      case 'simbolos':
        this.simbolos = true;
        this.redibujar();
        break;
      case 'letras':
        this.simbolos = false;
        this.redibujar();
        break;
    }

    this.enfocarCampo();
  }

  limpiar(): void {
    const campo = this.campoDestino;
    if (!campo) return;

    campo.value = '';
    this.avisarCambio(campo);
  }

  entrar(): void {
    this.cerrar();
    this.enviar.emit();
  }

  /** Rehace las filas solo cuando cambia el juego de teclas. */
  private redibujar(): void {
    this.filas = this.simbolos ? this.filasSimbolos() : this.filasLetras();
  }

  private get campoDestino(): CampoTexto | null {
    if (!this.destino) return null;
    return this.destino instanceof ElementRef ? this.destino.nativeElement : this.destino;
  }

  private get esPantallaTactil(): boolean {
    return window.matchMedia?.('(pointer: coarse)').matches
      || (navigator.maxTouchPoints ?? 0) > 0;
  }

  private escribir(texto: string): void {
    const campo = this.campoDestino;
    if (!campo || !texto) return;

    const inicio = campo.selectionStart ?? campo.value.length;
    const fin = campo.selectionEnd ?? inicio;
    const tope = campo.maxLength > 0 ? campo.maxLength : Infinity;
    const sitio = tope - (campo.value.length - (fin - inicio));
    const escrito = texto.slice(0, Math.max(0, sitio));

    campo.value = campo.value.slice(0, inicio) + escrito + campo.value.slice(fin);
    const cursor = inicio + escrito.length;
    campo.setSelectionRange?.(cursor, cursor);
    this.avisarCambio(campo);
  }

  private borrar(): void {
    const campo = this.campoDestino;
    if (!campo || !campo.value) return;

    let inicio = campo.selectionStart ?? campo.value.length;
    const fin = campo.selectionEnd ?? inicio;
    if (inicio === fin && inicio > 0) inicio -= 1;

    campo.value = campo.value.slice(0, inicio) + campo.value.slice(fin);
    campo.setSelectionRange?.(inicio, inicio);
    this.avisarCambio(campo);
  }

  /** El campo cambió como si lo hubiera tecleado la persona. */
  private avisarCambio(campo: CampoTexto): void {
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    campo.dispatchEvent(new Event('change', { bubbles: true }));
    this.enfocarCampo();
  }

  private enfocarCampo(): void {
    const campo = this.campoDestino;
    if (!campo) return;

    try {
      campo.focus({ preventScroll: true });
    } catch {
      campo.focus();
    }
  }

  private tecla(valor: string): TeclaTactil {
    const etiqueta = this.mayus ? valor.toLocaleUpperCase() : valor;
    return { etiqueta, accion: 'escribir', valor: etiqueta };
  }

  private escribirTodas(valores: string[]): TeclaTactil[] {
    return valores.map(valor => ({ etiqueta: valor, accion: 'escribir' as const, valor }));
  }

  private filasLetras(): TeclaTactil[][] {
    return [
      this.escribirTodas(DIGITOS),
      FILA_SUPERIOR.map(letra => this.tecla(letra)),
      FILA_MEDIA.map(letra => this.tecla(letra)),
      [
        { clave: 'keyboardShift', accion: 'mayus', ancha: true, activa: this.mayus },
        ...FILA_INFERIOR.map(letra => this.tecla(letra)),
        { clave: 'keyboardBackspace', accion: 'borrar', ancha: true },
      ],
      [
        { etiqueta: '#+=', accion: 'simbolos', ancha: true },
        ...this.escribirTodas(['@', '.', '-', '_']),
        { clave: 'keyboardSpace', accion: 'escribir', valor: ' ', espacio: true },
      ],
    ];
  }

  private filasSimbolos(): TeclaTactil[][] {
    return [
      this.escribirTodas(DIGITOS),
      this.escribirTodas(SIMBOLOS_FILA_1),
      this.escribirTodas(SIMBOLOS_FILA_2),
      this.escribirTodas(SIMBOLOS_FILA_3),
      [
        { etiqueta: 'ABC', accion: 'letras', ancha: true },
        ...this.escribirTodas(['@', '-', '_']),
        { clave: 'keyboardSpace', accion: 'escribir', valor: ' ', espacio: true },
        { clave: 'keyboardBackspace', accion: 'borrar', ancha: true },
      ],
    ];
  }
}
