import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { jsPDF } from 'jspdf';

interface Cliente {
  id: number;
  razonSocialONombre: string;
  dniOrRuc: string;
  direccion?: string;
  telefono?: string;
}

interface Producto {
  id: number;
  nombre: string;
  codigoInterno: string;
  precioVenta: number;
}

interface ItemVenta {
  productoId: number | null;
  cantidad: number;
  precio: number;
  productoNombre?: string;
  busquedaProducto?: string;
  productosFiltrados?: Producto[];
  productoSeleccionado?: Producto;
}

interface Venta {
  id?: number;
  clienteId: number | null;
  clienteNombre?: string;
  fecha?: string;
  total?: number;
  items: ItemVenta[];
}

@Component({
  selector: 'app-venta',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './venta.component.html',
  styleUrl: './venta.component.css',
})
export class VentaComponent {
  ventas: Venta[] = [];
  clientes: Cliente[] = [];
  productos: Producto[] = [];

  nuevaVenta: Venta = {
    clienteId: null,
    items: []
  };

  mensaje: string = '';
  mostrarFormulario = false;

  busquedaCliente: string = '';
  clientesFiltrados: Cliente[] = [];
  clienteSeleccionado: Cliente | null = null;

  mostrarNuevoCliente = false;
  nuevoCliente: Partial<Cliente> = {
    dniOrRuc: '',
    razonSocialONombre: '',
    direccion: '',
    telefono: ''
  };

  busqueda: string = '';
  filtroFecha: string = '';
  mostrarDetalles: { [key: number]: boolean } = {};

  private readonly apiVentas = 'http://localhost:8080/api/ventas';
  private readonly apiClientes = 'http://localhost:8080/api/clientes';
  private readonly apiProductos = 'http://localhost:8080/api/productos';

  constructor(private readonly http: HttpClient) {
    this.cargarProductos();
    this.cargarClientes();
  }

  // ================= CLIENTES =================
  cargarClientes(): void {
    this.http.get<Cliente[]>(this.apiClientes).subscribe(data => {
      this.clientes = data;
    });
  }

  filtrarClientes(): void {
    const texto = this.busquedaCliente.trim().toLowerCase();
    this.clientesFiltrados = !texto
      ? []
      : this.clientes.filter(c =>
        c.razonSocialONombre.toLowerCase().includes(texto) ||
        (c.dniOrRuc && c.dniOrRuc.includes(texto))
      );
  }

  seleccionarCliente(cli: Cliente): void {
    this.clienteSeleccionado = cli;
    this.nuevaVenta.clienteId = cli.id;
    this.busquedaCliente = cli.razonSocialONombre;
    this.clientesFiltrados = [];
  }

  crearCliente(): void {
    if (!this.nuevoCliente.dniOrRuc || !this.nuevoCliente.razonSocialONombre) {
      alert('Completa DNI/RUC y nombre');
      return;
    }

    this.http.post<Cliente>(this.apiClientes, this.nuevoCliente).subscribe(nuevo => {
      this.cargarClientes();
      this.clienteSeleccionado = nuevo;
      this.nuevaVenta.clienteId = nuevo.id;
      this.busquedaCliente = nuevo.razonSocialONombre;
      this.mostrarNuevoCliente = false;
      this.nuevoCliente = {
        dniOrRuc: '',
        razonSocialONombre: '',
        direccion: '',
        telefono: ''
      };
    });
  }

  // ================= PRODUCTOS =================
  cargarProductos(): void {
    this.http.get<Producto[]>(this.apiProductos).subscribe(data => {
      this.productos = data;
      this.cargarVentas();
    });
  }

  filtrarProductos(i: number): void {
    const texto = this.nuevaVenta.items[i].busquedaProducto?.trim().toLowerCase() || '';
    this.nuevaVenta.items[i].productosFiltrados = !texto
      ? []
      : this.productos.filter(p =>
        p.nombre.toLowerCase().includes(texto) ||
        (p.codigoInterno && p.codigoInterno.toLowerCase().includes(texto))
      );
  }

  seleccionarProducto(i: number, prod: Producto): void {
    this.nuevaVenta.items[i].productoId = prod.id;
    this.nuevaVenta.items[i].productoNombre = prod.nombre;
    this.nuevaVenta.items[i].precio = prod.precioVenta;
    this.nuevaVenta.items[i].productoSeleccionado = prod;
    this.nuevaVenta.items[i].busquedaProducto = prod.nombre;
    this.nuevaVenta.items[i].productosFiltrados = [];

    if (this.nuevaVenta.items[i].cantidad < 1) {
      this.nuevaVenta.items[i].cantidad = 1;
    }
  }

  onCantidadChange(i: number): void {
    const item = this.nuevaVenta.items[i];
    if (item.cantidad < 1) {
      item.cantidad = 1;
    }
  }

  agregarItem(): void {
    this.nuevaVenta.items.push({
      productoId: null,
      cantidad: 1,
      precio: 0,
      busquedaProducto: '',
      productosFiltrados: [],
      productoSeleccionado: undefined
    });
  }

  eliminarItem(i: number): void {
    this.nuevaVenta.items.splice(i, 1);
  }

