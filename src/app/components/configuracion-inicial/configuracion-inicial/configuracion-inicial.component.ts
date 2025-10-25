import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { Configuracion, TipoIdentidadEnum } from 'src/app/models/configuracion.models';
import { TipoIdentidadPaisService, TipoIdentidadPaisVM } from 'src/app/services/tipo-identidad-pais.service';
import { MatDialogRef } from '@angular/material/dialog';
import { distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-configuracion-inicial',
  templateUrl: './configuracion-inicial.component.html',
  styleUrls: ['./configuracion-inicial.component.css']
})
export class ConfiguracionInicialComponent implements OnInit {
  tiposIdentidadPais: TipoIdentidadPaisVM[] = [];
  tiposEnum = TipoIdentidadEnum;
  enumKeys = Object.keys(TipoIdentidadEnum).filter(k => isNaN(Number(k))); // ['DNI','NIE',...]

  // paises = ['PE','ES','AR','CL','MX','CO','US','FR','DE','IT','PT'];
  paises = ['PE','ES'];
  form = this.fb.group({
    IdConfig: [1],
    PaisISO2: [null as string | null, Validators.required],
    IdTipoIdentidad: [null as unknown as string, Validators.required],
    NumeroIdentificacion: ['', [Validators.required, Validators.maxLength(20)]],
    RazonSocial: ['', [Validators.required, Validators.maxLength(120)]],
    NombreComercial: ['', [Validators.required, Validators.maxLength(120)]],
    Direccion: ['', [Validators.required, Validators.maxLength(200)]],
    Telefono: ['', [Validators.required, Validators.maxLength(30)]],
    PiePagina: ['', [Validators.maxLength(200)]],

    Traslado: [false],
    Precuentas: [true],
    CambioMesa: [true],
    Diario: [false],
    NroPrecuentas: [1, [Validators.min(1)]],
    Anfitrionas: [false],
    ResumenVenta: [true],
    VentaPorProducto: [false],
    Liquidacion: [false],
    ConsumoArticulo: [false],
    GastosDiarios: [false],
    IncluirExpressEnCierre: [false],

    TieneProductoPropina: [false],
    TieneProductoPrecioDelivery: [false],
    TieneDescuentoTragoCortesia: [false],
    Servicio: [0, [Validators.min(0), Validators.max(100)]], // %
  });

  mascaraHint?: string;
  regexValidacion?: string;

  constructor(
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private configSrv: ConfiguracionService,
    private tipIdPaisSrv: TipoIdentidadPaisService,
    private dialogRef: MatDialogRef<ConfiguracionInicialComponent>
  ) {}

  ngOnInit(): void {
    // cargar config actual
    this.configSrv.get().subscribe(cfg => {
      if (cfg) this.form.patchValue(cfg);
      const pais = this.form.get('PaisISO2')!.value;
      if (pais) this.onPaisChange(pais);       // ⬅️ solo si ya hay país
      this.applyBusinessRules();
    });

    // reaccionar a cambios de toggles
    this.form.get('Precuentas')!.valueChanges
    .subscribe(() => this.applyBusinessRules());

    this.form.get('PaisISO2')!.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(pais => this.onPaisChange(pais));     // ⬅️ usa el valor emitido

    this.form.get('IdTipoIdentidad')!.valueChanges
      .subscribe(() => this.onTipoIdentidadChange());
    }

  private applyBusinessRules(): void {
    const prec = !!this.form.get('Precuentas')!.value;
    const nro = this.form.get('NroPrecuentas')!;
    if (prec) {
      nro.addValidators([Validators.required, Validators.min(1)]);
      nro.enable({ emitEvent: false });
      if (!nro.value || nro.value < 1) nro.setValue(1, { emitEvent: false });
    } else {
      nro.clearValidators();
      nro.setValue(0, { emitEvent: false });
      nro.disable({ emitEvent: false });
    }
    nro.updateValueAndValidity({ emitEvent: false });
  }

 private onPaisChange(pais: string | null | undefined): void {
  const p = (pais || '').toUpperCase().trim();
  if (!p) { this.tiposIdentidadPais = []; return; }

  console.log('[UI] pais:', p);
  this.tipIdPaisSrv.byPais(p).subscribe(list => {
    console.log('[API] list:', list);
    this.tiposIdentidadPais = (list || []).filter(x => x.Activo);

    const sel = this.form.value.IdTipoIdentidad as string | null;
    if (!sel || !this.tiposIdentidadPais.some(x => x.IdTipoIdentidad === sel)) {
      const first = this.tiposIdentidadPais[0]?.IdTipoIdentidad ?? null;
      this.form.patchValue({ IdTipoIdentidad: first }, { emitEvent: false });
    }
    this.onTipoIdentidadChange();
  });
}

  private onTipoIdentidadChange(): void {
    const sel = this.form.value.IdTipoIdentidad as string | null;
    const pais = this.form.value.PaisISO2!;
    const meta = this.tiposIdentidadPais.find(x => x.IdTipoIdentidad === sel && x.PaisISO2 === pais);
    this.mascaraHint = meta?.Mascara ?? undefined;
    this.regexValidacion = meta?.RegexValidacion ?? undefined;

    // aplicar/retirar validador regex si existe
    const ctrl = this.form.get('NumeroDocumento')!;
    const validators = [Validators.required, Validators.maxLength(20)];
    if (this.regexValidacion) {
      const rx = new RegExp(this.regexValidacion);
      validators.push((c: AbstractControl): ValidationErrors | null => rx.test(c.value || '') ? null : { formatoInvalido: true });
    }
    ctrl.setValidators(validators);
    ctrl.updateValueAndValidity();
  }

   salir() {
    this.dialogRef.close();
   }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snack.open('Revisa los campos requeridos', 'OK', { duration: 3000 });
      return;
    }
    const payload = this.form.getRawValue() as Configuracion;
    console.log(payload);
    this.configSrv.save(payload).subscribe({
      next: () => {
      this.snack.open('Configuración guardada', 'OK', { duration: 2500 });
      // ← importante: cerrar con 'true' para que el login sepa que ya está configurado
      this.dialogRef.close(true);
    },
      error: (e) => this.snack.open(e?.error?.Message || 'No se pudo guardar', 'OK', { duration: 3000 })
    });
  }
}
