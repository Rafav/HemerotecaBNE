document.addEventListener('DOMContentLoaded', function () {
  const startButton = document.getElementById('startButton');

  startButton.addEventListener('click', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];

      // Enviar un mensaje al script de contenido (content.js)
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        function: startContentScript,
        args: [activeTab.url]
      });
    });
  });
});

function startContentScript(currentTab) {
  // Este código se ejecutará en el contexto de la pestaña activa
  // Realiza el scraping aquí y devuelve los resultados
  const scrapedData = {}; // Realiza el scraping y guarda los resultados aquí

  //let dbCode ;
  let total;

  console.log(currentTab);


  var spanElementos = document.querySelectorAll('span.mr-2');

  Array.from(spanElementos).forEach(function (spanElemento) {
    // Comprobar si el elemento <span> tiene únicamente la clase 'mr-2'
    if (spanElemento.className.trim() === 'mr-2') {
      // Buscar dentro de este <span> el elemento <strong>
      var resultadoElemento = spanElemento.querySelector('strong');

      if (resultadoElemento) {
        total = resultadoElemento.textContent.trim();
        console.log("Número de resultados:", total);
      }
    }
  });
  // Envía los resultados de vuelta a popup.js
  chrome.runtime.sendMessage({ action: 'scrapedData', currentTab, total });
}

