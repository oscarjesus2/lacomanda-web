import { AsyncPipe, NgIf } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { HeaderService } from './header.service';

@Component({ selector: 'test-panel', standalone: true, template: '' })
class PanelPruebaComponent implements OnInit {
  private readonly cabecera = inject(HeaderService);

  ngOnInit(): void {
    this.cabecera.showHeader();
  }
}

@Component({
  standalone: true,
  imports: [AsyncPipe, NgIf, PanelPruebaComponent],
  template: '<header *ngIf="cabecera.headerVisible$ | async">Menú</header><test-panel *ngIf="enPanel" />',
})
class ShellPruebaComponent {
  readonly cabecera = inject(HeaderService);
  enPanel = false;
}

describe('HeaderService al cambiar de página', () => {
  it('muestra el menú al volver del login al panel durante la comprobación de cambios de Angular', fakeAsync(() => {
    TestBed.configureTestingModule({ imports: [ShellPruebaComponent] });
    const fixture = TestBed.createComponent(ShellPruebaComponent);
    const shell = fixture.componentInstance;
    const menu = () => fixture.nativeElement.querySelector('header');

    shell.cabecera.hideHeader();
    fixture.detectChanges();
    tick();
    fixture.detectChanges();
    expect(menu()).toBeNull();

    shell.enPanel = true;
    expect(() => fixture.detectChanges()).not.toThrow();
    tick();
    fixture.detectChanges();
    expect(menu()?.textContent).toBe('Menú');

    shell.enPanel = false;
    shell.cabecera.hideHeader();
    tick();
    fixture.detectChanges();
    expect(menu()).toBeNull();
  }));
});
