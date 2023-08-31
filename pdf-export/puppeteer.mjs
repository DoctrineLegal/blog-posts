import { promises as fs } from "fs";
import puppeteer from "puppeteer";

const url = "http://localhost:8000/decision";
const outputFile = "dist/puppeteer.pdf";

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

await page.goto(url);

const pdf = await page.pdf({ format: "A4" });

fs.writeFile(outputFile, pdf);

await browser.close();
