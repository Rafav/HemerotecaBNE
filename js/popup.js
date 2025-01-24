document.addEventListener('DOMContentLoaded', function () {
  const startButton = document.getElementById('startButton');
  const startDoc = document.getElementById('startDoc');
  const endDoc = document.getElementById('endDoc');
  const errorMessage = document.getElementById('errorMessage');
  const totalResultsDiv = document.getElementById('total-results');
  let totalResults = 0;

  // Validate input on change
  function validateRange() {
    const start = parseInt(startDoc.value);
    const end = parseInt(endDoc.value);

    if (isNaN(start) || isNaN(end) || start < 1 || end < 1) {
      errorMessage.textContent = 'Por favor, ingrese números válidos';
      errorMessage.style.display = 'block';
      startButton.disabled = true;
      return false;
    }

    if (start > end) {
      errorMessage.textContent = 'El documento inicial debe ser menor o igual al final';
      errorMessage.style.display = 'block';
      startButton.disabled = true;
      return false;
    }

    if (end > totalResults) {
      errorMessage.textContent = `El rango permitido es 1-${totalResults}`;
      errorMessage.style.display = 'block';
      startButton.disabled = true;
      return false;
    }

    errorMessage.style.display = 'none';
    startButton.disabled = false;
    return true;
  }

  startDoc.addEventListener('input', validateRange);
  endDoc.addEventListener('input', validateRange);

  // Initialize with total results
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const activeTab = tabs[0];
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      function: getTotalResults
    });
  });

  // Listen for total results update
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'updateTotalResults') {
      totalResults = request.total;
      totalResultsDiv.textContent = `Total documentos disponibles: ${totalResults}`;
      startDoc.max = totalResults;
      endDoc.max = totalResults;
    }
  });

  startButton.addEventListener('click', function () {
    if (!validateRange()) return;

    const range = {
      startDoc: parseInt(startDoc.value),
      endDoc: parseInt(endDoc.value)
    };

    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      const activeTab = tabs[0];

      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        function: startContentScript,
        args: [activeTab.url, range]
      });
    });
  });
});

function getTotalResults() {
  var spanElementos = document.querySelectorAll('span.mr-2');
  Array.from(spanElementos).forEach(function (spanElemento) {
    if (spanElemento.className.trim() === 'mr-2') {
      var resultadoElemento = spanElemento.querySelector('strong');
      if (resultadoElemento) {
        const total = resultadoElemento.textContent.trim();
        chrome.runtime.sendMessage({ 
          action: 'setTotalResults', 
          total: parseInt(total.replace(/\./g, ''))
        });
      }
    }
  });
}

function startContentScript(currentTab, range) {
  var spanElementos = document.querySelectorAll('span.mr-2');
  let total;

  Array.from(spanElementos).forEach(function (spanElemento) {
    if (spanElemento.className.trim() === 'mr-2') {
      var resultadoElemento = spanElemento.querySelector('strong');
      if (resultadoElemento) {
        total = resultadoElemento.textContent.trim();
      }
    }
  });

  chrome.runtime.sendMessage({ 
    action: 'scrapedData', 
    currentTab, 
    total,
    range 
  });
}

document.getElementById('cancelButton').addEventListener('click', function() {
  chrome.runtime.sendMessage({ action: 'cancelDownload' });
});
