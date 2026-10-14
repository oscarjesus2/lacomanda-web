import { ClienteMantenimientoComponent } from './cliente-mantenimiento.component';

describe('ClienteMantenimientoComponent', () => {
  let component: ClienteMantenimientoComponent;
  beforeEach(() => {
    component = new ClienteMantenimientoComponent(
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
