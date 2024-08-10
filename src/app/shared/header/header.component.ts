import { Component } from '@angular/core';
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
  public SalirSistemas(): void {
    this.storageService.logout();
 
  }
  public Ventas(): void {
    this.title = 'Ventas';
    this.sDatosUsuarioTurno= 'Turno : OPEN ' + this.nroturnoShare + ' - Usuario :' + this.UsuarioShare + '';
    this.router.navigateByUrl('/ventas');
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

  async ngOnInit(): Promise<void> {

    this.spinnerService.show();
    
    this.dataService.currentVariable.subscribe(value => {
      this.title = value; // Actualiza la variable en el componente
    });

    try {
      this.loginService.userLoginOn.subscribe(data => this.userLoginOn = data);
      this.loginService.idturnoShare.subscribe(data => this.idturnoShare = data);
      this.loginService.nroturnoShare.subscribe(data => this.nroturnoShare = data);
      this.loginService.turnoOpenShare.subscribe(data => this.turnoOpenShare = data);
      this.loginService.UsuarioShare.subscribe(data => this.UsuarioShare = data);


    } catch (e) {
      alert(e);
      console.log(e);
      this.SalirSistemas();
    }
    finally {
      this.spinnerService.hide();
    }

  }

 
  OpenDialogTurno(): void {

    const dialogTurno = this.dialogTurno.open(DialogTurnoComponent, {
      disableClose: true,
      hasBackdrop: true,
      width: '600px', height: '400px'
      // data: { oPedidoMesa: listData, IdMesa: IdMesa, Mesa: this.mesaSelected.Descripcion + ' ' + this.mesaSelected.Numero}
    });
 
    dialogTurno.afterClosed().subscribe(async data => {

      await this.TurnoService.ObtenerTurno('001').subscribe(data => {
        if (data == null){
      
          this.loginService.idturnoShare.emit(0);
          this.loginService.nroturnoShare.emit(0);
          this.loginService.turnoOpenShare.emit(false);
       
        }else{
          this.loginService.idturnoShare.emit(data.IdTurno);
          this.loginService.nroturnoShare.emit(data.NroTurno);
          this.loginService.turnoOpenShare.emit(true);
          console.log(data.IdTurno);
          console.log(data.NroTurno);
          
        }
  
      });
      
    });


  }
}
