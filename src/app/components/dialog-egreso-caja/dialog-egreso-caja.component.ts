import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { lastValueFrom } from 'rxjs';
import {
  EgresoCajaArticulo,
  EgresoCajaBeneficiario,
  EgresoCajaCatalogo,
  EgresoCajaCrear,
  EgresoCajaPresentacion,
} from 'src/app/models/egreso-caja.models';
import { ProveedorGuardar } from 'src/app/models/proveedor.models';
import { EgresoCajaService } from 'src/app/services/egreso-caja.service';
import Swal from 'sweetalert2';

export interface DialogEgresoCajaData {
  idCaja: number;
  idTurno: number;
  simbolo: string;
}

interface LineaEgreso {
  IdProducto: number | null;
  IdPresentacionCompra: number | null;
  IdSubAreaAlmacen: number | null;
  Cantidad: number;
  Precio: number;
  UnidadMedida: string;
  EsServicio: boolean;
  Inventariable: boolean;
}

@Component({
  selector: 'app-dialog-egreso-caja',
  templateUrl: './dialog-egreso-caja.component.html',
  styleUrls: ['./dialog-egreso-caja.component.css'],
})
export class DialogEgresoCajaComponent implements OnInit {
  @ViewChild('conceptoInput') conceptoInput?: ElementRef<HTMLTextAreaElement>;

  catalogo: EgresoCajaCatalogo | null = null;
  cargando = true;
  guardando = false;

  idProveedor: number | null = null;
  beneficiarioBusqueda = '';
  registrandoBeneficiario = false;
  nuevoProveedor = new ProveedorGuardar();
  idSubTipoMovimiento: number | null = null;
  concepto = '';
  referencia = '';
  lineas: LineaEgreso[] = [this.crearLinea()];

  constructor(
    private readonly dialogRef: MatDialogRef<DialogEgresoCajaComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: DialogEgresoCajaData,
    private readonly egresoCajaService: EgresoCajaService,
  ) {}

  ngOnInit(): void {
    void this.cargarCatalogo();
  }

  get beneficiariosFiltrados(): EgresoCajaBeneficiario[] {
    const termino = this.normalizar(this.beneficiarioBusqueda);
    const beneficiarios = this.catalogo?.Beneficiarios ?? [];
    if (!termino) {
      return beneficiarios.slice(0, 50);
    }

    return beneficiarios.filter(beneficiario =>
      this.normalizar(
        `${beneficiario.RazonSocial} ${beneficiario.NumeroIdentificacion}`,
      ).includes(termino),
    ).slice(0, 50);
  }

  get beneficiarioSeleccionado(): EgresoCajaBeneficiario | null {
    return this.catalogo?.Beneficiarios.find(
      beneficiario => beneficiario.IdProveedor === this.idProveedor,
    ) ?? null;
  }

  get total(): number {
    return this.lineas.reduce(
      (acumulado, linea) =>
        acumulado +
        (Number(linea.Cantidad) || 0) * (Number(linea.Precio) || 0),
      0,
    );
  }

  get proveedorValido(): boolean {
    if (!this.registrandoBeneficiario) {
      return !!this.idProveedor;
    }

    return !!this.nuevoProveedor.IdTipoIdentidad &&
      !!this.nuevoProveedor.NumeroIdentificacion.trim() &&
      !!this.nuevoProveedor.RazonSocial.trim() &&
      !!this.nuevoProveedor.Direccion.trim();
  }

  get formularioValido(): boolean {
    return this.proveedorValido &&
      !!this.idSubTipoMovimiento &&
      !!this.concepto.trim() &&
      this.concepto.trim().length <= 200 &&
      this.referencia.trim().length <= 15 &&
      this.lineas.length > 0 &&
      this.lineas.every(linea =>
        !!linea.IdProducto &&
        Number(linea.Cantidad) > 0 &&
        Number(linea.Precio) >= 0 &&
        (!linea.Inventariable || !!linea.IdSubAreaAlmacen),
      ) &&
      this.total > 0 &&
      !this.hayArticulosDuplicados;
  }

