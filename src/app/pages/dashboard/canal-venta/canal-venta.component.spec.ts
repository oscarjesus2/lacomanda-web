import { CanalVentaComponent } from './canal-venta.component';

describe('CanalVentaComponent', () => {
  let component: CanalVentaComponent;
  beforeEach(() => {
    component = new CanalVentaComponent(
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
