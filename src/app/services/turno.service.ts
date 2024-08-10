import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { Turno } from '../models/turno.models';
import { environment } from 'src/environments/environment';  // Importa el entorno correspondiente

@Injectable({
    providedIn: 'root'
})
export class TurnoService {

    private basePath = environment.apiUrl + '/turno';

    constructor(private http: HttpClient) { }

    AbrirTurno(Turno: Turno): Observable<Turno> {
        return this.http.post<Turno>(this.basePath + '/abrir', Turno);
    }
    ObtenerTurno(sIdCaja: string): Observable<Turno> {
        return this.http.get<Turno>(this.basePath + '/' + sIdCaja);
    }

}