import { Component, OnInit } from '@angular/core';
import { take } from 'rxjs';
import { CARACTERISTICAS_LICENCIA } from 'src/app/constants/caracteristicas-licencia';
import { HeaderService } from 'src/app/services/header.service';
import { LicenciaTenantService } from 'src/app/services/licencia-tenant.service';
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
  ) {}

  ngOnInit(): void {
    // El login oculta la cabecera. También hay que restaurarla aquí porque un
    // plan sin dashboard aterriza en Administración mediante LicenseGuard.
    this.headerService.showHeader();

    this.licenciaTenantService
      .tieneCaracteristica(CARACTERISTICAS_LICENCIA.AlmacenGestion)
      .pipe(take(1))
      .subscribe(habilitado => (this.mostrarAlmacen = habilitado));
  }
}
