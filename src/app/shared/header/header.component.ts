import { Component } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { DialogTurnoComponent } from 'src/app/components/dialog-turno/dialog-turno.component';
import { Turno } from 'src/app/models/turno.models';
import { LoginService } from 'src/app/services/auth/login.service';
import { StorageService } from 'src/app/services/storage.service';
import { TurnoService } from 'src/app/services/turno.service';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {

  private headerVisibleSubject = new BehaviorSubject<boolean>(true);
  headerVisible$ = this.headerVisibleSubject.asObservable();

  userLoginOn: boolean = false;
  idturnoShare: number= 0;  
  nroturnoShare: number= 0;   
  turnoOpenShare: boolean= false; 
  UsuarioShare: string='';
  public userLoged: any = { id: "", username: "" };
  title: string = '';
  sDatosUsuarioTurno: string = '';

  constructor(
    private spinnerService: NgxSpinnerService,
    private router: Router,
    private loginService: LoginService,
    private storageService: StorageService,
    private dialogTurno: MatDialog,
    private TurnoService: TurnoService,
    private dataService: DataService,
  ) {

  }


  hideHeader() {
    this.headerVisibleSubject.next(false);
  }

  showHeader() {
    this.headerVisibleSubject.next(true);
  }

  public SalirSistemas(): void {
    this.storageService.logout();
    this.exitFullScreen();
 
  }
  public Caja(): void {
    this.title = 'Ventas';
    this.sDatosUsuarioTurno= 'Turno : OPEN ' + this.nroturnoShare + ' - Usuario :' + this.UsuarioShare + '';
    this.router.navigateByUrl('/caja');
  }

  public Mozo(): void {
    this.title = 'Mozo';
    this.sDatosUsuarioTurno= 'Turno : OPEN ' + this.nroturnoShare + ' - Usuario :' + this.UsuarioShare + '';
    this.router.navigateByUrl('/mozo');
  }

  public Administracion(): void {
    this.title = 'Administracion';
    this.sDatosUsuarioTurno='';
    this.router.navigateByUrl('/administracion');
  }
  public Dashboard(): void {
    this.title = this.storageService.getCurrentNombreSucursal();
    this.sDatosUsuarioTurno='';
    this.router.navigateByUrl('/dashboard');
  }

  public reiniciar(): void {
    this.title = this.storageService.getCurrentNombreSucursal();
    this.sDatosUsuarioTurno='';
    this.router.navigateByUrl('/dashboard');
  }

  exitFullScreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
        .then(() => console.log("Saliste del modo pantalla completa"))
        .catch((err) => console.error(err));
    } else {
      console.log("No estás en pantalla completa");
    }
  }

  async ngOnInit(): Promise<void> {

    this.spinnerService.show();
    
    this.dataService.currentVariable.subscribe(value => {
      this.title = value; // Actualiza la variable en el componente
    });
  }

 
  OpenDialogTurno(): void {

    const dialogTurno = this.dialogTurno.open(DialogTurnoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '600px', height: '400px'
      // data: { oPedidoMesa: listData, IdMesa: IdMesa, Mesa: this.mesaSelected.Descripcion + ' ' + this.mesaSelected.Numero}
    });
   }
}
