# PDF Export x Doctrine

## Demo

start the server

```sh
npm run serve
``````

You can find the 4 versions of the PDF export we had at Doctrine

### html2pdf
[code here](static/html2pdf.html)

Visit [http://localhost:8080/html2pdf.html](http://localhost:8080/html2pdf.html)

### phantomjs

run this command and check out the generated pdf in the dist folder

```sh
node phantomjs.mjs
```
[code here](phantomjs.mjs)

### wkhtmltopdf

run this command and check out the generated pdf in the dist folder

```sh
node wkhtmltopdf.mjs
```

[code here](wkhtmltopdf.mjs)
### puppeteer
The last and still used in production solution

run this command and check out the generated pdf in the dist folder

```sh
node puppeteer.mjs
```

[code here](puppeteer.mjs)
