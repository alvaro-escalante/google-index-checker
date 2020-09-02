<div>
  <img height="100" vspace='20' src="https://pbs.twimg.com/profile_images/1041703245683548160/lQz91qoP_400x400.jpg">
  <img height="100" vspace='20' src="https://app.builtvisible.com/public/scraper.jpg">
  <img height="100" vspace='20' src="https://cdn.worldvectorlogo.com/logos/nodejs-icon.svg">&nbsp;&nbsp;
  <h1>Google Indexation checker</h1>
</div>

 Scaling Google Indexation Checks with Node.js
---------------------------------------------------------------------------------------

This scripts provides an accurate report on the current Google indexation status for a given url. It displays `Indexed` or `Not Indexed` on a `results.csv` file.

The script is able to verify an unlimited number of URLs with any kind of problematic characters: parameters, encoding, reserved characters, unsafe characters, different alphabets – if Google has indexed it, our script will find it. To find read more read our article at <a href='https://builtvisible.com/scaling-google-indexation-checks-with-node-js/'>Builtvisible | Scaling Google indexation checks with Node.js</a>

> Google does not allow automated queries according to their <a href='https://support.google.com/webmasters/answer/66357?hl=en' target='_blank'>Terms of Service</a>. So, if you use our script, <strong>please use it responsibly</strong>.

Comparing Google indexation checker with other tools available:

<img vspace='20' src='https://app.builtvisible.com/public/chart.png'>

## Set Up

Download zip or clone repo:

```bash
git clone https://github.com/alvaro-escalante/google-index-checker.git
```

```bash
npm install
```

#### Scraper API 

The tool uses scraperapi as a proxy to be able to make multiple request without being blocked.

Set up an account with <a href="https://www.scraperapi.com/?fp_ref=alvaro14">scraperapi.com</a> to get your api key.

<img height='200' vspace='20' src="https://app.builtvisible.com/public/scraperkey.jpg?">


Insert your API key on the `APIKEY.js` file

<img vspace='20' src="https://app.builtvisible.com/public/apikey.jpg">

Depending on your plan you will have more or less concurrent request allowed, the script will automatcally make a request to scraperAPI to check the max concurrent request for the account.


You can use this file for testing: <a href='https://app.builtvisible.com/public/urls.csv'>urls.csv</a>


Place the `urls.csv` file on the main folder.
<img vspace='20' src="https://app.builtvisible.com/public/urls.jpg?">

> Note: Make sure urls containing commas have double quotes around them

## Start

```bash
npm start
``` 


## Results

In the ternimal:

<img vspace='20' src="https://app.builtvisible.com/public/results.jpg">

And finally a `results.csv` will be created with the indexation report.

| URL | Status |
| :--------- | :--------------------
https://builtvisible.com/ | Indexed
https://www.megafaaaaaakeurl.com/no-way | Not Indexed
http://thisoneisanotherfakeurlfortesting.co.uk/ | Not Indexed
https://descubriendoelviaje.es/ | Indexed
http://www.gruppo.mps.it/ap_trasparenzaweb/Documenti%5C103029489.pdf | Indexed
https://www.swing-autovermietung.de/#!ueberuns | Indexed

Any errors will go to `erros.csv` that will be renamed automatically into `ulrs.csv` removing the previous one and running the script again until there are no errors.

If there are malformed urls that can not be processs, there will be stored on a `exceptions.csv` file.

Scraperapi will not consider errors as requests.
 
> Note: Make sure the provided csv with the urls it's named `urls.csv`

## Used packages

| Name | Description |
| :--- | :----------- |
| **axios** | Promise based HTTP client for the browser and node.js |
| **chalk** | Terminal string styling done right |
| **csvtojson** | A tool concentrating on converting csv data to JSON with customised parser supporting |
| **fs** | Node filesystem module |