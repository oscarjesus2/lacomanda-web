import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { AbrirTurno, Turno } from '../models/turno.models';
import { environment } from 'src/environments/environment';  // Importa el entorno correspondiente

@Injectable({
    providedIn: 'root'
})
export class TurnoService {

    private basePath = environment.apiUrl + '/turno';

    constructor(private http: HttpClient) { }

    AbrirTurno(Turno: AbrirTurno): Observable<Turno> {
        return this.http.post<Turno>(this.basePath + '/abrir', Turno);
    }
    
    ObtenerTurno(sIdCaja: string): Observable<Turno> {
        return this.http.get<Turno>(this.basePath + '/ObtenerTurnoByCaja/' + sIdCaja);
    }

    ObtenerTurnoByIP(iP: string): Observable<Turno> {
        return this.http.get<Turno>(this.basePath + '/ObtenerTurnoByIp/' + iP);
    }
}