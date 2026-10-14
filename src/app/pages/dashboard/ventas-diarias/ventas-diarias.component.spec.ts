import { VentasDiariasComponent } from './ventas-diarias.component';

describe('VentasDiariasComponent', () => {
  let component: VentasDiariasComponent;
  beforeEach(() => {
    component = new VentasDiariasComponent(
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
