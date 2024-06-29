import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogEmitirVentaComponent } from './dialog-emitir-venta.component';

describe('DialogEmitirVentaComponent', () => {
  let component: DialogEmitirVentaComponent;
  let fixture: ComponentFixture<DialogEmitirVentaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DialogEmitirVentaComponent]
    });
    fixture = TestBed.createComponent(DialogEmitirVentaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
