import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { NgForm } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { Color } from 'src/app/models/color.models';
import { ColorService } from 'src/app/services/color.service';

@Component({
  selector: 'app-color-mantenimiento',
  templateUrl: './color-mantenimiento.component.html',
  styleUrls: ['./color-mantenimiento.component.css']
})
export class ColorMantenimientoComponent implements OnInit {
  @ViewChild('form') form: NgForm;

  colores: Color[] = [];
  filtered = new MatTableDataSource<Color>([]);
  filtro = '';
  showForm = false;

  c: Color = { IdColor: 0, Descripcion: '', Rgb1: 0, Rgb2: 0, Rgb3: 0 };
  hex: string = '#000000'; // helper para <input type="color">

  displayedColumns: string[] = ['preview', 'descripcion', 'rgb', 'actions'];

  // Paleta de ejemplo (puedes extenderla). HEX sin alpha.
  presetPalette: string[] = [
    '#000000','#FFFFFF','#F44336','#E91E63','#9C27B0','#673AB7','#3F51B5','#2196F3',
    '#03A9F4','#00BCD4','#009688','#4CAF50','#8BC34A','#CDDC39','#FFEB3B','#FFC107',
    '#FF9800','#FF5722','#795548','#9E9E9E','#607D8B','#B71C1C','#4A148C','#1A237E',
    '#0D47A1','#006064','#1B5E20','#827717','#E65100','#BF360C','#263238'
  ];

  constructor(
    private service: ColorService,
    private dialogRef: MatDialogRef<ColorMantenimientoComponent>
  ) {}

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.service.getColores().subscribe(r => {
      if (r.Success) {
        this.colores = r.Data || [];
        this.filtered.data = this.colores;
      } else {
        Swal.fire('Error', r.Message || 'No se pudo cargar colores', 'error');
      }
    });
  }

  applyFilter(): void {
    const f = (this.filtro || '').toLowerCase();
    this.filtered.data = this.colores.filter(x =>
      (x.Descripcion || '').toLowerCase().includes(f) ||
      (`${x.Rgb1},${x.Rgb2},${x.Rgb3}`).includes(f)
    );
  }

  // --- Color helpers ---
  private hexToRgb(hex: string): { r: number, g: number, b: number } {
    const v = hex.replace('#','');
    const r = parseInt(v.substring(0,2), 16);
    const g = parseInt(v.substring(2,4), 16);
    const b = parseInt(v.substring(4,6), 16);
    return { r, g, b };
  }
  private rgbToHex(r: number, g: number, b: number): string {
    const p = (n: number) => n.toString(16).padStart(2,'0');
    return `#${p(r)}${p(g)}${p(b)}`.toUpperCase();
  }

  selectHex(hex: string): void {
    this.hex = hex;
    const { r, g, b } = this.hexToRgb(hex);
    this.c.Rgb1 = r; this.c.Rgb2 = g; this.c.Rgb3 = b;
  }

  onHexChange(): void {
    const { r, g, b } = this.hexToRgb(this.hex || '#000000');
    this.c.Rgb1 = r; this.c.Rgb2 = g; this.c.Rgb3 = b;
  }

  onRgbManualChange(): void {
    // clamp 0..255
    const clamp = (n: number) => Math.max(0, Math.min(255, Number(n) || 0));
    this.c.Rgb1 = clamp(this.c.Rgb1);
    this.c.Rgb2 = clamp(this.c.Rgb2);
    this.c.Rgb3 = clamp(this.c.Rgb3);
    this.hex = this.rgbToHex(this.c.Rgb1, this.c.Rgb2, this.c.Rgb3);
  }

  // --- CRUD ---
  nuevo(): void {
    this.c = { IdColor: 0, Descripcion: '', Rgb1: 0, Rgb2: 0, Rgb3: 0 };
    this.hex = '#000000';
    this.showForm = true;
  }

  onEdit(row: Color): void {
    this.c = { ...row };
    this.hex = this.rgbToHex(this.c.Rgb1, this.c.Rgb2, this.c.Rgb3);
    this.showForm = true;
  }

  onDelete(id: number): void {
    Swal.fire({
      title: '¿Está seguro?',
      text: 'No podrá revertirlo',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then(s => {
      if (s.isConfirmed) {
        this.service.eliminar(id).subscribe(r => {
          if (r.Success) { this.cargar(); Swal.fire('Eliminado', '', 'success'); }
          else { Swal.fire('Error', r.Message || 'No se pudo eliminar', 'error'); }
        });
      }
    });
  }

  private touchForm(): void {
    Object.values(this.form.controls).forEach(c => { c.markAsTouched(); c.markAsDirty(); });
  }

  onSubmit(): void {
    if (this.form.invalid) { this.touchForm(); return; }
    const obs = this.c.IdColor ? this.service.actualizar(this.c) : this.service.crear(this.c);
    obs.subscribe(r => {
      if (r.Success) {
        Swal.fire(this.c.IdColor ? 'Actualizado' : 'Guardado', '', 'success');
        this.cargar(); this.showForm = false;
      } else {
        Swal.fire('Error', r.Message || 'Operación no realizada', 'error');
      }
    });
  }

  cancelar(): void { this.showForm = false; }
  salir(): void { this.dialogRef.close(); }

  // estilo para preview y chips
  swatchStyle(row: Color) { return { 'background-color': `rgb(${row.Rgb1}, ${row.Rgb2}, ${row.Rgb3})` }; }
  previewStyle() { return { 'background-color': this.hex, 'border': '1px solid #e0e0e0' }; }
}
