import { Component, Inject, OnInit, Optional } from '@angular/core';
import { FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfiguracionService } from 'src/app/services/configuracion.service';
import { Configuracion, ConfiguracionInicial, TipoIdentidadEnum } from 'src/app/models/configuracion.models';
import { TipoIdentidadPaisService, TipoIdentidadPaisVM } from 'src/app/services/tipo-identidad-pais.service';
import { MonedaService } from 'src/app/services/moneda.service';
import { Moneda } from 'src/app/models/moneda.models';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { distinctUntilChanged } from 'rxjs/operators';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { combineLatest } from 'rxjs';
import { LicenciaTenantService } from 'src/app/services/licencia-tenant.service';
import { CARACTERISTICAS_LICENCIA } from 'src/app/constants/caracteristicas-licencia';

@Component({
  selector: 'app-configuracion-inicial',
  templateUrl: './configuracion-inicial.component.html',
  styleUrls: ['./configuracion-inicial.component.css']
})
export class ConfiguracionInicialComponent implements OnInit {
  readonly esModoInicial: boolean;
  licenciaCargada = false;
  puedePrecuentas = false;
  puedeCambioEspacio = false;
  puedeReportesCierre = false;
  puedeConsumoArticulo = false;
  puedeAnfitrionas = false;
  puedePropinas = false;
  puedeCargoDelivery = false;
  puedeTragoCortesia = false;
  puedeServicio = false;
  tiposIdentidadPais: TipoIdentidadPaisVM[] = [];
  tiposEnum = TipoIdentidadEnum;
  enumKeys = Object.keys(TipoIdentidadEnum).filter(k => isNaN(Number(k)));
  monedas: Moneda[] = [];

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
    CambioEspacio: [true],
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
    IdMoneda: [null as string | null, Validators.required],
    SimboloMoneda: [''],
    CodigoISO4217: [''],
  });

  formInicial = this.fb.group({
    RazonSocial: ['', [Validators.required, Validators.maxLength(120)]],
    NombreComercial: ['', [Validators.required, Validators.maxLength(120)]],
    Direccion: ['', [Validators.required, Validators.maxLength(120)]],
    Telefono: ['', [Validators.required, Validators.maxLength(50)]],
  });

  mascaraHint?: string;
  regexValidacion?: string;

  constructor(
    private fb: FormBuilder,
    private snack: MatSnackBar,
    private configSrv: ConfiguracionService,
    private tipIdPaisSrv: TipoIdentidadPaisService,
    private monedaSrv: MonedaService,
    private licenciaSrv: LicenciaTenantService,
    private dialogRef: MatDialogRef<ConfiguracionInicialComponent>,
    private texts: TenantTextCatalogService,
    @Optional() @Inject(MAT_DIALOG_DATA)
    data: { modoInicial?: boolean } | null
  ) {
    this.esModoInicial = data?.modoInicial !== false;
  }

  ngOnInit(): void {
    combineLatest([
      this.configSrv.get(),
      this.licenciaSrv.obtenerEstado(),
    ]).subscribe(([cfg, estadoLicencia]) => {
      if (cfg) {
        this.form.patchValue(cfg);
        this.formInicial.patchValue({
          RazonSocial: cfg.RazonSocial,
          NombreComercial: cfg.NombreComercial,
          Direccion: cfg.Direccion,
          Telefono: cfg.Telefono,
        });
      }

      this.puedePrecuentas = this.licenciaSrv.evaluar(
        estadoLicencia,
        CARACTERISTICAS_LICENCIA.VentasPrecuenta,
      );
      this.puedeCambioEspacio = this.licenciaSrv.evaluar(
        estadoLicencia,
        CARACTERISTICAS_LICENCIA.VentasMesa,
      );
      this.puedeReportesCierre = this.licenciaSrv.evaluar(
        estadoLicencia,
        [
          CARACTERISTICAS_LICENCIA.OperacionCaja,
          CARACTERISTICAS_LICENCIA.OperacionReportes,
        ],
      );
      this.puedeConsumoArticulo = this.licenciaSrv.evaluar(
        estadoLicencia,
        [
          CARACTERISTICAS_LICENCIA.OperacionCaja,
          CARACTERISTICAS_LICENCIA.OperacionReportes,
          CARACTERISTICAS_LICENCIA.AlmacenGestion,
        ],
      );
      this.puedeAnfitrionas = this.licenciaSrv.evaluar(
        estadoLicencia,
        CARACTERISTICAS_LICENCIA.ReportesComisionAnfitrionas,
      );
      this.puedePropinas = this.licenciaSrv.evaluar(
        estadoLicencia,
        CARACTERISTICAS_LICENCIA.OperacionCaja,
      );
      this.puedeCargoDelivery = this.licenciaSrv.evaluar(
        estadoLicencia,
        CARACTERISTICAS_LICENCIA.VentasDelivery,
      );
      this.puedeTragoCortesia = this.licenciaSrv.evaluar(
        estadoLicencia,
        CARACTERISTICAS_LICENCIA.VentasEntradas,
      );
      this.puedeServicio = this.puedePropinas;

      this.normalizarSegunLicencia();
      this.licenciaCargada = true;

      if (!this.esModoInicial) {
        const pais = this.form.get('PaisISO2')!.value;
        if (pais) this.onPaisChange(pais);
        this.applyBusinessRules();
      }
    });

    if (this.esModoInicial) {
      return;
    }

    this.form.get('Precuentas')!.valueChanges
      .subscribe(() => this.applyBusinessRules());

    this.form.get('PaisISO2')!.valueChanges
      .pipe(distinctUntilChanged())
      .subscribe(pais => this.onPaisChange(pais));

    this.form.get('IdTipoIdentidad')!.valueChanges
      .subscribe(() => this.onTipoIdentidadChange());

    // cuando cambia la moneda, sincronizar símbolo e ISO
    this.form.get('IdMoneda')!.valueChanges
      .subscribe(idMoneda => this.onMonedaChange(idMoneda));
  }

  private normalizarSegunLicencia(): void {
    const valores: Partial<Configuracion> = {
      // Son campos heredados que actualmente no activan ningún comportamiento.
      Traslado: false,
      Diario: false,
      IncluirExpressEnCierre: false,
    };

    if (!this.puedePrecuentas) {
      valores.Precuentas = false;
      valores.NroPrecuentas = 0;
    }
    if (!this.puedeCambioEspacio) valores.CambioEspacio = false;
    if (!this.puedeReportesCierre) {
      valores.ResumenVenta = false;
      valores.VentaPorProducto = false;
      valores.Liquidacion = false;
      valores.GastosDiarios = false;
    }
    if (!this.puedeConsumoArticulo) valores.ConsumoArticulo = false;
    if (!this.puedeAnfitrionas) valores.Anfitrionas = false;
    if (!this.puedePropinas) valores.TieneProductoPropina = false;
    if (!this.puedeCargoDelivery) valores.TieneProductoPrecioDelivery = false;
    if (!this.puedeTragoCortesia) valores.TieneDescuentoTragoCortesia = false;
    if (!this.puedeServicio) valores.Servicio = 0;

    this.form.patchValue(valores, { emitEvent: false });
    this.applyBusinessRules();
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
    if (!p) {
      this.tiposIdentidadPais = [];
      this.monedas = [];
      return;
    }

    // Tipos de identidad por país
    this.tipIdPaisSrv.byPais(p).subscribe(list => {
      this.tiposIdentidadPais = (list || []).filter(x => x.Activo);

      const sel = this.form.value.IdTipoIdentidad as string | null;
      if (!sel || !this.tiposIdentidadPais.some(x => x.IdTipoIdentidad === sel)) {
        const first = this.tiposIdentidadPais[0]?.IdTipoIdentidad ?? null;
        this.form.patchValue({ IdTipoIdentidad: first }, { emitEvent: false });
      }
      this.onTipoIdentidadChange();
    });

    // Monedas por país
    this.monedaSrv.getMonedaPorPais(p).subscribe(r => {
      this.monedas = r.Data || [];

      const selMoneda = this.form.value.IdMoneda;
      if (!selMoneda || !this.monedas.some(m => m.IdMoneda === selMoneda)) {
        const primera = this.monedas[0]?.IdMoneda ?? null;
        this.form.patchValue({ IdMoneda: primera }, { emitEvent: false });
        this.onMonedaChange(primera);
      }
    });
  }

  private onTipoIdentidadChange(): void {
    const sel = this.form.value.IdTipoIdentidad as string | null;
    const pais = this.form.value.PaisISO2!;
    const meta = this.tiposIdentidadPais.find(x => x.IdTipoIdentidad === sel && x.PaisISO2 === pais);
    this.mascaraHint = meta?.Mascara ?? undefined;
    this.regexValidacion = meta?.RegexValidacion ?? undefined;

    // aplicar/retirar validador regex si existe
    const ctrl = this.form.get('NumeroIdentificacion')!;
    const validators = [Validators.required, Validators.maxLength(20)];
    if (this.regexValidacion) {
      const rx = new RegExp(this.regexValidacion);
      validators.push((c: AbstractControl): ValidationErrors | null => rx.test(c.value || '') ? null : { formatoInvalido: true });
    }
    ctrl.setValidators(validators);
    ctrl.updateValueAndValidity();
  }

  private onMonedaChange(idMoneda: string | null): void {
    const moneda = this.monedas.find(m => m.IdMoneda === idMoneda);
    this.form.patchValue({
      SimboloMoneda: moneda?.Simbolo ?? '',
      CodigoISO4217: moneda?.CodigoISO ?? '',
    }, { emitEvent: false });
  }

  salir() {
    this.dialogRef.close();
  }

  guardar(): void {
    const formulario = this.esModoInicial ? this.formInicial : this.form;
    if (formulario.invalid) {
      formulario.markAllAsTouched();
      this.snack.open(this.texts.get('checkRequiredFields'), this.texts.get('ok'), { duration: 3000 });
      return;
    }
    const operacion = this.esModoInicial
      ? this.configSrv.saveInitial(this.formInicial.getRawValue() as ConfiguracionInicial)
      : this.configSrv.save(this.form.getRawValue() as Configuracion);

    operacion.subscribe({
      next: () => {
        this.snack.open(this.texts.get('configSaved'), this.texts.get('ok'), { duration: 2500 });
      // ← importante: cerrar con 'true' para que el login sepa que ya está configurado
        this.dialogRef.close(true);
      },
      error: (e) => this.snack.open(e?.error?.Message || this.texts.get('couldNotSave'), this.texts.get('ok'), { duration: 3000 })
    });
  }
}
