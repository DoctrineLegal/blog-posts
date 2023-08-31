import fs from "fs";
import phantom from "phantom";

const url = "http://localhost:8000/decision?wkhtmltopdf";
const outputFile = "dist/phantomjs.pdf";

const instance = await phantom.create();
const page = await instance.createPage();
await page.property("paperSize", {
  format: "A4",
  orientation: "portrait",
  margin: "1.5cm",
});

await page.open(url);
await page.render(outputFile);

await instance.exit();
