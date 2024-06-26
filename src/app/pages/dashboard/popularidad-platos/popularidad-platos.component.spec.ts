import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PopularidadPlatosComponent } from './popularidad-platos.component';

describe('PopularidadPlatosComponent', () => {
  let component: PopularidadPlatosComponent;
  let fixture: ComponentFixture<PopularidadPlatosComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PopularidadPlatosComponent]
    });
    fixture = TestBed.createComponent(PopularidadPlatosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
