const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { print, getPrinters } = require('pdf-to-printer');
const cors = require('cors'); // Importar el paquete cors

const app = express();

// Usar el middleware cors para permitir solicitudes desde el frontend
app.use(cors({
  origin: ['http://localhost:4200', 'https://main.jobbusiness.pe'], // Reemplaza con el origen de tu aplicación Angular
}));


app.use(bodyParser.json({ limit: '50mb' }));

app.post('/print', async (req, res) => {
  const { pdfBase64, printerName } = req.body;
  const buffer = Buffer.from(pdfBase64, 'base64');

  const tempFilePath = path.join(__dirname, 'temp.pdf');
  fs.writeFile(tempFilePath, buffer, async (err) => {
    if (err) {
      console.error('Error writing file:', err);
      res.status(500).send('Error writing file');
      return;
    }

    try {
      const printers = await getPrinters();
      const printerExists = printers.some(printer => printer.name === printerName);

      const options = printerExists ? { printer: printerName } : undefined;

      await print(tempFilePath, options);
      fs.unlinkSync(tempFilePath); // Borrar archivo temporal
      res.send('Print job sent successfully');
    } catch (err) {
      fs.unlinkSync(tempFilePath); // Borrar archivo temporal
      console.error('Error printing file:', err);
      res.status(500).send('Error printing file');
    }
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
