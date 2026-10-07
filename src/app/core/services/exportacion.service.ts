import { Service } from '@angular/core';

export interface FilaFacturacion {
    dia: string;
    entradas: number;
    facturado: number;
}

export interface DatosReporte {
    titulo: string;
    periodo: string;
    nombreArchivo: string;
    filas: FilaFacturacion[];
    totalEntradas: number;
    totalFacturado: number;
}

@Service()
export class ExportacionService {
    private formatoMoneda = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2
    });

    async exportarExcel(datos: DatosReporte): Promise<void> {
        const modulo: any = await import('exceljs');
        const ExcelJS = modulo.default ?? modulo;

        const libro = new ExcelJS.Workbook();
        libro.creator = 'Tosco Cine';
        libro.created = new Date();

        const hoja = libro.addWorksheet('Facturación', { views: [{ state: 'frozen', ySplit: 5 }] });
        hoja.columns = [{ width: 16 }, { width: 20 }, { width: 24 }];

        hoja.mergeCells('A1:C1');
        hoja.getCell('A1').value = datos.titulo;
        hoja.getCell('A1').font = { size: 16, bold: true, color: { argb: 'FF260B01' } };

        hoja.mergeCells('A2:C2');
        hoja.getCell('A2').value = datos.periodo;

        hoja.mergeCells('A3:C3');
        hoja.getCell('A3').value = `Generado el ${new Date().toLocaleString('es-AR')}`;
        hoja.getCell('A3').font = { italic: true, color: { argb: 'FF64563C' } };

        const encabezado = hoja.getRow(5);
        encabezado.values = ['Día', 'Entradas vendidas', 'Facturado'];
        encabezado.eachCell((celda: any) => {
            celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF260B01' } };
            celda.font = { bold: true, color: { argb: 'FFDBD5CA' } };
            celda.alignment = { horizontal: 'center' };
        });

        datos.filas.forEach(fila => {
            const registro = hoja.addRow([this.aFechaExcel(fila.dia), fila.entradas, fila.facturado]);
            registro.getCell(1).numFmt = 'dd/mm/yyyy';
            registro.getCell(1).alignment = { horizontal: 'left' };
            registro.getCell(2).numFmt = '#,##0';
            registro.getCell(3).numFmt = '"$" #,##0.00';
        });

        const primera = 6;
        const ultima = primera + datos.filas.length - 1;
        const total = hoja.addRow([
            'Total',
            { formula: `SUM(B${primera}:B${ultima})`, result: datos.totalEntradas },
            { formula: `SUM(C${primera}:C${ultima})`, result: datos.totalFacturado }
        ]);

        total.font = { bold: true, color: { argb: 'FF260B01' } };
        total.eachCell((celda: any) => {
            celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBB89C' } };
            celda.border = { top: { style: 'thin' } };
        });
        total.getCell(2).numFmt = '#,##0';
        total.getCell(3).numFmt = '"$" #,##0.00';

        const buffer = await libro.xlsx.writeBuffer();
        this.descargar(
            new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
            `${datos.nombreArchivo}.xlsx`
        );
    }

    async exportarPdf(datos: DatosReporte): Promise<void> {
        const [modulo, tabla]: any[] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
        const jsPDF = modulo.jsPDF ?? modulo.default;
        const autoTable = tabla.default ?? tabla.autoTable;

        const doc = new jsPDF({ unit: 'pt', format: 'a4' });
        const ancho = doc.internal.pageSize.getWidth();
        const alto = doc.internal.pageSize.getHeight();
        const margen = 40;

        doc.setFillColor(38, 11, 1);
        doc.rect(0, 0, ancho, 70, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(255, 193, 7);
        doc.text('TOSCO CINE', margen, 32);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(219, 213, 202);
        doc.text(datos.titulo, margen, 52);

        doc.setFontSize(10);
        doc.setTextColor(38, 11, 1);
        doc.text(datos.periodo, margen, 94);
        doc.setTextColor(100, 86, 60);
        doc.text(`Generado el ${new Date().toLocaleString('es-AR')}`, margen, 108);

        autoTable(doc, {
            startY: 124,
            head: [['Día', 'Entradas vendidas', 'Facturado']],
            body: datos.filas.map(fila => [
                this.formatoFecha(fila.dia),
                String(fila.entradas),
                this.moneda(fila.facturado)
            ]),
            foot: [['Total', String(datos.totalEntradas), this.moneda(datos.totalFacturado)]],
            showFoot: 'lastPage',
            margin: { left: margen, right: margen },
            styles: { fontSize: 10, cellPadding: 6 },
            headStyles: { fillColor: [38, 11, 1], textColor: [219, 213, 202] },
            footStyles: { fillColor: [203, 184, 156], textColor: [38, 11, 1], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [245, 242, 236] },
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } }
        });

        const paginas = doc.getNumberOfPages();
        for (let pagina = 1; pagina <= paginas; pagina++) {
            doc.setPage(pagina);
            doc.setFontSize(9);
            doc.setTextColor(100, 86, 60);
            doc.text(`Página ${pagina} de ${paginas}`, ancho / 2, alto - 20, { align: 'center' });
        }

        doc.save(`${datos.nombreArchivo}.pdf`);
    }

    private moneda(valor: number): string {
        return this.formatoMoneda.format(valor).replace(/\u00a0/g, ' ');
    }

    private formatoFecha(clave: string): string {
        const [anio, mes, dia] = clave.split('-');
        return `${dia}/${mes}/${anio}`;
    }

    private aFechaExcel(clave: string): Date {
        const [anio, mes, dia] = clave.split('-').map(Number);
        return new Date(Date.UTC(anio, mes - 1, dia));
    }

    private descargar(blob: Blob, nombre: string): void {
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombre;
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
}