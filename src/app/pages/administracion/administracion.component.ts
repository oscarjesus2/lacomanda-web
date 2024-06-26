import { Component, OnDestroy, OnInit } from '@angular/core';
import { User } from 'src/app/models/user.models';
@Component({
  selector: 'app-dashboard',
  templateUrl: './administracion.component.html',
  styleUrls: ['./administracion.component.css']
})
export class AdministracionComponent   {
  userLoginOn:boolean=false;
  userData?: User;
constructor(){}

} 
