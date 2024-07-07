import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { LoginService } from 'src/app/services/auth/login.service';
import { LoginRequest } from 'src/app/services/auth/loginRequest';
import {internalIpV6, internalIpV4} from 'internal-ip';

import { User } from 'src/app/models/user.models';
import { StorageService } from 'src/app/services/storage.services';
import { Session } from 'src/app/models/session.models';
import { NgxSpinnerService } from 'ngx-spinner';
import { Turno } from 'src/app/models/turno.models';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
 
  hide = true;
 
  public loginValid = true;
  public IdNivel = '001';
  public password = '';
  public Sucursal: SucursalDefault;
  usersDefault: UsersDefault[] = [
    { value: '001', username: 'Administrador' },
    { value: '002', username: 'Cajero' },
    { value: '003', username: 'Mozo' }
  ];
  sucursalDefault: SucursalDefault[] = [
    { value: '20605616659', sucursal: 'Naruto Sucre' },
    { value: '20605104771', sucursal: 'Naruto San Borja' },
    { value: '20604977585', sucursal: 'Job Business Solutions' }
  ];
  loginForm: FormGroup;
  loginError: string="";
  CurrentIP: string;
 
  
 
  constructor(
    private spinnerService: NgxSpinnerService,
     private fb: FormBuilder,
     private router: Router, 
     private loginService: LoginService,
     private storageService: StorageService,){}
  ngOnInit(): void{
    this.initForm();
    if (this.storageService.getCurrentSession()){
      if (this.storageService.getCurrentSession().user.IdNivel==='001'){
        this.router.navigateByUrl('/dashboard');
      }
      if (this.storageService.getCurrentSession().user.IdNivel==='002'){
        this.router.navigateByUrl('/ventas');
      }
      if (this.storageService.getCurrentSession().user.IdNivel==='003'){
        this.router.navigateByUrl('/ventas');
      }      
    }
  }

  async initForm() {
    this.loginForm = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    })

    this.CurrentIP= (await internalIpV4()); 
 

  }
 
  
  login(){
    this.spinnerService.show();

    this.loginValid = true;
 
      this.loginService.login({"username":this.IdNivel,"password":this.password, "sucursal":this.Sucursal.value} as LoginRequest).subscribe({
            next: (userData) =>{
              console.log('login correcto');
              this.loginService.UsuarioShare.emit(userData.Usuario);

              let session: Session = new Session(userData.token, userData, this.CurrentIP, this.Sucursal.value, this.Sucursal.sucursal);
              this.storageService.setCurrentSession(session);
            },
            error: (errorData) => {
              this.loginValid = false
               Swal.fire(
                 'Oops...',
                 'Contraseña incorrecta',
                 'error'
               );
              this.loginError=errorData;
              this.spinnerService.hide();
          },
          complete: ()=>{
            this.loginValid = true;
            console.info("Login Completo");
            this.loginService.userLoginOn.emit(true);
            
            // this.router.navigate([this.moduleSelected]);
            this.router.navigateByUrl('/dashboard');
            this.loginForm.reset();
            this.spinnerService.hide();
          } 
        })

    
     
  }
}

interface UsersDefault {
  value: string;
  username: string;
}

interface SucursalDefault {
  value: string;
  sucursal: string;
}
