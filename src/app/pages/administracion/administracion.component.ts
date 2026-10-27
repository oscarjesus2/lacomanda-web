import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { take } from 'rxjs';
import { CARACTERISTICAS_LICENCIA } from 'src/app/constants/caracteristicas-licencia';
import { HeaderService } from 'src/app/services/header.service';
import { LicenciaTenantService } from 'src/app/services/licencia-tenant.service';
import { LibroReclamacionesMantenimientoComponent } from 'src/app/components/mantenimiento/libro-reclamaciones-mantenimiento/libro-reclamaciones-mantenimiento.component';
@Component({
  selector: 'app-dashboard',
  templateUrl: './administracion.component.html',
  styleUrls: ['./administracion.component.css']
})
export class AdministracionComponent implements OnInit {
  mostrarAlmacen = false;

  constructor(
    private readonly licenciaTenantService: LicenciaTenantService,
    private readonly headerService: HeaderService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    // El login oculta la cabecera. También hay que restaurarla aquí porque un
    // plan sin dashboard aterriza en Administración mediante LicenseGuard.
    this.headerService.showHeader();

    this.licenciaTenantService
      .tieneCaracteristica(CARACTERISTICAS_LICENCIA.AlmacenGestion)
      .pipe(take(1))
      .subscribe(habilitado => {
        this.mostrarAlmacen = habilitado;
      });

    this.route.queryParamMap.subscribe(params => {
      const codigo = params.get('libro-reclamacion')?.trim();
      if (!codigo) return;
      this.dialog.open(LibroReclamacionesMantenimientoComponent, {
        disableClose: true,
        hasBackdrop: true,
        width: '1120px',
        maxWidth: 'calc(100vw - 32px)',
        height: '720px',
        maxHeight: 'calc(100vh - 32px)',
        panelClass: 'dialog-window--maintenance-table',
        data: { codigo },
      });
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { 'libro-reclamacion': null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }
}
