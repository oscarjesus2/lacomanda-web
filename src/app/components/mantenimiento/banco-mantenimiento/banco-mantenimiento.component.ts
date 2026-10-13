import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BancoDestino, CrearBancoDestino } from 'src/app/models/banco-destino.models';
import { Moneda } from 'src/app/models/moneda.models';
import { BancoDestinoService } from 'src/app/services/banco-destino.service';
import { MonedaService } from 'src/app/services/moneda.service';
import { TenantTextCatalogService } from 'src/app/services/localization/tenant-text-catalog.service';
import { ConfiguracionService } from 'src/app/services/configuracion.service';

/** Mantenimiento del maestro de cuentas bancarias del tenant. */
@Component({
  selector: 'app-banco-mantenimiento',
  templateUrl: './banco-mantenimiento.component.html',
})
export class BancoMantenimientoComponent implements OnInit {
  bancos: BancoDestino[] = [];
  monedas: Moneda[] = [];
  mostrarFormulario = false;
  guardando = false;
  paisISO2 = 'PE';
  readonly columnas = [
    'Descripcion',
    'NumeroCuenta',
    'Interbancaria',
    'IdMoneda',
    'Activo',
    'Acciones',
  ];

  readonly formulario = this.formBuilder.group({
    IdBanco: [0],
    Descripcion: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    NumeroCuenta: [''],
    Cci: [''],
    Iban: [''],
    BicSwift: [''],
    IdMoneda: ['', Validators.required],
    Activo: [true],
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly bancoService: BancoDestinoService,
    private readonly monedaService: MonedaService,
    private readonly configuracionService: ConfiguracionService,
    private readonly dialogRef: MatDialogRef<BancoMantenimientoComponent>,
    private readonly snackBar: MatSnackBar,
    private readonly texts: TenantTextCatalogService,
  ) {}

  ngOnInit(): void {
    this.cargarPais();
    this.cargarBancos();
    this.cargarMonedas();
  }

  nuevo(): void {
    this.formulario.reset({
      IdBanco: 0,
      Descripcion: '',
      NumeroCuenta: '',
      Cci: '',
      Iban: '',
      BicSwift: '',
      IdMoneda: this.monedas[0]?.IdMoneda ?? '',
      Activo: true,
    });
    this.mostrarFormulario = true;
  }

  editar(banco: BancoDestino): void {
    this.formulario.reset({
      IdBanco: banco.IdBanco,
      Descripcion: banco.Descripcion,
      NumeroCuenta: banco.NumeroCuenta ?? '',
      Cci: banco.Cci ?? '',
      Iban: banco.Iban ?? '',
      BicSwift: banco.BicSwift ?? '',
      IdMoneda: banco.IdMoneda,
      Activo: banco.Activo,
    });
    this.mostrarFormulario = true;
  }

  cancelar(): void {
    this.mostrarFormulario = false;
    this.formulario.reset();
  }

  guardar(): void {
    if (this.formulario.invalid || this.guardando) {
      this.formulario.markAllAsTouched();
      return;
    }

    const datos = this.formulario.getRawValue();
    const solicitud: CrearBancoDestino = {
      Descripcion: datos.Descripcion ?? '',
      NumeroCuenta: datos.NumeroCuenta ?? '',
      Cci: datos.Cci ?? '',
      Iban: datos.Iban ?? '',
      BicSwift: datos.BicSwift ?? '',
      IdMoneda: datos.IdMoneda ?? '',
    };
    this.guardando = true;
    const operacion = datos.IdBanco
      ? this.bancoService.actualizar(datos.IdBanco, {
          ...solicitud,
          Activo: !!datos.Activo,
        })
      : this.bancoService.crear(solicitud);

    operacion.subscribe({
      next: response => {
        this.guardando = false;
        if (!response?.Success) {
          this.mostrarError(response?.Message);
          return;
        }
        this.bancoService.notificarCambios();
        this.cargarBancos();
        this.cancelar();
      },
      error: error => {
        this.guardando = false;
        this.mostrarError(error?.error?.Message);
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  private cargarBancos(): void {
    this.bancoService.listarMaestro().subscribe({
      next: response => {
        if (response?.Success) this.bancos = response.Data ?? [];
        else this.mostrarError(response?.Message);
      },
      error: error => this.mostrarError(error?.error?.Message),
    });
  }

  private cargarMonedas(): void {
    this.monedaService.getMoneda().subscribe({
      next: response => this.monedas = (response?.Data ?? [])
        .filter(moneda => !!moneda.IdMoneda),
      error: error => this.mostrarError(error?.error?.Message),
    });
  }

  private cargarPais(): void {
    const aplicarPais = (pais?: string | null): void => {
      this.paisISO2 = (pais || 'PE').trim().toUpperCase();
      this.configurarValidadoresCuenta();
    };
    const configuracion = this.configuracionService.snapshot;
    if (configuracion) {
      aplicarPais(configuracion.PaisISO2);
      return;
    }

    this.configuracionService.get().subscribe({
      next: respuesta => aplicarPais(respuesta?.PaisISO2),
      error: () => aplicarPais(),
    });
  }

  private configurarValidadoresCuenta(): void {
    const numeroCuenta = this.formulario.controls.NumeroCuenta;
    const cci = this.formulario.controls.Cci;
    const iban = this.formulario.controls.Iban;
    const bicSwift = this.formulario.controls.BicSwift;

    if (this.esEspana) {
      numeroCuenta.clearValidators();
      cci.clearValidators();
      iban.setValidators([Validators.required, Validators.maxLength(34)]);
      bicSwift.setValidators([Validators.maxLength(20)]);
    } else {
      numeroCuenta.setValidators([
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
      ]);
      cci.setValidators([Validators.maxLength(30)]);
      iban.clearValidators();
      bicSwift.clearValidators();
    }

    [numeroCuenta, cci, iban, bicSwift].forEach(control =>
      control.updateValueAndValidity({ emitEvent: false }));
  }

  get esEspana(): boolean {
    return this.paisISO2 === 'ES';
  }

  private mostrarError(mensaje?: string): void {
    this.snackBar.open(
      mensaje || this.texts.get('couldNotSave'),
      this.texts.get('ok'),
      { duration: 3500 },
    );
  }
}
