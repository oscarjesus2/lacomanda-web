import { Component, OnDestroy, OnInit } from '@angular/core';
import { Usuario } from 'src/app/models/usuario.models';
@Component({
  selector: 'app-dashboard',
  templateUrl: './administracion.component.html',
  styleUrls: ['./administracion.component.css']
})
export class AdministracionComponent   {
  userLoginOn:boolean=false;
  userData?: Usuario;
constructor(){}

} 
