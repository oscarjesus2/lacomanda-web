import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogEmitirComprobanteComponent } from './dialog-emitir-comprobante.component';

describe('DialogEmitirComprobanteComponent', () => {
  let component: DialogEmitirComprobanteComponent;
  let fixture: ComponentFixture<DialogEmitirComprobanteComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DialogEmitirComprobanteComponent]
    });
    fixture = TestBed.createComponent(DialogEmitirComprobanteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
