// background.js

const url_base = "https://hemerotecadigital.bne.es/hd/es/results?parent=";

const url_iterator = "&t=alt-asc&c=";

const url_base_descargar_pdf="https://hemerotecadigital.bne.es";

const elementosPorPagina = 10;


function bajarPagina(padre,numero_pagina){
	//generamos la url de la página correspondiente
	
	var url_pagina = url_base + padre+ url_iterator + numero_pagina;
	console.log('Bajamos '+url_pagina);
	fetch(url_pagina)
        .then(response => response.text())  // Convertir la respuesta en texto
        .then(texto => {
//            console.log("Contenido de la página:", texto);

            // Usar una expresión regular para encontrar todos los enlaces que contienen 'pdf'
            const regex = /href="([^"]+\.pdf)/g;
            let enlaces = [];
            let match;

            while ((match = regex.exec(texto)) !== null) {
                enlaces.push(match[1]);
		let url_pdf=url_base_descargar_pdf+match[1];
		console.log(url_pdf);
                chrome.downloads.download({ url: url_pdf});
            }

            console.log("Enlaces PDF encontrados:", enlaces);

            // Puedes procesar los enlaces como necesites aquí
        })
        .catch(error => {
            console.error("Error al obtener la página:", error);
        });

}
  
   
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.action === 'scrapedData') {

    //paginamos
        
    let paginaActual = 1;

    while ((paginaActual - 1) * elementosPorPagina < request.total) {
      console.log(paginaActual);
        const inicio = (paginaActual - 1) * elementosPorPagina + 1;
        const fin = Math.min(paginaActual * elementosPorPagina, request.total);
        
        bajarPagina(request.dbCode,paginaActual);
        paginaActual++;
        
        
    }


    
    for (var i = 1; i <= request.total; i++) {
      pagina = url_base + request.dbCode + url_iterator + i;
//      chrome.downloads.download({ url: pagina });
    }
  }
});
