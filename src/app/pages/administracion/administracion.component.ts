import { Component, OnInit } from '@angular/core';
import { take } from 'rxjs';
import { CARACTERISTICAS_LICENCIA } from 'src/app/constants/caracteristicas-licencia';
import { LicenciaTenantService } from 'src/app/services/licencia-tenant.service';
@Component({
  selector: 'app-dashboard',
  templateUrl: './administracion.component.html',
  styleUrls: ['./administracion.component.css']
})
export class AdministracionComponent implements OnInit {
  mostrarAlmacen = false;

  constructor(private readonly licenciaTenantService: LicenciaTenantService) {}

  ngOnInit(): void {
    this.licenciaTenantService
      .tieneCaracteristica(CARACTERISTICAS_LICENCIA.AlmacenGestion)
      .pipe(take(1))
      .subscribe(habilitado => (this.mostrarAlmacen = habilitado));
  }
}