  // ================= VENTAS =================
  cargarVentas(): void {
    this.http.get<Venta[]>(this.apiVentas).subscribe(data => {
      data.forEach(venta => this.completarItemsDeVenta(venta));
      this.ventas = data;
    });
  }

  private completarItemsDeVenta(venta: Venta): void {
    venta.items.forEach(item => this.completarDatosProducto(item));
  }

  private completarDatosProducto(item: ItemVenta): void {
    const productoEncontrado = this.buscarProductoPorId(item.productoId);

    if (productoEncontrado) {
      item.productoNombre = productoEncontrado.nombre;
      item.precio = productoEncontrado.precioVenta;
      return;
    }

    item.productoNombre = item.productoNombre || 'Producto';
    item.precio = item.precio || 0;
  }

  private buscarProductoPorId(productoId: number | null): Producto | undefined {
    return this.productos.find(producto => producto.id === productoId);
  }

  toggleDetalles(id: number): void {
    this.mostrarDetalles[id] = !this.mostrarDetalles[id];
  }

  get totalVenta(): number {
    return this.nuevaVenta.items.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  }

  registrarVenta(): void {
    if (!this.nuevaVenta.clienteId || this.nuevaVenta.items.length === 0) {
      this.mensaje = 'Completa los datos';
      return;
    }

    const venta = {
      clienteId: this.nuevaVenta.clienteId,
      items: this.nuevaVenta.items.map(i => ({
        productoId: i.productoId,
        cantidad: i.cantidad,
      })),
    };

    this.http.post<Venta>(this.apiVentas, venta).subscribe(() => {
      this.cargarVentas();
      this.nuevaVenta = { clienteId: null, items: [] };
      this.mostrarFormulario = false;
    });
  }

  // ================= PDF =================
  generarBoletaDesdeVenta(venta: Venta): void {
    const doc = new jsPDF();
    const marginX = 10;
    const pageWidth = 210;

    let y = 20;

    const cliente = this.clientes.find(c => c.id === venta.clienteId);
    const fecha = venta.fecha ? new Date(venta.fecha).toLocaleDateString() : '';

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTA DE VENTA', pageWidth / 2, y, { align: 'center' });

    y += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');

    doc.text('Cliente:', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cliente?.razonSocialONombre || '-'}`, marginX + 18, y);

    doc.setFont('helvetica', 'bold');
    doc.text(`N°: INV${venta.id}`, pageWidth - 60, y);

    y += 6;
    doc.text('Documento:', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cliente?.dniOrRuc || '-'}`, marginX + 23, y);

    doc.setFont('helvetica', 'bold');
    doc.text(`Fecha: ${fecha}`, pageWidth - 60, y);

    y += 6;
    doc.text('Dirección:', marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${cliente?.direccion || '-'}`, marginX + 19, y);

    y += 15;

    const cols = [
      { title: 'N°', width: 15 },
      { title: 'Producto', width: 85 },
      { title: 'Cant.', width: 20 },
      { title: 'P. Unit', width: 35 },
      { title: 'Total', width: 35 }
    ];

    const rowHeight = 9;

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);

    let currentX = marginX;
    doc.setFont('helvetica', 'bold');

    cols.forEach(col => {
      doc.setFillColor(33, 150, 243);
      doc.rect(currentX, y, col.width, rowHeight, 'FD');

      doc.setTextColor(255, 255, 255);
      doc.text(col.title, currentX + col.width / 2, y + 6, { align: 'center' });

      currentX += col.width;
    });

    y += rowHeight;

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');

    let subtotal = 0;

    venta.items.forEach((item, index) => {
      let rowX = marginX;
      const totalItem = item.precio * item.cantidad;
      subtotal += totalItem;

      const rowData = [
        String(index + 1),
        item.productoNombre || '',
        String(item.cantidad),
        item.precio.toFixed(2),
        totalItem.toFixed(2)
      ];

      rowData.forEach((text, i) => {
        const w = cols[i].width;

        doc.rect(rowX, y, w, rowHeight);

        if (i === 1) {
          doc.text(text, rowX + 2, y + 6);
        } else {
          doc.text(text, rowX + w / 2, y + 6, { align: 'center' });
        }

        rowX += w;
      });

      y += rowHeight;
    });

    y += 10;
    const igv = subtotal * 0.18;
    const totalGeneral = subtotal + igv;
    const boxWidth = 80;
    const boxX = pageWidth - marginX - boxWidth;

    doc.setFont('helvetica', 'bold');

    doc.setFillColor(33, 150, 243);
    doc.rect(boxX - 2, y, boxWidth + 2, 10, 'FD');

    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL:', boxX + 2, y + 7);
    doc.text(`S/ ${subtotal.toFixed(2)}`, pageWidth - marginX - 2, y + 7, { align: 'right' });

    doc.setTextColor(0, 0, 0);
    y += 20;
    doc.text('Gracias por su compra', pageWidth / 2, y, { align: 'center' });

    doc.save(`boleta_${venta.id}.pdf`);
  }

  get ventasFiltradas(): Venta[] {
    return this.ventas;
  }

  get totalVentasFiltradas(): number {
    return this.ventas.reduce((acc, v) => acc + (v.total || 0), 0);
  }
}
