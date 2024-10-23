import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogDocumentosEmitidosComponent } from './dialog-documentos-emitidos.component';

describe('DialogDocumentosEmitidosComponent', () => {
  let component: DialogDocumentosEmitidosComponent;
  let fixture: ComponentFixture<DialogDocumentosEmitidosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DialogDocumentosEmitidosComponent]
    });
    fixture = TestBed.createComponent(DialogDocumentosEmitidosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
