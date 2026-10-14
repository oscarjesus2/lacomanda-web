import { DialogDescuentoComponent } from './dialog-descuento.component';

describe('DialogDescuentoComponent', () => {
  let component: DialogDescuentoComponent;
  beforeEach(() => {
    component = new DialogDescuentoComponent(
      { idProducto: 1, nombreCorto: 'Producto QA', descuentoTotal: 0, descuentoMaximo: 0 },
      {} as any,
      {} as any,
      {} as any,
      {} as any,
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
