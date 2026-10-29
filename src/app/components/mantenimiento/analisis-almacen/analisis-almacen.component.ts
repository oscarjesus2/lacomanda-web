import { fechaReporte, imprimirReporte } from 'src/app/shared/impresion/imprimir-reporte';
import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { AnalisisAlmacenService, FilaAnalisisAlmacen } from 'src/app/services/analisis-almacen.service';

interface ColumnaAnalisis {
  campo: string;
  titulo: string;
  tipo?: 'numero' | 'fecha' | 'fechaHora' | 'porcentaje';
}

interface ConfiguracionAnalisis {
  titulo: string;
  ruta: string;
  aviso: string;
  periodo: boolean;
  corte?: boolean;
  columnas: ColumnaAnalisis[];
}

const CONFIGURACIONES: Record<string, ConfiguracionAnalisis> = {
  produccionAnalisisAlmacen: {
    titulo: 'Producción por receta', ruta: 'produccion', periodo: true,
    aviso: 'Producciones revisadas agrupadas por receta, subárea, responsable y unidad. Se excluyen producciones anuladas o pendientes de revisión.',
    columnas: [
      { campo: 'Receta', titulo: 'Receta' }, { campo: 'SubArea', titulo: 'Subárea' },
      { campo: 'Responsable', titulo: 'Responsable' }, { campo: 'Unidad', titulo: 'Unidad' },
      { campo: 'Operaciones', titulo: 'Producciones', tipo: 'numero' }, { campo: 'Cantidad', titulo: 'Cantidad', tipo: 'numero' },
    ],
  },
  transferenciasAnalisisAlmacen: {
    titulo: 'Transferencias entre subáreas', ruta: 'transferencias', periodo: true,
    aviso: 'Transferencias vigentes agrupadas por origen, destino, artículo y unidad. Las operaciones anuladas se excluyen.',
    columnas: [
      { campo: 'Origen', titulo: 'Origen' }, { campo: 'Destino', titulo: 'Destino' },
      { campo: 'Articulo', titulo: 'Artículo' }, { campo: 'Unidad', titulo: 'Unidad' },
      { campo: 'Operaciones', titulo: 'Transferencias', tipo: 'numero' }, { campo: 'Cantidad', titulo: 'Cantidad', tipo: 'numero' },
    ],
  },
  concentracionComprasAlmacen: {
    titulo: 'Concentración de compras por proveedor', ruta: 'concentracion-compras', periodo: true,
    aviso: 'Valor de compra sin impuestos de facturas y comprobantes simplificados revisados. El porcentaje se calcula por separado para cada moneda; no se descuentan notas de crédito o débito.',
    columnas: [
      { campo: 'Proveedor', titulo: 'Proveedor' }, { campo: 'Moneda', titulo: 'Moneda' },
      { campo: 'Documentos', titulo: 'Documentos', tipo: 'numero' },
      { campo: 'Importe', titulo: 'Valor de compra', tipo: 'numero' }, { campo: 'Porcentaje', titulo: 'Participación', tipo: 'porcentaje' },
    ],
  },
  notasCompraAlmacen: {
    titulo: 'Notas de crédito y débito de compras', ruta: 'notas-compra', periodo: true,
    aviso: 'Notas revisadas según su fecha de recepción; importes netos de retenciones. Cada importe se muestra en la moneda de la nota.',
    columnas: [
      { campo: 'FechaUtc', titulo: 'Recepción', tipo: 'fecha' }, { campo: 'Proveedor', titulo: 'Proveedor' },
      { campo: 'Documento', titulo: 'Nota' }, { campo: 'DocumentoOrigen', titulo: 'Documento afectado' },
      { campo: 'Tipo', titulo: 'Tipo' }, { campo: 'Ajuste', titulo: 'Ajuste' },
      { campo: 'Moneda', titulo: 'Moneda' }, { campo: 'Importe', titulo: 'Importe', tipo: 'numero' },
    ],
  },
  anulacionesAlmacen: {
    titulo: 'Anulaciones de operaciones de almacén', ruta: 'anulaciones', periodo: true,
    aviso: 'Compras, salidas, transferencias y producciones anuladas dentro del período por fecha de anulación. Los registros antiguos sin fecha de anulación no se incluyen.',
    columnas: [
      { campo: 'FechaAnulacionUtc', titulo: 'Fecha y hora', tipo: 'fechaHora' }, { campo: 'Tipo', titulo: 'Operación' },
      { campo: 'IdOperacion', titulo: 'Número', tipo: 'numero' }, { campo: 'Usuario', titulo: 'Usuario' },
      { campo: 'Detalle', titulo: 'Detalle' },
    ],
  },

  compraPrecioAlmacen: {
    titulo: 'Compras y precios por proveedor', ruta: 'compra-precio', periodo: true,
    aviso: 'Compras revisadas de facturas y comprobantes simplificados. El precio anterior corresponde a otra compra dentro del período, para la misma unidad y moneda. El importe es el valor de compra sin impuestos y no descuenta notas.',
    columnas: [
      { campo: 'Proveedor', titulo: 'Proveedor' }, { campo: 'Articulo', titulo: 'Artículo' },
      { campo: 'Unidad', titulo: 'Unidad' }, { campo: 'Moneda', titulo: 'Moneda' },
      { campo: 'Compras', titulo: 'Compras', tipo: 'numero' },
      { campo: 'Cantidad', titulo: 'Cantidad', tipo: 'numero' },
      { campo: 'Importe', titulo: 'Valor de compra', tipo: 'numero' },
      { campo: 'PrecioAnterior', titulo: 'Precio anterior', tipo: 'numero' },
      { campo: 'PrecioUltimo', titulo: 'Último precio', tipo: 'numero' },
      { campo: 'VariacionPorcentaje', titulo: 'Variación', tipo: 'porcentaje' },
      { campo: 'FechaUltimaCompraUtc', titulo: 'Última recepción', tipo: 'fecha' },
    ],
  },
  mermaAlmacen: {
    titulo: 'Mermas de porcionamiento', ruta: 'mermas', periodo: true,
    aviso: 'Porcionamientos activos agrupados por artículo, subárea y unidad. El porcentaje compara la merma registrada con la cantidad bruta.',
    columnas: [
      { campo: 'SubArea', titulo: 'Subárea' }, { campo: 'Articulo', titulo: 'Artículo' },
      { campo: 'Unidad', titulo: 'Unidad' }, { campo: 'Operaciones', titulo: 'Operaciones', tipo: 'numero' },
      { campo: 'CantidadBruta', titulo: 'Cantidad bruta', tipo: 'numero' },
      { campo: 'CantidadUtil', titulo: 'Cantidad útil', tipo: 'numero' },
      { campo: 'Merma', titulo: 'Merma', tipo: 'numero' },
      { campo: 'PorcentajeMerma', titulo: '% merma', tipo: 'porcentaje' },
    ],
  },
  salidaMotivoAlmacen: {
    titulo: 'Salidas por motivo', ruta: 'salidas-motivo', periodo: true,
    aviso: 'Salidas revisadas agrupadas por motivo, subárea, artículo y unidad de stock. Se excluyen líneas cuya conversión a unidad de stock no es válida.',
    columnas: [
      { campo: 'Motivo', titulo: 'Motivo' }, { campo: 'SubArea', titulo: 'Subárea' },
      { campo: 'Articulo', titulo: 'Artículo' }, { campo: 'Unidad', titulo: 'Unidad' },
      { campo: 'Cantidad', titulo: 'Cantidad', tipo: 'numero' },
      { campo: 'Operaciones', titulo: 'Salidas', tipo: 'numero' },
    ],
  },
  valorStockAlmacen: {
    titulo: 'Valor del stock actual', ruta: 'valor-stock', periodo: false,
    aviso: 'Estimación: stock actual multiplicado por el precio de compra guardado en el artículo. El sistema no guarda la moneda de ese costo; no se suman importes de distintas monedas. Los costos no disponibles aparecen sin valor.',
    columnas: [
      { campo: 'SubArea', titulo: 'Subárea' }, { campo: 'Articulo', titulo: 'Artículo' },
      { campo: 'Unidad', titulo: 'Unidad' }, { campo: 'Stock', titulo: 'Stock actual', tipo: 'numero' },
      { campo: 'CostoUnitario', titulo: 'Costo de referencia', tipo: 'numero' },
      { campo: 'Valor', titulo: 'Valor estimado', tipo: 'numero' },
    ],
  },
  cuentaProveedorAlmacen: {
    titulo: 'Cuentas por pagar a proveedores', ruta: 'cuentas-proveedor', periodo: false,
    aviso: 'Facturas y comprobantes simplificados revisados con saldo, considerando pagos y notas revisadas. No se incluyen guías ni recibos internos de caja. Revise los documentos con discrepancias o notas antes de pagar; los saldos con discrepancias no se suman al resumen.',
    columnas: [
      { campo: 'Proveedor', titulo: 'Proveedor' }, { campo: 'Documento', titulo: 'Documento' },
      { campo: 'FechaEmisionUtc', titulo: 'Emisión', tipo: 'fecha' },
      { campo: 'FechaPrevistaUtc', titulo: 'Pago previsto', tipo: 'fecha' },
      { campo: 'Moneda', titulo: 'Moneda' }, { campo: 'TotalNeto', titulo: 'Neto', tipo: 'numero' },
      { campo: 'Creditos', titulo: 'Notas de crédito', tipo: 'numero' },
      { campo: 'Debitos', titulo: 'Notas de débito', tipo: 'numero' },
      { campo: 'Pagado', titulo: 'Pagado', tipo: 'numero' },
      { campo: 'Pendiente', titulo: 'Pendiente', tipo: 'numero' },
      { campo: 'Conciliacion', titulo: 'Estado del registro' },
    ],
  },
  sinMovimientoAlmacen: {
    titulo: 'Artículos sin movimiento', ruta: 'sin-movimiento', periodo: true, corte: true,
    aviso: 'Stock actual positivo sin movimientos activos de Kardex desde la fecha seleccionada. Una fecha vacía indica que no hay movimientos registrados para esa ubicación.',
    columnas: [
      { campo: 'SubArea', titulo: 'Subárea' }, { campo: 'Articulo', titulo: 'Artículo' },
      { campo: 'Unidad', titulo: 'Unidad' }, { campo: 'Stock', titulo: 'Stock actual', tipo: 'numero' },
      { campo: 'UltimoMovimientoUtc', titulo: 'Último movimiento', tipo: 'fecha' },
    ],
  },
};

