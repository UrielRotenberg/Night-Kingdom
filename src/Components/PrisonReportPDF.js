import React from 'react';
import { Printer } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import PdfBackground from './logo/PdfBackground.png';
import ShabasLogo from './logo/ShabasLogo.png';

const PrisonReportPDF = ({ results }) => {
    if (!results) return null;

    const generatePDF = async () => {
        try {
            const content = document.querySelector('.absolute.inset-0');
            if (!content) {
                throw new Error('Could not find content element');
            }
    
            const fullHeight = content.offsetHeight;
            
            const height92 = fullHeight * 0.92; 
    
            const canvas = await html2canvas(content, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#2a2a2a',
                allowTaint: true,
                foreignObjectRendering: true,
                windowWidth: content.scrollWidth,
                windowHeight: height92,
                x: content.offsetLeft,
                y: content.offsetTop,
                width: content.offsetWidth,
                height: height92
            });
    
            const pdf = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
    
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
            pdf.setFillColor(0, 0, 0);
            pdf.rect(0, 0, imgWidth, 20, 'F');
            pdf.addImage(PdfBackground, 'PNG', 0, 0, imgWidth, 20);
            pdf.addImage(ShabasLogo, 'PNG', imgWidth - 20, 2.5, 15, 15, undefined, 'NONE');
    
            pdf.setFillColor(26, 26, 26);
            pdf.rect(0, 40, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), 'F');
    
            const imgData = canvas.toDataURL('image/png', 1.0);
            pdf.addImage(imgData, 'PNG', 0, 20, imgWidth, imgHeight);
    
            pdf.save('דוח-ביקורת.pdf');
    
            console.log('PDF נוצר בהצלחה');
        } catch (error) {
            console.error('שגיאה ביצירת PDF:', error);
        }
    };
    
    return (
        <button
            onClick={generatePDF}
            className="absolute right-[2%] bottom-[3%] bg-[#8B5CF6] hover:bg-[#7C3EED] text-white p-4 rounded-full transition-colors shadow-lg shadow-[#8B5CF6]/50"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}
        >
            <Printer className="w-8 h-8" />
        </button>
    );
};

export default PrisonReportPDF;