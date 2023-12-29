// background.js

const url_base_descargar_pdf = "https://hemerotecadigital.bne.es";

const elementosPorPagina = 10;


function bajarPagina(url_base, numero_pagina) {
  //generamos la url de la página correspondiente


  const url = new URL(url_base);
  var iteracion = numero_pagina * elementosPorPagina;

  // Modificar el valor del parámetro 's' que sirve de paginador
  url.searchParams.set('s', iteracion);

  // Devolver la URL modificada
  console.log(numero_pagina * elementosPorPagina);

  console.log('Bajamos ' + url.toString());

  fetch(url.toString())
    .then(response => response.text())  // Convertir la respuesta en texto
    .then(texto => {
      // Usamos una expresión regular para encontrar todos los enlaces que contienen 'pdf'
      const regex = /href="([^"]+\.pdf)/g;
      let enlaces = [];
      let match;

      while ((match = regex.exec(texto)) !== null) {
        enlaces.push(match[1]);
        let url_pdf = url_base_descargar_pdf + match[1];
        console.log(url_pdf);
        chrome.downloads.download({ url: url_pdf });
      }
      console.log("Enlaces PDF encontrados:", enlaces);
    })
    .catch(error => {
      console.error("Error al obtener la página:", error);
    });

}


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'scrapedData') {
    let paginaActual = 0;

    while ((paginaActual * elementosPorPagina) < request.total) {

      //bajamos pagina a pagina

      bajarPagina(request.currentTab, paginaActual);
      paginaActual++;
    }
  }
});

