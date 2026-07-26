import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { lastValueFrom } from 'rxjs';
import { TipoIdentidad } from 'src/app/models/tipoIdentidad.models';
import {
  DeliveryCliente,
  DeliveryContexto,
  DeliveryDialogData,
  DeliveryDialogResult,
  DeliveryHistorial,
  DeliveryModalidad,
  GuardarDeliveryCliente
} from 'src/app/models/delivery.models';
import { SocioNegocio } from 'src/app/models/socionegocio.models';
import { DeliveryService } from 'src/app/services/delivery.service';
import { TipoDocClienteService } from 'src/app/services/tipodoccliente.service';

@Component({
  selector: 'app-dialog-delivery',
  templateUrl: './dialog-delivery.component.html',
  styleUrls: ['./dialog-delivery.component.css']
})
export class DialogDeliveryComponent implements OnInit {
  readonly form: FormGroup;
  readonly socioForm: FormGroup;
  modalidad: DeliveryModalidad | null = null;
  termino = '';
  clientes: DeliveryCliente[] = [];
  historial: DeliveryHistorial[] = [];
  tiposIdentidad: TipoIdentidad[] = [];
  contexto: DeliveryContexto = { ProductoCargoDelivery: null };
  clienteSeleccionado: DeliveryCliente | null = null;
  clienteOrigen: DeliveryCliente | null = null;
  cargando = false;
  cargandoHistorial = false;
  guardando = false;
  formularioActivo = false;
  private telefonoInicializado = false;

  constructor(
    private readonly dialogRef: MatDialogRef<DialogDeliveryComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: DeliveryDialogData,
    private readonly fb: FormBuilder,
    private readonly deliveryService: DeliveryService,
    private readonly tipoDocClienteService: TipoDocClienteService
  ) {
    this.form = this.fb.group({
      IdCliente: [null],
      Item: [null],
      TelefonoDelivery: [
        '',
        [Validators.required, Validators.pattern(/^(?=(?:\D*\d){7,15}\D*$)[+\d\s()-]+$/)]
      ],
      AnexoDelivery: ['', Validators.maxLength(10)],
      NombresDelivery: ['', [Validators.required, Validators.maxLength(120)]],
      DireccionDelivery: ['', [Validators.required, Validators.maxLength(250)]],
      ReferenciaDelivery: ['', Validators.maxLength(200)],
      PrecioDelivery: [0, [Validators.required, Validators.min(0)]],
      IdTipoIdentidad: ['', Validators.required],
      NumeroIdentificacion: ['', Validators.maxLength(20)],
      RazonSocial: ['', [Validators.required, Validators.maxLength(150)]],
      CorreoDelivery: ['', [Validators.email, Validators.maxLength(150)]]
    });
    this.socioForm = this.fb.group({
      IdSocioNegocio: [null, Validators.required],
      NombreCliente: ['', [Validators.required, Validators.maxLength(120)]]
    });
    this.form.disable();
  }

  ngOnInit(): void {
    // Los datos de clientes se cargan sólo si el usuario elige delivery
    // por teléfono. Los pedidos de plataformas no necesitan esa consulta.
  }

  async buscar(): Promise<void> {
    this.cargando = true;
    try {
      const response = await lastValueFrom(
        this.deliveryService.buscarClientes(this.termino)
      );
      this.clientes = response.Data ?? [];
    } finally {
      this.cargando = false;
    }
  }

  limpiarBusqueda(): void {
    this.termino = '';
    void this.buscar();
  }

  async seleccionar(cliente: DeliveryCliente): Promise<void> {
    this.clienteSeleccionado = cliente;
    this.clienteOrigen = null;
    this.formularioActivo = true;
    this.form.enable();
    this.form.patchValue(cliente);
    this.form.markAsPristine();
    await this.cargarHistorial(cliente.IdCliente);
  }

  nuevo(): void {
    this.clienteSeleccionado = null;
    this.clienteOrigen = null;
    this.historial = [];
    this.formularioActivo = true;
    this.form.enable();
    this.form.reset({
      IdCliente: null,
      Item: null,
      TelefonoDelivery: this.soloDigitos(this.termino) ? this.termino.trim() : '',
      AnexoDelivery: '',
      NombresDelivery: '',
      DireccionDelivery: '',
      ReferenciaDelivery: '',
      PrecioDelivery: 0,
      IdTipoIdentidad: this.tiposIdentidad[0]?.IdTipoIdentidad ?? '',
      NumeroIdentificacion: '',
      RazonSocial: '',
      CorreoDelivery: ''
    });
  }

  nuevaDireccionParaCliente(): void {
    if (!this.clienteSeleccionado) {
      return;
    }

    const cliente = this.clienteSeleccionado;
    this.clienteOrigen = cliente;
    this.clienteSeleccionado = null;
    this.historial = [];
    this.form.reset({
      IdCliente: cliente.IdCliente,
      Item: null,
      TelefonoDelivery: '',
      AnexoDelivery: '',
      NombresDelivery: '',
      DireccionDelivery: '',
      ReferenciaDelivery: '',
      PrecioDelivery: cliente.PrecioDelivery,
      IdTipoIdentidad: cliente.IdTipoIdentidad,
      NumeroIdentificacion: cliente.NumeroIdentificacion,
      RazonSocial: cliente.RazonSocial,
      CorreoDelivery: cliente.CorreoDelivery
    });
  }

