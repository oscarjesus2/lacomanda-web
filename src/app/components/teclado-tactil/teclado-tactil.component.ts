import {
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';

import { TenantTextKey } from 'src/app/services/localization/tenant-text-catalog.service';

export type ModoTecladoTactil = 'texto' | 'numerico';

/** Qué juego de teclas está a la vista en este momento. */
export type VistaTecladoTactil = 'numeros' | 'letras' | 'simbolos';

type AccionTecla =
  | 'escribir'
  | 'borrar'
  | 'mayus'
  | 'simbolos'
  | 'letras'
  | 'numeros';

export interface TeclaTactil {
  /** Lo que se ve en la tecla cuando el rótulo es universal (letras, signos). */
  etiqueta?: string;
  /** Rótulo traducido, para las teclas de servicio. */
  clave?: TenantTextKey;
  accion: AccionTecla;
  /** Carácter que se escribe cuando la acción es escribir. */
  valor?: string;
  /** Icono de Material en lugar de texto (teclas de servicio). */
  icono?: string;
  /** Nombre accesible cuando la tecla se muestra como icono. */
  aria?: TenantTextKey;
  ancha?: boolean;
  espacio?: boolean;
  activa?: boolean;
}

const DIGITOS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const FILA_SUPERIOR = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
const FILA_MEDIA = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'];
const FILA_INFERIOR = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];
const SIMBOLOS_FILA_1 = ['!', '"', '#', '$', '%', '&', '/', '(', ')', '='];
const SIMBOLOS_FILA_2 = ['?', '¿', '¡', '+', '*', "'", ':', ';', ',', '.'];
const SIMBOLOS_FILA_3 = ['[', ']', '{', '}', '<', '>', '\\', '|', '^', '~'];

/**
 * Teclado en pantalla para estaciones táctiles. Las filas se reparten el ancho
 * disponible y la altura de las teclas sigue al viewport, así el teclado entra
 * completo tanto en el monitor de la caja como en una tablet.
 *
 * Es una pieza de presentación: recibe el valor, devuelve el valor editado y
 * avisa cuando la persona pulsa la tecla de confirmación. Quien lo usa decide
 * qué significa confirmar.
 */
@Component({
  selector: 'app-teclado-tactil',
  templateUrl: './teclado-tactil.component.html',
  styleUrls: ['./teclado-tactil.component.css'],
})
export class TecladoTactilComponent {
  /** Texto que se está editando. */
  @Input() valor = '';
  @Output() valorChange = new EventEmitter<string>();

  /** Con qué vista abre: importes (numérico) o texto libre. */
  @Input() modo: ModoTecladoTactil = 'texto';

  /** En importes, si se admite separador decimal. */
  @Input() decimales = true;

  /** En importes, si se permite cambiar a letras (códigos, contraseñas). */
  @Input() permiteLetras = true;

  /** Límite de caracteres; 0 es sin límite. */
  @Input() maxLength = 0;

  /** La persona terminó de escribir. */
  @Output() aceptar = new EventEmitter<void>();

  /** Cambió el juego de teclas: quien lo usa puede ajustar su espacio. */
  @Output() vistaChange = new EventEmitter<VistaTecladoTactil>();

  private mayus = false;
  private vista: VistaTecladoTactil | null = null;

  /** Las filas de la vista actual, ya con mayúsculas resueltas. */
  get filas(): TeclaTactil[][] {
    switch (this.vistaActual) {
      case 'numeros':
        return this.filasNumericas();
      case 'simbolos':
        return this.filasSimbolos();
      default:
        return this.filasLetras();
    }
  }

