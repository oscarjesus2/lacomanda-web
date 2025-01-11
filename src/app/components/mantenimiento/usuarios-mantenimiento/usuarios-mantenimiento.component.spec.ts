import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UsuariosMantenimientoComponent } from './usuarios-mantenimiento.component';

describe('UsuariosMantenimientoComponent', () => {
  let component: UsuariosMantenimientoComponent;
  let fixture: ComponentFixture<UsuariosMantenimientoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [UsuariosMantenimientoComponent]
    });
    fixture = TestBed.createComponent(UsuariosMantenimientoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