  async guardarYContinuar(): Promise<void> {
    if (!this.formularioActivo || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const dto = this.form.getRawValue() as GuardarDeliveryCliente;

    if (dto.PrecioDelivery > 0 && !this.contexto.ProductoCargoDelivery) {
      this.form.get('PrecioDelivery')?.setErrors({ productoNoConfigurado: true });
      return;
    }

    this.guardando = true;
    try {
      const response = await lastValueFrom(
        this.deliveryService.guardarCliente({
          IdCliente: dto.IdCliente,
          Item: dto.Item,
          NumeroIdentificacion: dto.NumeroIdentificacion ?? '',
          IdTipoIdentidad: dto.IdTipoIdentidad,
          RazonSocial: dto.RazonSocial,
          NombresDelivery: dto.NombresDelivery,
          TelefonoDelivery: dto.TelefonoDelivery,
          AnexoDelivery: dto.AnexoDelivery,
          DireccionDelivery: dto.DireccionDelivery,
          ReferenciaDelivery: dto.ReferenciaDelivery,
          CorreoDelivery: dto.CorreoDelivery,
          PrecioDelivery: Number(dto.PrecioDelivery) || 0
        })
      );

      const result: DeliveryDialogResult = {
        Modalidad: 'TELEFONO',
        NombreCliente: response.Data.NombresDelivery,
        Cliente: response.Data,
        SocioNegocio: null,
        ProductoCargoDelivery: this.contexto.ProductoCargoDelivery,
        PreciosSocioNegocio: []
      };
      this.dialogRef.close(result);
    } finally {
      this.guardando = false;
    }
  }

  async seleccionarModalidad(modalidad: DeliveryModalidad): Promise<void> {
    if (modalidad === 'SOCIO_NEGOCIO'
        && this.data.SociosNegocio.length === 0) {
      return;
    }

    this.modalidad = modalidad;

    if (modalidad === 'SOCIO_NEGOCIO'
        && this.data.SociosNegocio.length === 1) {
      this.socioForm.patchValue({
        IdSocioNegocio: this.data.SociosNegocio[0].IdSocioNegocio
      });
    }

    if (modalidad !== 'TELEFONO' || this.telefonoInicializado) {
      return;
    }

    this.cargando = true;
    try {
      const [contexto, tipos, clientes] = await Promise.all([
        lastValueFrom(this.deliveryService.obtenerContexto()),
        lastValueFrom(this.tipoDocClienteService.getTipoDocClientes()),
        lastValueFrom(this.deliveryService.buscarClientes())
      ]);

      this.contexto = contexto.Data ?? { ProductoCargoDelivery: null };
      this.tiposIdentidad = tipos.Data ?? [];
      this.clientes = clientes.Data ?? [];
      this.telefonoInicializado = true;
    } finally {
      this.cargando = false;
    }
  }

  usarClienteVarios(): void {
    this.socioForm.patchValue({ NombreCliente: 'CLIENTE VARIOS' });
    this.socioForm.get('NombreCliente')?.markAsDirty();
  }

  async continuarPorSocio(): Promise<void> {
    if (this.socioForm.invalid) {
      this.socioForm.markAllAsTouched();
      return;
    }

    const idSocioNegocio = Number(
      this.socioForm.get('IdSocioNegocio')?.value
    );
    const socio = this.data.SociosNegocio.find(
      item => item.IdSocioNegocio === idSocioNegocio
    );
    if (!socio) {
      this.socioForm.get('IdSocioNegocio')?.setErrors({ required: true });
      return;
    }

    this.guardando = true;
    try {
      const response = await lastValueFrom(
        this.deliveryService.obtenerPreciosSocioNegocio(idSocioNegocio)
      );
      const nombreCliente = String(
        this.socioForm.get('NombreCliente')?.value ?? ''
      ).trim().toUpperCase();

      this.dialogRef.close({
        Modalidad: 'SOCIO_NEGOCIO',
        NombreCliente: `${socio.Descripcion} - ${nombreCliente}`,
        Cliente: null,
        SocioNegocio: socio,
        ProductoCargoDelivery: null,
        PreciosSocioNegocio: response.Data ?? []
      } as DeliveryDialogResult);
    } finally {
      this.guardando = false;
    }
  }

  salir(): void {
    this.dialogRef.close();
  }

  compararSocio(a: number | null, b: number | null): boolean {
    return Number(a) === Number(b);
  }

  private async cargarHistorial(idCliente: number): Promise<void> {
    this.cargandoHistorial = true;
    try {
      const response = await lastValueFrom(
        this.deliveryService.obtenerHistorial(idCliente)
      );
      this.historial = response.Data ?? [];
    } finally {
      this.cargandoHistorial = false;
    }
  }

  private soloDigitos(value: string): boolean {
    return !!value && /^[+\d\s()-]+$/.test(value.trim());
  }
}
