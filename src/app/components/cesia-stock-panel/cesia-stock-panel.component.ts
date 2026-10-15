import { Component, Input } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AlertaStockCesia } from 'src/app/models/cesia-stock.models';
import { CesiaStockService } from 'src/app/services/cesia-stock.service';
import { TenantTextKey } from 'src/app/services/localization/tenant-texts.en';
import { StockAlmacenConsultaComponent } from '../mantenimiento/stock-almacen-consulta/stock-almacen-consulta.component';

@Component({
  selector: 'app-cesia-stock-panel',
  templateUrl: './cesia-stock-panel.component.html',
  styleUrls: ['./cesia-stock-panel.component.css'],
})
export class CesiaStockPanelComponent {
  @Input() limite = 3;
  mostrarTodas = false;
  readonly estado$ = this.cesia.estado$;

  constructor(private readonly cesia: CesiaStockService, private readonly dialog: MatDialog) {}

  etiqueta(alerta: AlertaStockCesia): TenantTextKey {
    return alerta.Tipo === 'SIN_STOCK' ? 'cesiaStockEmpty'
      : alerta.Tipo === 'RIESGO_AGOTAMIENTO' ? 'cesiaStockRisk' : 'cesiaStockLow';
  }

  revisarAlmacen(): void {
    this.dialog.open(StockAlmacenConsultaComponent, {
      width: 'calc(100vw - 32px)', maxWidth: '1240px',
      height: 'calc(100vh - 32px)', maxHeight: '880px',
      panelClass: 'dialog-window--workspace',
    });
  }
}
