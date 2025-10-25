import { Component, OnInit, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { Caja } from 'src/app/models/caja.models';
import { CajaService } from 'src/app/services/caja.service';
import { CanalVentaService } from 'src/app/services/canal-venta.service';
import { CajaDocumentosDialogComponent } from './caja-documentos-dialog/caja-documentos-dialog.component';
import { CanalVenta } from 'src/app/models/canalventa.models';
import { faL } from '@fortawesome/free-solid-svg-icons';

@Component({
  selector: 'app-caja-mantenimiento',
  templateUrl: './caja-mantenimiento.component.html',
  styleUrls: ['./caja-mantenimiento.component.css']
})
export class CajaMantenimientoComponent implements OnInit {
  @ViewChild('form') form: NgForm;

  cajas: Caja[] = [];
  filtered = new MatTableDataSource<Caja>([]);
  filtro = '';
  showForm = false;

  canales: CanalVenta[] = [];
  m: Caja = this.blank();

  displayedColumns: string[] = ['descripcion','activo','cajaDefault','canal','nroPedido','actions'];

  constructor(
    private service: CajaService,
    private dialogRef: MatDialogRef<CajaMantenimientoComponent>,
    private canalSrv: CanalVentaService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.canalSrv.listarActivos().subscribe(x => this.canales = x);
  }

  private blank(): Caja {
    return {
      IdCaja: 0, TurnoAbierto: null, Descripcion: '', Activo: true, NroPedido: 0, CajaPorDefecto: false,
      UsuRegistro: 0, FecRegistro: '', IdCanalVentaDefecto: 0, UsuModi: undefined, FecModi: undefined,
      EmitePrecuenta: true, EmiteComanda: true, EmiteDescuento: true, PermiteDividirPedido: true,
      PermiteCierreParcial: false, EnvioElectronicoOnline: false, PrecuentaLlevarDeliveryAutomatica: false
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

  nuevo(): void { this.m = this.blank(); this.showForm = true; }
  onEdit(row: Caja): void { this.m = { ...row }; this.showForm = true; }

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
    const obs = this.m.IdCaja ? this.service.actualizar(this.m) : this.service.crear(this.m);
    obs.subscribe(r => {
      if (r.Success) {
        Swal.fire(this.m.IdCaja ? 'Actualizado' : 'Guardado', '', 'success');
        this.cargar(); this.showForm = false;
      } else {
        Swal.fire('Error', r.Message || 'Operación no realizada', 'error');
      }
    });
  }

  cancelar(): void { this.showForm = false; }
  salir(): void {
      this.dialogRef.close();
    }
    
  configurarDocumentos(row: Caja): void {
    const ref = this.dialog.open(CajaDocumentosDialogComponent, {
      width: '900px',
      data: { idCaja: row.IdCaja, nombreCaja: row.Descripcion }
    });
    ref.afterClosed().subscribe(saved => {
      if (saved) Swal.fire('Documentos actualizados', '', 'success');
    });
  }
}
