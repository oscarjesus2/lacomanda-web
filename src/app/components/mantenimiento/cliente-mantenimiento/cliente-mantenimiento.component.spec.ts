import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClienteMantenimientoComponent } from './cliente-mantenimiento.component';

describe('ClienteMantenimientoComponent', () => {
  let component: ClienteMantenimientoComponent;
  let fixture: ComponentFixture<ClienteMantenimientoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ClienteMantenimientoComponent]
    });
    fixture = TestBed.createComponent(ClienteMantenimientoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
