import fs from "fs";
import wkhtmltopdf from "wkhtmltopdf";

const url = "http://localhost:8000/decision?wkhtmltopdf";
const outputFile = "dist/wkhtmltopdf.pdf";

wkhtmltopdf(url, {
  pageSize: "A4",
  enableJavascript: true,
  javascriptDelay: 500,
  printMediaType: true,
}).pipe(fs.createWriteStream(outputFile));
