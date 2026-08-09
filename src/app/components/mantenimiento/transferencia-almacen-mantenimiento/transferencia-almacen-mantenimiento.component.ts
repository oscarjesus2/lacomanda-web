import { Component, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import {
  TransferenciaAlmacen,
  TransferenciaAlmacenArticulo,
  TransferenciaAlmacenCatalogos,
  TransferenciaAlmacenDetalleGuardar,
  TransferenciaAlmacenGuardar,
  TransferenciaAlmacenResumen,
  TransferenciaAlmacenSubArea
} from 'src/app/models/transferencia-almacen.models';
import { TransferenciaAlmacenService } from 'src/app/services/transferencia-almacen.service';

interface TransferenciaLinea extends TransferenciaAlmacenDetalleGuardar {
  Producto: string;
  IdUnidadMedida: number;
  UnidadMedida: string;
  StockDisponible: number;
}

@Component({
  selector: 'app-transferencia-almacen-mantenimiento',
  templateUrl: './transferencia-almacen-mantenimiento.component.html'
})
export class TransferenciaAlmacenMantenimientoComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
    }
  }

  readonly displayedColumns = [
    'numero', 'fecha', 'origen', 'destino', 'articulos', 'cantidad', 'estado', 'acciones'
  ];
  dataSource = new MatTableDataSource<TransferenciaAlmacenResumen>([]);
  catalogos: TransferenciaAlmacenCatalogos | null = null;
  transferencia: TransferenciaAlmacen | null = null;
  formulario: TransferenciaAlmacenGuardar = this.formularioInicial();
  lineas: TransferenciaLinea[] = [];
  filtro = {
    FechaInicio: this.inicioMes(), FechaFin: new Date(),
    IdSubAreaAlmacenOrigen: null as number | null,
    IdSubAreaAlmacenDestino: null as number | null,
    Estado: null as number | null, Buscar: ''
  };
  idArticuloAgregar: number | null = null;
  cantidadAgregar = 1;
  idOrigenAnterior: number | null = null;
  showForm = false;
  cargando = false;
  guardando = false;

  constructor(
    private readonly dialogRef: MatDialogRef<TransferenciaAlmacenMantenimientoComponent>,
    private readonly service: TransferenciaAlmacenService
  ) {}

  ngOnInit(): void { this.cargarInicial(); }

  cargarInicial(): void {
    this.cargando = true;
    forkJoin({ catalogos: this.service.catalogos(), transferencias: this.service.listar(this.filtro) })
      .subscribe({
        next: response => {
          this.cargando = false;
          if (!response.catalogos.Success || !response.transferencias.Success) {
            Swal.fire('No se pudo iniciar', response.catalogos.Message || response.transferencias.Message, 'error');
            return;
          }
          this.catalogos = response.catalogos.Data;
          this.dataSource.data = response.transferencias.Data || [];
        },
        error: error => { this.cargando = false; this.mostrarError(error, 'No se pudieron cargar las transferencias.'); }
      });
  }

  buscar(): void {
    this.cargando = true;
    this.service.listar(this.filtro).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success) {
          Swal.fire('Error', response.Message || 'No se pudo realizar la búsqueda.', 'error');
          return;
        }
        this.dataSource.data = response.Data || [];
        this.dataSource.paginator?.firstPage();
      },
      error: error => { this.cargando = false; this.mostrarError(error, 'No se pudo realizar la búsqueda.'); }
    });
  }

  nuevo(): void {
    this.transferencia = null;
    this.formulario = this.formularioInicial();
    this.formulario.IdSubAreaAlmacenOrigen = this.catalogos?.SubAreas[0]?.Id || null;
    this.idOrigenAnterior = this.formulario.IdSubAreaAlmacenOrigen;
    this.formulario.IdSubAreaAlmacenDestino = this.subAreasDestino[0]?.Id || null;
    this.lineas = [];
    this.limpiarLinea();
    this.showForm = true;
  }

  abrir(row: TransferenciaAlmacenResumen): void {
    this.cargando = true;
    this.service.obtener(row.IdTransferencia).subscribe({
      next: response => {
        this.cargando = false;
        if (!response.Success || !response.Data) {
          Swal.fire('Error', response.Message || 'No se pudo abrir la transferencia.', 'error');
          return;
        }
        this.cargarFormulario(response.Data);
      },
      error: error => { this.cargando = false; this.mostrarError(error, 'No se pudo abrir la transferencia.'); }
    });
  }

  cambiarOrigen(): void {
    const nuevoOrigen = this.formulario.IdSubAreaAlmacenOrigen;
    if (this.lineas.length === 0) {
      this.aplicarCambioOrigen(nuevoOrigen);
      return;
    }
    this.formulario.IdSubAreaAlmacenOrigen = this.idOrigenAnterior;
    Swal.fire({
      title: 'Cambiar subárea de origen',
      text: 'Al cambiar el origen se quitarán los artículos agregados.',
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Cambiar', cancelButtonText: 'Cancelar'
    }).then(result => { if (result.isConfirmed) { this.aplicarCambioOrigen(nuevoOrigen); } });
  }

  cambiarDestino(): void {
    if (this.formulario.IdSubAreaAlmacenDestino === this.formulario.IdSubAreaAlmacenOrigen) {
      this.formulario.IdSubAreaAlmacenDestino = null;
      Swal.fire('Destino incorrecto', 'El origen y el destino deben ser diferentes.', 'info');
    }
  }

  agregarLinea(): void {
    const articulo = this.articuloAgregar;
    const cantidad = Number(this.cantidadAgregar);
    if (!articulo) {
      Swal.fire('Falta el artículo', 'Seleccione un artículo del origen.', 'info'); return;
    }
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      Swal.fire('Cantidad incorrecta', 'Ingrese una cantidad mayor que cero.', 'info'); return;
    }
    if (cantidad > Number(articulo.Stock)) {
      Swal.fire('Stock insuficiente', `Solo hay ${this.numero(articulo.Stock)} ${articulo.UnidadMedida} disponibles.`, 'info'); return;
    }
    if (this.lineas.some(linea => linea.IdProducto === articulo.IdProducto)) {
      Swal.fire('Artículo repetido', 'El artículo ya está incluido en la transferencia.', 'info'); return;
    }
    this.lineas = [...this.lineas, {
      IdProducto: articulo.IdProducto, Cantidad: cantidad, Producto: articulo.Descripcion,
      IdUnidadMedida: articulo.IdUnidadMedida, UnidadMedida: articulo.UnidadMedida,
      StockDisponible: articulo.Stock
    }];
    this.limpiarLinea();
  }

  quitarLinea(index: number): void {
    this.lineas.splice(index, 1);
    this.lineas = [...this.lineas];
  }

  crear(): void {
    if (!this.formularioValido()) { return; }
    const dto: TransferenciaAlmacenGuardar = {
      IdSubAreaAlmacenOrigen: Number(this.formulario.IdSubAreaAlmacenOrigen),
      IdSubAreaAlmacenDestino: Number(this.formulario.IdSubAreaAlmacenDestino),
      Fecha: this.formulario.Fecha,
      Detalles: this.lineas.map(({ IdProducto, Cantidad }) => ({ IdProducto, Cantidad: Number(Cantidad) }))
    };
    this.guardando = true;
    this.service.crear(dto).subscribe({
      next: response => {
        this.guardando = false;
        if (!response.Success || !response.Data) {
          Swal.fire('No se pudo transferir', response.Message || 'Revise los datos.', 'error'); return;
        }
        this.cargarFormulario(response.Data);
        Swal.fire('Transferencia realizada', 'Los stocks y el Kardex fueron actualizados.', 'success');
      },
      error: error => { this.guardando = false; this.mostrarError(error, 'No se pudo realizar la transferencia.'); }
    });
  }

  anular(): void {
    if (!this.transferencia || this.transferencia.Estado !== 1) { return; }
    Swal.fire({
      title: 'Anular transferencia',
      text: 'Se devolverá el stock al origen y se revertirán los movimientos de Kardex.',
      icon: 'warning', showCancelButton: true,
      confirmButtonText: 'Anular transferencia', cancelButtonText: 'Cancelar',
      customClass: { confirmButton: 'swal-button--danger' }
    }).then(result => {
      if (!result.isConfirmed || !this.transferencia) { return; }
      this.guardando = true;
      this.service.anular(this.transferencia.IdTransferencia).subscribe({
        next: response => {
          this.guardando = false;
          if (!response.Success || !response.Data) {
            Swal.fire('No se pudo anular', response.Message || 'Revise la transferencia.', 'error'); return;
          }
          this.cargarFormulario(response.Data);
          Swal.fire('Transferencia anulada', 'El stock y el Kardex fueron revertidos.', 'success');
        },
        error: error => { this.guardando = false; this.mostrarError(error, 'No se pudo anular la transferencia.'); }
      });
    });
  }

  exportarExcel(): void {
    if (!this.dataSource.data.length) {
      Swal.fire('Sin datos', 'No existen transferencias para exportar.', 'info'); return;
    }
    const rows = this.dataSource.data.map(item => ({
      Número: item.IdTransferencia, Fecha: new Date(item.Fecha).toLocaleString('es-ES'),
      'Área origen': item.AreaAlmacenOrigen, 'Subárea origen': item.SubAreaAlmacenOrigen,
      'Área destino': item.AreaAlmacenDestino, 'Subárea destino': item.SubAreaAlmacenDestino,
      Artículos: item.CantidadArticulos, Cantidad: item.CantidadTotal, Estado: item.EstadoDescripcion
    }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), 'Transferencias');
    XLSX.writeFile(book, `transferencias-almacen-${this.fechaArchivo()}.xlsx`);
  }

  imprimir(): void {
    if (!this.transferencia) { return; }
    const item = this.transferencia;
    const filas = item.Detalles.map(detalle => `<tr><td>${this.escapeHtml(detalle.Producto)}</td><td>${this.escapeHtml(detalle.UnidadMedida)}</td><td class="n">${this.numero(detalle.Cantidad)}</td></tr>`).join('');
    const ventana = window.open('', '_blank', 'width=860,height=720');
    if (!ventana) { Swal.fire('Ventana bloqueada', 'Permita ventanas emergentes para imprimir.', 'info'); return; }
    ventana.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Transferencia ${item.IdTransferencia}</title><style>body{font-family:Arial;color:#2d211b;margin:32px}h1{color:#9d1711;font-size:22px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0}.meta div{border:1px solid #ddd;padding:10px;border-radius:6px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:9px;text-align:left}th{color:#9d1711}.n{text-align:right}@media print{button{display:none}}</style></head><body><h1>TRANSFERENCIA DE ALMACÉN N.º ${item.IdTransferencia}</h1><div class="meta"><div><b>Fecha:</b> ${new Date(item.Fecha).toLocaleString('es-ES')}</div><div><b>Estado:</b> ${this.escapeHtml(item.EstadoDescripcion)}</div><div><b>Origen:</b> ${this.escapeHtml(item.AreaAlmacenOrigen)} · ${this.escapeHtml(item.SubAreaAlmacenOrigen)}</div><div><b>Destino:</b> ${this.escapeHtml(item.AreaAlmacenDestino)} · ${this.escapeHtml(item.SubAreaAlmacenDestino)}</div></div><table><thead><tr><th>Artículo</th><th>Unidad</th><th class="n">Cantidad</th></tr></thead><tbody>${filas}</tbody></table><script>window.onload=()=>window.print();</script></body></html>`);
    ventana.document.close();
  }

  volver(): void { this.showForm = false; this.transferencia = null; this.buscar(); }
  cerrar(): void { this.dialogRef.close(); }

  get subAreasDestino(): TransferenciaAlmacenSubArea[] {
    return (this.catalogos?.SubAreas || []).filter(item => item.Id !== Number(this.formulario.IdSubAreaAlmacenOrigen));
  }
  get articulosDisponibles(): TransferenciaAlmacenArticulo[] {
    const origen = Number(this.formulario.IdSubAreaAlmacenOrigen);
    const agregados = new Set(this.lineas.map(item => item.IdProducto));
    return (this.catalogos?.Articulos || []).filter(item => item.IdSubAreaAlmacen === origen && item.Stock > 0 && !agregados.has(item.IdProducto));
  }
  get articuloAgregar(): TransferenciaAlmacenArticulo | undefined {
    return this.articulosDisponibles.find(item => item.IdProducto === this.idArticuloAgregar);
  }
  get cantidadTotal(): number { return this.lineas.reduce((total, item) => total + Number(item.Cantidad), 0); }

  private aplicarCambioOrigen(nuevoOrigen: number | null): void {
    this.formulario.IdSubAreaAlmacenOrigen = nuevoOrigen;
    this.idOrigenAnterior = nuevoOrigen;
    if (nuevoOrigen === this.formulario.IdSubAreaAlmacenDestino) {
      this.formulario.IdSubAreaAlmacenDestino = null;
    }
    this.lineas = [];
    this.limpiarLinea();
  }

  private cargarFormulario(item: TransferenciaAlmacen): void {
    this.transferencia = item;
    this.formulario = {
      IdSubAreaAlmacenOrigen: item.IdSubAreaAlmacenOrigen,
      IdSubAreaAlmacenDestino: item.IdSubAreaAlmacenDestino,
      Fecha: new Date(item.Fecha), Detalles: []
    };
    this.idOrigenAnterior = item.IdSubAreaAlmacenOrigen;
    this.lineas = item.Detalles.map(detalle => ({
      IdProducto: detalle.IdProducto, Cantidad: detalle.Cantidad, Producto: detalle.Producto,
      IdUnidadMedida: detalle.IdUnidadMedida, UnidadMedida: detalle.UnidadMedida, StockDisponible: 0
    }));
    this.showForm = true;
    this.limpiarLinea();
  }

  private formularioValido(): boolean {
    if (!this.formulario.IdSubAreaAlmacenOrigen || !this.formulario.IdSubAreaAlmacenDestino || !this.formulario.Fecha || !this.lineas.length) {
      Swal.fire('Complete la transferencia', 'Seleccione origen, destino y fecha, y agregue al menos un artículo.', 'info'); return false;
    }
    if (this.formulario.IdSubAreaAlmacenOrigen === this.formulario.IdSubAreaAlmacenDestino) {
      Swal.fire('Destino incorrecto', 'El origen y el destino deben ser diferentes.', 'info'); return false;
    }
    return true;
  }

  private limpiarLinea(): void { this.idArticuloAgregar = null; this.cantidadAgregar = 1; }
  private formularioInicial(): TransferenciaAlmacenGuardar {
    return { IdSubAreaAlmacenOrigen: null, IdSubAreaAlmacenDestino: null, Fecha: new Date(), Detalles: [] };
  }
  private inicioMes(): Date { const hoy = new Date(); return new Date(hoy.getFullYear(), hoy.getMonth(), 1); }
  private fechaArchivo(): string { const d = new Date(); return `${d.getFullYear()}${`${d.getMonth() + 1}`.padStart(2, '0')}${`${d.getDate()}`.padStart(2, '0')}`; }
  private numero(valor: number): string { return Number(valor).toLocaleString('es-ES', { maximumFractionDigits: 3 }); }
  private escapeHtml(valor: string): string {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(valor || '').replace(/[&<>"']/g, character => entities[character]);
  }
  private mostrarError(error: any, fallback: string): void {
    Swal.fire('Error', error?.error?.Message || error?.error?.message || fallback, 'error');
  }
}