  get esVistaNumerica(): boolean {
    return this.vistaActual === 'numeros';
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
        break;
      case 'simbolos':
        this.cambiarVista('simbolos');
        break;
      case 'letras':
        this.cambiarVista('letras');
        break;
      case 'numeros':
        this.cambiarVista('numeros');
        break;
    }
  }

  /** Vacía el campo. Lo usan los diálogos desde su propia botonera. */
  limpiar(): void {
    this.publicar('');
  }

  confirmar(): void {
    this.aceptar.emit();
  }

  private get vistaActual(): VistaTecladoTactil {
    if (this.vista) return this.vista;
    return this.modo === 'numerico' ? 'numeros' : 'letras';
  }

  private cambiarVista(vista: VistaTecladoTactil): void {
    if (this.vistaActual === vista) return;

    this.vista = vista;
    this.vistaChange.emit(vista);
  }

  private escribir(caracter: string): void {
    if (!caracter) return;
    if (caracter === '.' && this.esVistaNumerica && this.valor.includes('.')) return;
    if (this.maxLength > 0 && this.valor.length >= this.maxLength) return;

    this.publicar(this.valor + caracter);
  }

  private borrar(): void {
    if (!this.valor) return;
    this.publicar(this.valor.slice(0, -1));
  }

  private publicar(valor: string): void {
    this.valor = valor;
    this.valorChange.emit(valor);
  }

  private teclaTexto(valor: string): TeclaTactil {
    const etiqueta = this.mayus ? valor.toLocaleUpperCase() : valor;
    return { etiqueta, accion: 'escribir', valor: etiqueta };
  }

  private get teclaBorrar(): TeclaTactil {
    return {
      accion: 'borrar',
      icono: 'backspace',
      aria: 'keyboardBackspace',
      ancha: true,
    };
  }

  private filasLetras(): TeclaTactil[][] {
    const vuelta: TeclaTactil[] = this.modo === 'numerico'
      ? [{ etiqueta: '123', accion: 'numeros', ancha: true }]
      : [{ etiqueta: '#+=', accion: 'simbolos', ancha: true }];

    return [
      DIGITOS.map(digito => ({ etiqueta: digito, accion: 'escribir' as const, valor: digito })),
      FILA_SUPERIOR.map(letra => this.teclaTexto(letra)),
      FILA_MEDIA.map(letra => this.teclaTexto(letra)),
      [
        {
          clave: 'keyboardShift',
          accion: 'mayus',
          ancha: true,
          activa: this.mayus,
        },
        ...FILA_INFERIOR.map(letra => this.teclaTexto(letra)),
        this.teclaBorrar,
      ],
      [
        ...vuelta,
        { etiqueta: '@', accion: 'escribir', valor: '@' },
        { etiqueta: '.', accion: 'escribir', valor: '.' },
        { etiqueta: '-', accion: 'escribir', valor: '-' },
        { etiqueta: '_', accion: 'escribir', valor: '_' },
        { clave: 'keyboardSpace', accion: 'escribir', valor: ' ', espacio: true },
      ],
    ];
  }

  private filasSimbolos(): TeclaTactil[][] {
    const escribir = (valores: string[]): TeclaTactil[] =>
      valores.map(valor => ({ etiqueta: valor, accion: 'escribir' as const, valor }));

    return [
      escribir(DIGITOS),
      escribir(SIMBOLOS_FILA_1),
      escribir(SIMBOLOS_FILA_2),
      escribir(SIMBOLOS_FILA_3),
      [
        { etiqueta: 'ABC', accion: 'letras', ancha: true },
        { etiqueta: '@', accion: 'escribir', valor: '@' },
        { etiqueta: '-', accion: 'escribir', valor: '-' },
        { etiqueta: '_', accion: 'escribir', valor: '_' },
        { clave: 'keyboardSpace', accion: 'escribir', valor: ' ', espacio: true },
        this.teclaBorrar,
      ],
    ];
  }

  private filasNumericas(): TeclaTactil[][] {
    const numero = (valor: string): TeclaTactil => ({
      etiqueta: valor,
      accion: 'escribir',
      valor,
    });

    const ultima: TeclaTactil[] = [];
    if (this.permiteLetras) ultima.push({ etiqueta: 'ABC', accion: 'letras' });
    ultima.push(numero('0'));
    if (this.decimales) ultima.push(numero('.'));
    ultima.push(this.teclaBorrar);

    return [
      ['7', '8', '9'].map(numero),
      ['4', '5', '6'].map(numero),
      ['1', '2', '3'].map(numero),
      ultima,
    ];
  }
}
