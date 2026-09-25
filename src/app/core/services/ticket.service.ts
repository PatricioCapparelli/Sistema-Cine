import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import * as QRCode from 'qrcode';

@Injectable({
    providedIn: 'root'
})
export class Ticket {

    // 1. AGREGAMOS el parámetro "codigoManual" al final de la lista
    async generarTicketsPDF(peliculaNombre: string, fechaHora: string, sala: string, butacas: string[], totalPagado: number, idTicketPrincipal: string, codigoManual: string) {
        const doc = new jsPDF();

        for (let i = 0; i < butacas.length; i++) {
            const butaca = butacas[i];

            if (i > 0) {
                doc.addPage();
            }

            // Encabezado
            doc.setFontSize(22);
            doc.setTextColor(0, 51, 102); 
            doc.text('TICKET DE ENTRADA - TOSCO CINE', 20, 20);

            // Detalles
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0); 
            doc.text(`Película: ${peliculaNombre}`, 20, 40);
            doc.text(`Función: ${fechaHora}`, 20, 50);
            doc.text(`Sala: ${sala}`, 20, 60); 
            doc.text(`Butaca: ${butaca}`, 20, 70);

            if (i === 0) {
                doc.text(`Total Abonado: $${totalPagado}`, 20, 80);
            }

            const qrData = idTicketPrincipal; 

            try {
                const qrImageBase64 = await QRCode.toDataURL(qrData);
                
                // El QR se dibuja en la posición Y: 90 y mide 50 de alto (llega hasta Y: 140)
                doc.addImage(qrImageBase64, 'PNG', 20, 90, 50, 50); 
                
                // 2. DIBUJAMOS EL CÓDIGO MANUAL DEBAJO DEL QR
                doc.setFontSize(14);
                doc.setFont("helvetica", "bold"); // Lo ponemos en negrita para que resalte
                doc.text(`CÓDIGO: ${codigoManual}`, 20, 148); // Lo ubicamos en Y: 148
                
                // 3. ACTUALIZAMOS EL TEXTO DE INSTRUCCIONES
                doc.setFont("helvetica", "normal"); // Volvemos a fuente normal
                doc.setFontSize(10);
                doc.text('Presentá este código QR o dictá el código alfanumérico en la entrada.', 20, 156);
            } catch (err) {
                console.error('Error generando QR para la butaca ' + butaca, err);
            }
        }

        doc.save(`Entradas_${peliculaNombre.replace(/\s+/g, '_')}.pdf`);
    }
}