  get hayArticulosDuplicados(): boolean {
    const ids = this.lineas
      .map(linea => linea.IdProducto)
      .filter((id): id is number => !!id);
    return new Set(ids).size !== ids.length;
  }

  buscarBeneficiario(valor: string): void {
    this.beneficiarioBusqueda = valor;
    const seleccionado = this.beneficiarioSeleccionado;
    if (!seleccionado ||
        this.etiquetaBeneficiario(seleccionado) !== valor) {
      this.idProveedor = null;
      this.validarPresentaciones();
    }
  }

  seleccionarBeneficiario(event: MatAutocompleteSelectedEvent): void {
    const beneficiario = event.option.value as EgresoCajaBeneficiario;
    this.idProveedor = beneficiario.IdProveedor;
    this.beneficiarioBusqueda = this.etiquetaBeneficiario(beneficiario);
    this.registrandoBeneficiario = false;
    this.validarPresentaciones();
  }

  alternarNuevoBeneficiario(): void {
    this.registrandoBeneficiario = !this.registrandoBeneficiario;
    this.idProveedor = null;
    this.beneficiarioBusqueda = '';
    this.nuevoProveedor = new ProveedorGuardar({
      IdTipoIdentidad:
        this.catalogo?.Proveedor.TiposIdentidad[0]?.IdTipoIdentidad ?? '',
    });
    this.validarPresentaciones();
  }

  etiquetaBeneficiario(beneficiario: EgresoCajaBeneficiario): string {
    return beneficiario.NumeroIdentificacion
      ? `${beneficiario.RazonSocial} · ${beneficiario.NumeroIdentificacion}`
      : beneficiario.RazonSocial;
  }

  seleccionarArticulo(linea: LineaEgreso): void {
    const articulo = this.buscarArticulo(linea.IdProducto);
    linea.IdPresentacionCompra = null;
    linea.IdSubAreaAlmacen = null;
    if (!articulo) {
      linea.UnidadMedida = '';
      linea.Precio = 0;
      linea.EsServicio = false;
      linea.Inventariable = false;
      return;
    }

    linea.EsServicio = articulo.EsServicio;
    linea.Inventariable = !articulo.EsServicio && articulo.Inventariable;
    const presentacion = this.presentacionesDisponibles(linea)
      .find(item => item.EsUnidadBase) ??
      this.presentacionesDisponibles(linea)[0];
    this.aplicarPresentacion(linea, presentacion);
    if (linea.Inventariable && this.catalogo?.SubAreas.length === 1) {
      linea.IdSubAreaAlmacen = this.catalogo.SubAreas[0].IdSubAreaAlmacen;
    }
  }

  seleccionarPresentacion(linea: LineaEgreso): void {
    const presentacion = this.presentacionesDisponibles(linea).find(item =>
      this.valorPresentacion(item) === linea.IdPresentacionCompra,
    );
    this.aplicarPresentacion(linea, presentacion);
  }

  presentacionesDisponibles(linea: LineaEgreso): EgresoCajaPresentacion[] {
    const articulo = this.buscarArticulo(linea.IdProducto);
    if (!articulo) {
      return [];
    }

    return articulo.Presentaciones.filter(presentacion =>
      presentacion.IdProveedor === null ||
      (!this.registrandoBeneficiario &&
       presentacion.IdProveedor === this.idProveedor),
    );
  }

  agregarLinea(): void {
    if (this.lineas.length < 50) {
      this.lineas.push(this.crearLinea());
    }
  }

  eliminarLinea(index: number): void {
    if (this.lineas.length === 1) {
      this.lineas[0] = this.crearLinea();
      return;
    }

    this.lineas.splice(index, 1);
  }

  subtotal(linea: LineaEgreso): number {
    return (Number(linea.Cantidad) || 0) * (Number(linea.Precio) || 0);
  }

