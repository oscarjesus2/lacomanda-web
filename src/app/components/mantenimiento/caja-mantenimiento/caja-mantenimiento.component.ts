import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { CajaDto } from 'src/app/models/caja.models';
import { CajaService } from 'src/app/services/caja.service';
import { CanalVentaService } from 'src/app/services/canal-venta.service';
import { CajaDocumentosDialogComponent } from './caja-documentos-dialog/caja-documentos-dialog.component';
import { CanalVenta } from 'src/app/models/canalventa.models';
import { CanalVentaEnum } from 'src/app/enums/enum';
import { faL } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-caja-mantenimiento',
  templateUrl: './caja-mantenimiento.component.html',
  styleUrls: ['./caja-mantenimiento.component.css']
})
export class CajaMantenimientoComponent implements OnInit {
  @ViewChild('form') form: NgForm;

  cajas: CajaDto[] = [];
  filtered = new MatTableDataSource<CajaDto>([]);
  filtro = '';
  showForm = false;

  canales: CanalVenta[] = [];        // canales activos incluidos en la licencia
  canalesSeleccionados: number[] = []; // IDs de canales habilitados para la caja actual
  m: CajaDto = this.blank();

  /** Canales filtrados a los seleccionados — alimenta el dropdown "Canal por Defecto" */
  get canalesHabilitados(): CanalVenta[] {
    return this.canales.filter(c => this.canalesSeleccionados.includes(c.IdCanalVenta));
  }

  /** True cuando el canal Entradas está habilitado para la caja.
   *  Solo entonces tiene sentido "Permitir pago a taxistas". */
  get entradaSeleccionada(): boolean {
    return this.canalesSeleccionados.includes(CanalVentaEnum.ENTRADAS);
  }

  displayedColumns: string[] = ['descripcion','activo','cajaDefault','canal','nroPedido','actions'];

  constructor(
    private service: CajaService,
    private dialogRef: MatDialogRef<CajaMantenimientoComponent>,
    private canalSrv: CanalVentaService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.canalSrv.listarDisponibles().subscribe(x => this.canales = x);
  }

  private blank(): CajaDto {
    return {
      IdCaja: 0, TurnoAbierto: null, Descripcion: '', Activo: true, NroPedido: 0, CajaPorDefecto: false,
      UsuRegistro: 0, FecRegistro: '', IdCanalVentaDefecto: 0, UsuModi: undefined, FecModi: undefined,
      IdCanalesVenta: [],
      EmitePrecuenta: true, EmiteComanda: true, EmiteDescuento: true, PermiteDividirPedido: true,
      PermiteCierreParcial: false, EnvioElectronicoOnline: false, PrecuentaLlevarDeliveryAutomatica: false,
      PermitirPagoTaxistas: false
    };
  }

  cargar(): void {
    this.service.getAllCaja(false).subscribe(r => {
      if (r.Success) {
        this.cajas = r.Data ?? [];
        this.filtered.data = this.cajas;
      } else {
        Swal.fire('Error', r.Message || 'No se pudo cargar', 'error');
      }
    });
  }

  getCanalDescripcion(id: number): string {
    const c = this.canales.find(x => x.IdCanalVenta === id);
    return c?.Descripcion ?? String(id);
  }
  
  applyFilter(): void {
    const f = (this.filtro || '').toLowerCase();
    this.filtered.data = this.cajas.filter(x =>
      (x.Descripcion || '').toLowerCase().includes(f) ||
      (x.CajaPorDefecto ? 'default' : '').includes(f)
    );
  }

  isCanal(id: number): boolean {
    return this.canalesSeleccionados.includes(id);
  }

  toggleCanal(id: number, checked: boolean): void {
    if (checked) {
      if (!this.canalesSeleccionados.includes(id)) {
        this.canalesSeleccionados = [...this.canalesSeleccionados, id];
      }
    } else {
      this.canalesSeleccionados = this.canalesSeleccionados.filter(x => x !== id);
      // Si el canal desactivado era el default, limpiar
      if (this.m.IdCanalVentaDefecto === id) {
        this.m.IdCanalVentaDefecto = this.canalesSeleccionados[0] ?? 0;
      }
      // Si se quita el canal Entradas, no tiene sentido permitir pago a taxistas
      if (id === CanalVentaEnum.ENTRADAS) {
        this.m.PermitirPagoTaxistas = false;
      }
    }
  }

  nuevo(): void {
    this.m = this.blank();
    this.canalesSeleccionados = [];
    this.showForm = true;
  }

  onEdit(row: CajaDto): void {
    this.m = { ...row };
    this.canalesSeleccionados = [];
    // Cargar canales existentes de la caja
    this.service.getCanalesVentaByCaja(row.IdCaja).subscribe(canales => {
      this.canalesSeleccionados = canales.map(c => c.IdCanalVenta);
    });
    this.showForm = true;
  }

  onDelete(id: number): void {
    Swal.fire({
      title: '¿Está seguro?', text: 'No podrá revertirlo', icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar'
    }).then(s => {
      if (s.isConfirmed) {
        this.service.eliminar(id).subscribe(r => {
          if (r.Success) { this.cargar(); Swal.fire('Eliminado', '', 'success'); }
          else { Swal.fire('Error', r.Message || 'No se pudo eliminar', 'error'); }
        });
      }
    });
  }

  private touchForm(): void {
    Object.values(this.form.controls).forEach(c => { c.markAsTouched(); c.markAsDirty(); });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.touchForm(); return; }
    // Incluir los canales en el mismo DTO que va al Create/Update
    this.m.IdCanalesVenta = [...this.canalesSeleccionados];
    const obs = this.m.IdCaja ? this.service.actualizar(this.m) : this.service.crear(this.m);
    obs.subscribe(r => {
      if (r.Success) {
        Swal.fire(this.m.IdCaja ? 'Actualizado' : 'Guardado', '', 'success');
        this.cargar();
        this.showForm = false;
      } else {
        Swal.fire('Error', r.Message || 'Operación no realizada', 'error');
      }
    });
  }

  cancelar(): void { this.showForm = false; }
  salir(): void {
      this.dialogRef.close();
    }
    
  configurarDocumentos(row: CajaDto): void {
    const ref = this.dialog.open(CajaDocumentosDialogComponent, {
      width: '900px',
      data: { idCaja: row.IdCaja, nombreCaja: row.Descripcion }
    });
    ref.afterClosed().subscribe(saved => {
      if (saved) Swal.fire('Documentos actualizados', '', 'success');
    });
  }
}
