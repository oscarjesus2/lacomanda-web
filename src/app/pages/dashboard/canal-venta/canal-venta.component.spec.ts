import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CanalVentaComponent } from './canal-venta.component';

describe('CanalVentaComponent', () => {
  let component: CanalVentaComponent;
  let fixture: ComponentFixture<CanalVentaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [CanalVentaComponent]
    });
    fixture = TestBed.createComponent(CanalVentaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