  trackByIndex(index: number): number {
    return index;
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  async guardar(): Promise<void> {
    if (this.guardando) {
      return;
    }

    const mensajeValidacion = this.obtenerMensajeValidacion();
    if (mensajeValidacion) {
      await Swal.fire(
        'Falta completar información',
        mensajeValidacion,
        'info',
      );
      if (!this.concepto.trim()) {
        this.conceptoInput?.nativeElement.focus();
      }
      return;
    }

    const dto: EgresoCajaCrear = {
      IdCaja: this.data.idCaja,
      IdTurno: this.data.idTurno,
      IdProveedor: this.registrandoBeneficiario ? null : this.idProveedor,
      NuevoProveedor: this.registrandoBeneficiario
        ? this.nuevoProveedor
        : null,
      IdSubTipoMovimiento: this.idSubTipoMovimiento!,
      Concepto: this.concepto.trim(),
      Referencia: this.referencia.trim() || null,
      Detalles: this.lineas.map(linea => ({
        IdProducto: linea.IdProducto!,
        Cantidad: Number(linea.Cantidad),
        Precio: Number(linea.Precio),
        IdPresentacionCompra:
          linea.IdPresentacionCompra && linea.IdPresentacionCompra > 0
            ? linea.IdPresentacionCompra
            : null,
        IdSubAreaAlmacen: linea.Inventariable
          ? linea.IdSubAreaAlmacen
          : null,
      })),
    };

    this.guardando = true;
    try {
      const response = await lastValueFrom(
        this.egresoCajaService.registrar(dto),
      );
      if (!response.Success || !response.Data) {
        throw new Error(response.Message || 'No se pudo registrar el egreso.');
      }

      const inventario = response.Data.GeneroIngresoInventario
        ? ' La mercadería también ingresó al stock.'
        : '';
      await Swal.fire({
        title: 'Egreso registrado',
        text: `${response.Data.NumeroDocumento} · ${this.data.simbolo} ${response.Data.Total.toFixed(2)}.${inventario}`,
        icon: 'success',
        timer: 1900,
        showConfirmButton: false,
      });
      this.dialogRef.close(response.Data);
    } catch (error) {
      console.error('Error al registrar el egreso', error);
      Swal.fire(
        'No se pudo registrar',
        this.obtenerMensajeError(error),
        'error',
      );
    } finally {
      this.guardando = false;
    }
  }

  private async cargarCatalogo(): Promise<void> {
    this.cargando = true;
    try {
      const response = await lastValueFrom(
        this.egresoCajaService.obtenerCatalogo(),
      );
      this.catalogo = response.Success ? response.Data : null;
      if (!this.catalogo) {
        throw new Error('No se pudo cargar la configuración de egresos.');
      }

      this.nuevoProveedor = new ProveedorGuardar({
        IdTipoIdentidad:
          this.catalogo.Proveedor.TiposIdentidad[0]?.IdTipoIdentidad ?? '',
      });
    } catch (error) {
      console.error('Error al cargar el catálogo de egresos', error);
      Swal.fire(
        'Registro de egresos',
        'No se pudieron cargar los beneficiarios y artículos disponibles.',
        'error',
      );
    } finally {
      this.cargando = false;
    }
  }

  private crearLinea(): LineaEgreso {
    return {
      IdProducto: null,
      IdPresentacionCompra: null,
      IdSubAreaAlmacen: null,
      Cantidad: 1,
      Precio: 0,
      UnidadMedida: '',
      EsServicio: false,
      Inventariable: false,
    };
  }

  private validarPresentaciones(): void {
    this.lineas.forEach(linea => {
      if (!linea.IdProducto) {
        return;
      }

      const articulo = this.buscarArticulo(linea.IdProducto);
      if (articulo?.EsServicio) {
        this.aplicarPresentacion(linea);
        return;
      }

      const disponibles = this.presentacionesDisponibles(linea);
      const actual = disponibles.find(item =>
        this.valorPresentacion(item) === linea.IdPresentacionCompra,
      );
      if (!actual) {
        this.aplicarPresentacion(
          linea,
          disponibles.find(item => item.EsUnidadBase) ?? disponibles[0],
        );
      }
    });
  }

  private aplicarPresentacion(
    linea: LineaEgreso,
    presentacion?: EgresoCajaPresentacion,
  ): void {
    const articulo = this.buscarArticulo(linea.IdProducto);
    linea.IdPresentacionCompra =
      articulo && !articulo.EsServicio
        ? this.valorPresentacion(presentacion)
        : null;
    linea.UnidadMedida =
      presentacion?.UnidadCompra ?? articulo?.UnidadMedida ?? '';
    linea.Precio =
      presentacion?.PrecioSugerido ?? articulo?.PrecioSugerido ?? 0;
  }

  valorPresentacion(
    presentacion?: EgresoCajaPresentacion,
  ): number {
    return presentacion?.IdPresentacionCompra ?? 0;
  }

  buscarArticulo(idProducto: number | null): EgresoCajaArticulo | null {
    return this.catalogo?.Articulos.find(
      articulo => articulo.IdProducto === idProducto,
    ) ?? null;
  }

  private normalizar(valor: string): string {
    return (valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private obtenerMensajeValidacion(): string | null {
    if (!this.idSubTipoMovimiento) {
      return 'Seleccione la categoría del egreso.';
    }

    if (!this.proveedorValido) {
      return this.registrandoBeneficiario
        ? 'Complete el tipo y número de identificación, el nombre y la dirección del beneficiario.'
        : 'Seleccione un proveedor o beneficiario.';
    }

    if (!this.concepto.trim()) {
      return 'Ingrese el concepto del egreso.';
    }

    if (this.concepto.trim().length > 200) {
      return 'El concepto no puede superar 200 caracteres.';
    }

    if (this.referencia.trim().length > 15) {
      return 'La referencia no puede superar 15 caracteres.';
    }

    if (this.lineas.length === 0) {
      return 'Agregue al menos un artículo o servicio.';
    }

    const lineaSinArticulo = this.lineas.findIndex(linea => !linea.IdProducto);
    if (lineaSinArticulo >= 0) {
      return `Seleccione el artículo o servicio de la línea ${lineaSinArticulo + 1}.`;
    }

    const lineaCantidadInvalida = this.lineas.findIndex(
      linea => Number(linea.Cantidad) <= 0,
    );
    if (lineaCantidadInvalida >= 0) {
      return `La cantidad de la línea ${lineaCantidadInvalida + 1} debe ser mayor a cero.`;
    }

    const lineaPrecioInvalido = this.lineas.findIndex(
      linea => Number(linea.Precio) < 0,
    );
    if (lineaPrecioInvalido >= 0) {
      return `El precio de la línea ${lineaPrecioInvalido + 1} no puede ser negativo.`;
    }

    const lineaSinAlmacen = this.lineas.findIndex(
      linea => linea.Inventariable && !linea.IdSubAreaAlmacen,
    );
    if (lineaSinAlmacen >= 0) {
      return `Seleccione el almacén de ingreso de la línea ${lineaSinAlmacen + 1}.`;
    }

    if (this.hayArticulosDuplicados) {
      return 'Un mismo artículo o servicio no puede aparecer dos veces.';
    }

    if (this.total <= 0) {
      return 'El total del egreso debe ser mayor a cero.';
    }

    return null;
  }

  private obtenerMensajeError(error: unknown): string {
    const apiError = error as {
      error?: { detail?: string; title?: string; Message?: string };
      message?: string;
    };
    return apiError?.error?.detail ||
      apiError?.error?.Message ||
      apiError?.error?.title ||
      apiError?.message ||
      'Ocurrió un error inesperado.';
  }
}
