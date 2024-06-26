import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuAlmacenComponent } from './menu-almacen.component';

describe('MenuAlmacenComponent', () => {
  let component: MenuAlmacenComponent;
  let fixture: ComponentFixture<MenuAlmacenComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [MenuAlmacenComponent]
    });
    fixture = TestBed.createComponent(MenuAlmacenComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
