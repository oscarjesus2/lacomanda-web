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
  displayedColumns: string[] = ['name', 'price', 'category'];
  selectedProduct: Producto | null = null; // Variable para almacenar el producto seleccionado

  constructor(
    public dialogRef: MatDialogRef<DialogProductSearchComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { listProducts: Producto[] }
  ) {
    this.listProducts = data.listProducts;
    this.filteredProducts = [...this.listProducts]; // Inicializar la lista filtrada
  }

  filterProducts(): void {
    const terms = this.normalize(this.filterText)
      .split(/\s+/)
      .filter(Boolean);

    if (terms.length === 0) {
      this.filteredProducts = [...this.listProducts];
      return;
    }

    this.filteredProducts = this.listProducts.filter(product => {
      const searchableText = this.normalize([
        product.NombreCorto,
        product.NombreCompleto,
        product.Familia,
        product.SubFamilia,
      ].filter(Boolean).join(' '));

      return terms.every(term => searchableText.includes(term));
    });
  }

  private normalize(value: string | null | undefined): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .trim();
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
