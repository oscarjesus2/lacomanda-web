import { DialogProductSearchComponent } from './dialog-product-search.component';
import { Producto } from 'src/app/models/product.models';

describe('DialogProductSearchComponent', () => {
  const productos = [
    new Producto({
      IdProducto: 1,
      NombreCorto: 'Té Inglés',
      NombreCompleto: 'Té negro inglés',
      Familia: 'Bebidas',
      SubFamilia: 'Calientes',
    }),
    new Producto({
      IdProducto: 2,
      NombreCorto: 'Gyoza',
      Familia: 'Comidas',
      SubFamilia: 'Entradas',
    }),
  ];

  function crearComponente(): DialogProductSearchComponent {
    const dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    return new DialogProductSearchComponent(
      dialogRef,
      { listProducts: productos },
    );
  }

  it('muestra todos los productos cuando el filtro está vacío', () => {
    const component = crearComponente();

    component.filterText = '';
    component.filterProducts();

    expect(component.filteredProducts).toEqual(productos);
  });

  it('filtra por nombre, familia o subfamilia ignorando tildes', () => {
    const component = crearComponente();

    component.filterText = 'te ingles';
    component.filterProducts();
    expect(component.filteredProducts.map(x => x.IdProducto)).toEqual([1]);

    component.filterText = 'bebidas calientes';
    component.filterProducts();
    expect(component.filteredProducts.map(x => x.IdProducto)).toEqual([1]);

    component.filterText = 'entradas';
    component.filterProducts();
    expect(component.filteredProducts.map(x => x.IdProducto)).toEqual([2]);
  });
});
