import {
  Component,
  EventEmitter,
  forwardRef,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BancoDestino } from 'src/app/models/banco-destino.models';
import { BancoDestinoService } from 'src/app/services/banco-destino.service';

/** Selector reutilizable que consume exclusivamente el maestro de bancos activo. */
@Component({
  selector: 'app-selector-banco-destino',
  templateUrl: './selector-banco-destino.component.html',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SelectorBancoDestinoComponent),
    multi: true,
  }],
})
export class SelectorBancoDestinoComponent
  implements ControlValueAccessor, OnInit, OnDestroy {
  @Input() appearance: 'fill' | 'outline' = 'fill';
  @Input() compacto = false;
  @Input() set idBanco(valor: number | null | undefined) {
    this.writeValue(valor);
  }
  @Input() set idMoneda(valor: string | null | undefined) {
    this.monedaFiltro = valor?.trim().toUpperCase() || null;
    this.reconciliarSeleccion();
  }
  @Output() readonly idBancoChange = new EventEmitter<number | null>();
  @Output() readonly bancoSeleccionado = new EventEmitter<BancoDestino | null>();

  bancos: BancoDestino[] = [];
  valor: number | null = null;
  deshabilitado = false;
  private monedaFiltro: string | null = null;
  private bancosCargados = false;
  private cambiosSubscription?: Subscription;

  private onChange: (valor: number | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor(private readonly bancoDestinoService: BancoDestinoService) {}

  ngOnInit(): void {
    this.cargarBancos();
    this.cambiosSubscription = this.bancoDestinoService.cambios$
      .subscribe(() => this.cargarBancos());
  }

  ngOnDestroy(): void {
    this.cambiosSubscription?.unsubscribe();
  }

  get bancosDisponibles(): BancoDestino[] {
    return this.bancos.filter(banco =>
      !this.monedaFiltro || banco.IdMoneda?.toUpperCase() === this.monedaFiltro);
  }

  writeValue(valor: number | null | undefined): void {
    const idBanco = Number(valor);
    this.valor = Number.isInteger(idBanco) && idBanco > 0 ? idBanco : null;
    this.reconciliarSeleccion();
  }

  registerOnChange(fn: (valor: number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(deshabilitado: boolean): void {
    this.deshabilitado = deshabilitado;
  }

  seleccionar(idBanco: number | null): void {
    const valorNormalizado = Number(idBanco);
    this.valor = Number.isInteger(valorNormalizado) && valorNormalizado > 0 &&
      this.bancosDisponibles.some(banco => banco.IdBanco === valorNormalizado)
      ? valorNormalizado
      : null;
    const banco = this.bancos.find(item => item.IdBanco === this.valor) ?? null;
    this.onChange(this.valor);
    this.onTouched();
    this.idBancoChange.emit(this.valor);
    this.bancoSeleccionado.emit(banco);
  }

  private cargarBancos(): void {
    this.bancoDestinoService.listar().subscribe({
      next: response => {
        this.bancos = response?.Data ?? [];
        this.bancosCargados = true;
        this.reconciliarSeleccion();
      },
      error: () => {
        this.bancos = [];
        this.bancosCargados = true;
        this.reconciliarSeleccion();
      },
    });
  }

  private reconciliarSeleccion(): void {
    if (!this.bancosCargados || !this.valor) return;
    const banco = this.bancosDisponibles.find(item => item.IdBanco === this.valor);
    if (!banco) {
      this.seleccionar(null);
      return;
    }
    this.bancoSeleccionado.emit(banco);
  }
}
