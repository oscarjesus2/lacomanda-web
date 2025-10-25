import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CajaTipoDocumento } from 'src/app/models/caja-tipo-documento.model';
import Swal from 'sweetalert2';
import { CajaTipoDocumentoService } from 'src/app/services/caja-tipo-documento.service';
import { CajaService } from 'src/app/services/caja.service';
import { TipoDocumentoPais } from 'src/app/models/tipodocumentopais.models';
import { TipoDocumentoPaisService } from 'src/app/services/tipo-documento-pais.service';

@Component({
  templateUrl: './caja-documentos-dialog.component.html',
  styleUrls: ['./caja-documentos-dialog.component.css']
})
export class CajaDocumentosDialogComponent implements OnInit {
  idCaja: number;
  nombreCaja: string;
  tiposPais: TipoDocumentoPais[] = [];
  rows: CajaTipoDocumento[] = [];
  loading = true;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { idCaja: number, nombreCaja: string },
    private ref: MatDialogRef<CajaDocumentosDialogComponent>,
    private cajaSrv: CajaService,
    private cajaTipoDocumentoSrv: CajaTipoDocumentoService,
    private tipoDocumentoPaisService: TipoDocumentoPaisService,
  ) {
    this.idCaja = data.idCaja; this.nombreCaja = data.nombreCaja;
  }

  ngOnInit(): void {
      // 2) docs por país
      this.tipoDocumentoPaisService.GetTiposDocumentos().subscribe(tipos => {
        this.tiposPais = tipos;
        // 3) docs actuales de caja
        this.cajaTipoDocumentoSrv.GetTiposDocumentos(this.idCaja).subscribe(curr => {
          // fusionar: crear fila por cada tipo de país, prellenando lo existente
          this.rows = this.tiposPais.map(t => {
            const found = curr.find(x => x.IdTipoDocumento === t.IdTipoDocumento);
            return {
              IdCaja: this.idCaja,
              IdTipoDocumento: t.IdTipoDocumento,
              Descripcion: t.Descripcion,
              Mascara: t.Marcara,
              Serie: found?.Serie || '',
              NumeroActual: found?.NumeroActual || 0,
              CopiasImpresion: found?.CopiasImpresion ?? 1,
              ItemsPorDocumento: found?.ItemsPorDocumento ?? 0,
              PreguntarParaImprimir: found?.PreguntarParaImprimir ?? false,
              Activo: found?.Activo ?? false
            } as CajaTipoDocumento;
          });
          this.loading = false;
        });
      });
  }

  toggleAll(active: boolean): void { this.rows.forEach(r => r.Activo = active); }

  guardar(): void {
    // Validación mínima: si Activo, Serie no vacía
    for (const r of this.rows) {
      if (r.Activo && (!r.Serie || r.Serie.length > 4)) {
        Swal.fire('Validación', `Serie inválida para ${r.Descripcion}`, 'warning');
        return;
      }
    }
    this.cajaTipoDocumentoSrv.upsertDocs(this.idCaja, this.rows).subscribe(ok => {
      if (ok) this.ref.close(true);
      else Swal.fire('Error', 'No se pudo guardar', 'error');
    });
  }

  cerrar(): void { this.ref.close(false); }
}
