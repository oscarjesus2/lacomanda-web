import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VentasDiariasComponent } from './ventas-diarias.component';

describe('VentasDiariasComponent', () => {
  let component: VentasDiariasComponent;
  let fixture: ComponentFixture<VentasDiariasComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [VentasDiariasComponent]
    });
    fixture = TestBed.createComponent(VentasDiariasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
