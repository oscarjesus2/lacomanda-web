import { Component, Inject, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { DialogDataPedidos } from './pedidos.data.model';

@Component({
  selector: 'app-pedidos-list',
  templateUrl: './pedidos-list.component.html',
  styleUrls: ['./pedidos-list.component.css']
})
export class PedidosListComponent {

  public dataSourceDialogData = new MatTableDataSource<DialogDataPedidos>();
  public displayedColumns: string[] = ['id', 'numeroPedido', 'cliente', 'select'];

  @ViewChild(MatPaginator) paginator: MatPaginator;


  constructor(
    public dialogRef: MatDialogRef<PedidosListComponent>,
    @Inject(MAT_DIALOG_DATA) public listDialogData: DialogDataPedidos[]) {
    this.dataSourceDialogData.data = listDialogData;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  ngAfterViewInit() {
    this.dataSourceDialogData.paginator = this.paginator;
  }
}