@Component({
  selector: 'app-analisis-almacen',
  templateUrl: './analisis-almacen.component.html',
})
export class AnalisisAlmacenComponent implements OnInit {
  @ViewChild(MatPaginator) set paginator(value: MatPaginator) {
    if (value) this.dataSource.paginator = value;
  }

  readonly config: ConfiguracionAnalisis;
  readonly columnas: string[];
  readonly dataSource = new MatTableDataSource<FilaAnalisisAlmacen>([]);
  fechaDesde = this.fechaInput(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  fechaHasta = this.fechaInput(new Date());
  filtro = '';
  private periodoConsultado = '';
  cargando = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) data: { tipo: string; desde?: string; hasta?: string },
    private readonly dialogRef: MatDialogRef<AnalisisAlmacenComponent>,
    private readonly analisisAlmacen: AnalisisAlmacenService,
  ) {
    if (data.desde) this.fechaDesde = data.desde;
    if (data.hasta) this.fechaHasta = data.hasta;
    this.config = CONFIGURACIONES[data.tipo];
    this.columnas = this.config.columnas.map(columna => columna.campo);
    this.dataSource.filterPredicate = (fila, filtro) =>
      this.normalizar(Object.values(fila).join(' ')).includes(filtro);
  }

  ngOnInit(): void { this.consultar(); }

  consultar(): void {
    if (this.config.periodo &&
        (!this.fechaDesde || (!this.config.corte && (!this.fechaHasta || this.fechaDesde > this.fechaHasta)))) {
      Swal.fire('Rango inválido', 'Revise las fechas seleccionadas.', 'warning');
      return;
    }

    let desdeUtc: string | undefined;
    let hastaUtcExclusivo: string | undefined;
    if (this.config.periodo) {
      const desde = this.inicioLocal(this.fechaDesde);
      const hasta = this.inicioLocal(this.config.corte ? this.fechaDesde : this.fechaHasta);
      hasta.setDate(hasta.getDate() + 1);
      desdeUtc = desde.toISOString();
      hastaUtcExclusivo = hasta.toISOString();
    }
    const periodo = this.config.periodo
      ? this.config.corte ? `Sin movimientos desde: ${fechaReporte(this.fechaDesde)}`
        : `Período consultado: ${fechaReporte(this.fechaDesde)} — ${fechaReporte(this.fechaHasta)}`
      : '';
    this.cargando = true;
    this.analisisAlmacen.consultar(this.config.ruta, desdeUtc, hastaUtcExclusivo).subscribe({
      next: respuesta => {
        this.cargando = false;
        if (!respuesta.Success) {
          this.dataSource.data = [];
          Swal.fire('Error', respuesta.Message || 'No se pudo realizar la consulta.', 'error');
          return;
        }
        this.periodoConsultado = periodo;
        this.dataSource.data = respuesta.Data || [];
        this.aplicarFiltro();
      },
      error: error => {
        this.cargando = false;
        this.dataSource.data = [];
        Swal.fire('Error', error?.error?.Message || 'No se pudo realizar la consulta.', 'error');
      },
    });
  }

  aplicarFiltro(): void {
    this.dataSource.filter = this.normalizar(this.filtro);
    this.dataSource.paginator?.firstPage();
  }

  get resumenProveedores(): { proveedor: string; moneda: string; total: number }[] {
    const campo = this.config.ruta === 'compra-precio' ? 'Importe'
      : this.config.ruta === 'cuentas-proveedor' ? 'Pendiente' : null;
    if (!campo) return [];

    const resumen = new Map<string, { proveedor: string; moneda: string; total: number }>();
    for (const fila of this.dataSource.filteredData) {
      if (this.config.ruta === 'cuentas-proveedor' &&
          fila['Conciliacion'] === 'Revisar estado de pago') continue;
      const proveedor = String(fila['Proveedor'] ?? '');
      const moneda = String(fila['Moneda'] ?? '');
      const clave = `${fila['IdProveedor']}|${moneda}`;
      const actual = resumen.get(clave) || { proveedor, moneda, total: 0 };
      actual.total += Number(fila[campo] ?? 0);
      resumen.set(clave, actual);
    }
    return Array.from(resumen.values()).sort((a, b) =>
      a.proveedor.localeCompare(b.proveedor) || a.moneda.localeCompare(b.moneda));
  }

  exportarExcel(): void {
    if (!this.dataSource.filteredData.length) {
      Swal.fire('Sin registros', 'No hay datos para exportar.', 'info');
      return;
    }
    const filas = this.dataSource.filteredData.map(fila => Object.fromEntries(
      this.config.columnas.map(columna => {
        const valor = fila[columna.campo];
        return [columna.titulo, (columna.tipo === 'fecha' || columna.tipo === 'fechaHora') && valor
          ? columna.tipo === 'fechaHora' ? new Date(String(valor)).toLocaleString() : new Date(String(valor)).toLocaleDateString()
          : valor ?? ''];
      })
    ));
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), 'Datos');
    XLSX.writeFile(libro, `${this.config.ruta}.xlsx`);
  }

  imprimir(): void {
    const filas = this.dataSource.filteredData.map(fila => Object.fromEntries(
      this.config.columnas.map(columna => {
        const valor = fila[columna.campo];
        return [columna.titulo, columna.tipo === 'fechaHora' && valor ? new Date(String(valor)).toLocaleString()
          : columna.tipo === 'fecha' && valor ? fechaReporte(String(valor))
          : columna.tipo === 'porcentaje' && valor != null ? `${valor} %` : valor ?? null];
      })
    ));
    imprimirReporte({
      titulo: this.config.titulo,
      filas,
      detalles: [this.config.aviso, this.periodoConsultado,
        this.filtro.trim() ? `Búsqueda: ${this.filtro.trim()}` : '']
    });
  }

  cerrar(): void { this.dialogRef.close(); }

  private inicioLocal(fecha: string): Date {
    const [year, month, day] = fecha.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private fechaInput(fecha: Date): string {
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${month}-${day}`;
  }

  private normalizar(valor: string): string {
    return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  }
}
