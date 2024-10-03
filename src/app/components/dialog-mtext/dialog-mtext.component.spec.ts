import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogMtextComponent } from './dialog-mtext.component';

describe('DialogMtextComponent', () => {
  let component: DialogMtextComponent;
  let fixture: ComponentFixture<DialogMtextComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [DialogMtextComponent]
    });
    fixture = TestBed.createComponent(DialogMtextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
