import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Empleado } from '../models/empleado.models';
import { environment } from 'src/environments/environment';  // Importa el entorno correspondiente

@Injectable({
    providedIn: 'root'
})
export class EmpleadoService {

    private basePath =  environment.apiUrl + '/empleado/listar';

    constructor(private http: HttpClient) { }

    getAllEmpleados(): Observable<Empleado[]> {
        return this.http.get<Empleado[]>(this.basePath);
    }

}