import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Product } from 'src/app/models/product.models';

@Component({
  selector: 'app-dialog-product-search',
  templateUrl: './dialog-product-search.component.html',
  styleUrls: ['./dialog-product-search.component.css']
})
export class DialogProductSearchComponent {
  filterText: string = '';
  filteredProducts: Product[] = [];
  listProducts: Product[] = [];
  displayedColumns: string[] = ['name', 'price', 'family'];
  selectedProduct: Product | null = null; // Variable para almacenar el producto seleccionado

  keyRows = [
    ['ESC', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ' ', 'BORRAR']
  ];

  constructor(
    public dialogRef: MatDialogRef<DialogProductSearchComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { listProducts: Product[] }
  ) {
    this.listProducts = data.listProducts;
    this.filteredProducts = [...this.listProducts]; // Inicializar la lista filtrada
  }

  filterProducts() {
    const filterValue = this.filterText ? this.filterText.toLowerCase() : ''; // Verificamos que no sea null o undefined
  
    this.filteredProducts = this.listProducts.filter((product: any) => {
      const productName = product.NombreCorto ? product.NombreCorto.toLowerCase() : ''; // Aseguramos que NombreCorto existe
      return productName.includes(filterValue);
    });
  }

  onKeyClick(key: string) {
    if (key === 'BORRAR') {
      this.filterText = this.filterText.slice(0, -1); // Remover el último carácter
    } else if (key === 'ESPACIO') {
      this.filterText += ' '; // Agregar un espacio
    } else {
      this.filterText += key; // Agregar la tecla presionada al filtro
    }
    this.filterProducts(); // Llamamos a la función para filtrar productos
  }

  selectProduct(product: Product) {
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
