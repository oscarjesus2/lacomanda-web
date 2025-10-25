import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GrupoMantenimientoComponent } from './grupo-mantenimiento.component';

describe('GrupoMantenimientoComponent', () => {
  let component: GrupoMantenimientoComponent;
  let fixture: ComponentFixture<GrupoMantenimientoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [GrupoMantenimientoComponent]
    });
    fixture = TestBed.createComponent(GrupoMantenimientoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
