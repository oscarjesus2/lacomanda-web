import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmpleadoMantenimientoComponent } from './empleado-mantenimiento.component';

describe('EmpleadoMantenimientoComponent', () => {
  let component: EmpleadoMantenimientoComponent;
  let fixture: ComponentFixture<EmpleadoMantenimientoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EmpleadoMantenimientoComponent]
    });
    fixture = TestBed.createComponent(EmpleadoMantenimientoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
