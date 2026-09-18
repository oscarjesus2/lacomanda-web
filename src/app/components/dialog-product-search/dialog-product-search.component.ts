import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Producto } from 'src/app/models/product.models';

@Component({
  selector: 'app-dialog-product-search',
  templateUrl: './dialog-product-search.component.html',
  styleUrls: ['./dialog-product-search.component.css']
})
export class DialogProductSearchComponent {
  filterText: string = '';
  filteredProducts: Producto[] = [];
  listProducts: Producto[] = [];
  displayedColumns: string[] = ['name', 'price', 'family'];
  selectedProduct: Producto | null = null; // Variable para almacenar el producto seleccionado

  constructor(
    public dialogRef: MatDialogRef<DialogProductSearchComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { listProducts: Producto[] }
  ) {
    this.listProducts = data.listProducts;
    this.filteredProducts = [...this.listProducts]; // Inicializar la lista filtrada

    // El tamaño lo decide la estación: el teclado ocupa lo que sobra.
    dialogRef.addPanelClass('dialog-window--teclado');
    dialogRef.updateSize();
  }

  filterProducts() {
    const filterValue = this.filterText ? this.filterText.toLowerCase() : ''; // Verificamos que no sea null o undefined
  
    this.filteredProducts = this.listProducts.filter((product: any) => {
      const productName = product.NombreCorto ? product.NombreCorto.toLowerCase() : ''; // Aseguramos que NombreCorto existe
      return productName.includes(filterValue);
    });
  }

  /** El teclado en pantalla escribe en el mismo filtro que el campo. */
  onTecladoValor(valor: string): void {
    this.filterText = valor;
    this.filterProducts();
  }

  selectProduct(product: Producto) {
    this.selectedProduct = product; // Asignamos el producto seleccionado
  }

  onAcceptClick(): void {
    if (this.selectedProduct) {
      this.dialogRef.close(this.selectedProduct); // Retornamos el producto seleccionado
    } else {
      // Opción para manejar si no se seleccionó ningún producto
      console.warn("No product selected");
    }
  }

  onCancelClick(): void {
    this.dialogRef.close();
  }
}
