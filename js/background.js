const url_base_descargar_pdf = "https://hemerotecadigital.bne.es";
const elementosPorPagina = 10;
const delayBetweenRequests = 2000; // 2 seconds delay between requests

async function bajarPagina(url_base, numero_pagina) {
  const url = new URL(url_base);
  var iteracion = numero_pagina * elementosPorPagina;
  url.searchParams.set('s', iteracion);

  try {
    const response = await fetch(url.toString());
    const texto = await response.text();
    const regex = /href="([^"]+\.pdf)/g;
    let enlaces = [];
    let match;

    while ((match = regex.exec(texto)) !== null) {
      enlaces.push(match[1]);
      let url_pdf = url_base_descargar_pdf + match[1];
      console.log(url_pdf);
      chrome.downloads.download({ url: url_pdf });
    }
    return enlaces;
  } catch (error) {
    console.error("Error al obtener la página:", error);
    throw error;
  }
}

async function processPages(currentTab, totalItems) {
  const totalPages = Math.ceil(totalItems.replace('.', '')/ elementosPorPagina);  
  for (let paginaActual = 0; paginaActual < totalPages; paginaActual++) {
    try {
      await bajarPagina(currentTab, paginaActual);
      await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
    } catch (error) {
      console.error(`Error processing page ${paginaActual}:`, error);
    }
  }

  console.log("Finished processing all pages");
}

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'scrapedData') {
    processPages(request.currentTab, request.total);
  }
});
