import { Service } from '@angular/core';
import { jsPDF } from 'jspdf';
import * as QRCode from 'qrcode';

@Service()
export class Ticket {

    async generarTicketsPDF(peliculaNombre: string, fechaHora: string, butacas: string[], totalPagado: number) {
        const doc = new jsPDF();

        for (let i = 0; i < butacas.length; i++) {
            const butaca = butacas[i];

            if (i > 0) {
                doc.addPage();
            }

            doc.setFontSize(22);
            doc.setTextColor(0, 51, 102); 
            doc.text('TICKET DE ENTRADA - TOSCO CINE', 20, 20);

            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0); 
            doc.text(`Película: ${peliculaNombre}`, 20, 40);
            doc.text(`Función: ${fechaHora}`, 20, 50);
            doc.text(`Butaca: ${butaca}`, 20, 60);

            if (i === 0) {
                doc.text(`Total Abonado: $${totalPagado}`, 20, 70);
            }

            const qrData = `VALIDO POR 1 ENTRADA | Pelicula: ${peliculaNombre} | Butaca: ${butaca} | Emitido: ${new Date().toLocaleDateString()}`;

            try {
                const qrImageBase64 = await QRCode.toDataURL(qrData);

                doc.addImage(qrImageBase64, 'PNG', 20, 80, 50, 50);

                doc.setFontSize(10);
                doc.text('Presentá este código QR en la entrada de la sala.', 20, 140);
            } catch (err) {
                console.error('Error generando QR para la butaca ' + butaca, err);
            }
        }

        doc.save(`Entradas_${peliculaNombre.replace(/\s+/g, '_')}.pdf`);
    }
}