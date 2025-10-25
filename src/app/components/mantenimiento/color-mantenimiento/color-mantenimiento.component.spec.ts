import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ColorMantenimientoComponent } from './color-mantenimiento.component';

describe('ColorMantenimientoComponent', () => {
  let component: ColorMantenimientoComponent;
  let fixture: ComponentFixture<ColorMantenimientoComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ColorMantenimientoComponent]
    });
    fixture = TestBed.createComponent(ColorMantenimientoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
