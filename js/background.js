const url_base_descargar_pdf = "https://hemerotecadigital.bne.es";
const elementosPorPagina = 10;
const delayBetweenRequests = 2000;

class DownloadManager {
  constructor() {
    this.isCancelled = false;
    this.activeTabId = null;
    this.initializeListeners();
  }

  initializeListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      return this.handleMessages(request, sender, sendResponse);
    });
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.handleTabRemoval(tabId);
    });
  }

  async initializeStatusDisplay(tabId) {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: function() {
        if (!document.getElementById('extension-status')) {
          const statusDiv = document.createElement('div');
          statusDiv.id = 'extension-status';
          statusDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #f0f9ff;
            border-bottom: 1px solid #93c5fd;
            color: #1e40af;
            padding: 12px;
            text-align: center;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
          `;
          
          document.body.insertBefore(statusDiv, document.body.firstChild);
          document.body.style.marginTop = 
            (parseInt(getComputedStyle(statusDiv).height) + 12) + 'px';
        }
      }
    });
  }

  async updatePageStatus(message) {
    if (!this.activeTabId) return;
    
    try {
      await chrome.scripting.executeScript({
        target: { tabId: this.activeTabId },
        func: function(statusMessage) {
          const statusDiv = document.getElementById('extension-status');
          if (statusDiv) {
            statusDiv.textContent = statusMessage;
          }
        },
        args: [message]
      });
    } catch (error) {
      console.error('Error al actualizar estado en página:', error);
    }
  }

  async downloadPDF(url_pdf) {
    return new Promise((resolve, reject) => {
      chrome.downloads.download({ url: url_pdf }, (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Error al iniciar descarga: ${chrome.runtime.lastError.message}`));
          return;
        }

        const onChanged = (delta) => {
          if (delta.id === downloadId) {
            if (delta.state && delta.state.current === 'complete') {
              chrome.downloads.onChanged.removeListener(onChanged);
              resolve();
            }
            if (delta.error) {
              chrome.downloads.onChanged.removeListener(onChanged);
              reject(new Error(`Error en la descarga: ${delta.error.current}`));
            }
          }
        };
        
        chrome.downloads.onChanged.addListener(onChanged);
      });
    });
  }

  async bajarPagina(url_base, numero_pagina, pdfStartIndex, pdfEndIndex) {
    try {
      const baseURL = new URL(url_base);
      const iteracion = numero_pagina * elementosPorPagina;
      baseURL.searchParams.set('s', iteracion.toString());

      await this.updatePageStatus(`Procesando página ${numero_pagina + 1}`);
      
      const response = await fetch(baseURL.toString());
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const texto = await response.text();
      const regex = /href="([^"]+\.pdf)/g;
      const enlaces = [];
      let match;
      
      while ((match = regex.exec(texto)) !== null) {
        enlaces.push(match[1]);
      }

      // Calculate which PDFs to download from this page
      const startIndex = Math.max(0, pdfStartIndex);
      const endIndex = Math.min(enlaces.length, pdfEndIndex + 1);

      for (let i = startIndex; i < endIndex; i++) {
        if (this.isCancelled) {
          throw new Error('Operación cancelada por el usuario');
        }

        const url_pdf = url_base_descargar_pdf + enlaces[i];
        await this.updatePageStatus(`Descargando documento ${numero_pagina * elementosPorPagina + i + 1}`);
        await this.downloadPDF(url_pdf);
      }
      
      return enlaces;
    } catch (error) {
      console.error("Error al obtener la página:", error);
      await this.updatePageStatus(`Error: ${error.message}`);
      throw error;
    }
  }

  async processDocumentRange(currentTab, range) {
    this.isCancelled = false;
    this.activeTabId = currentTab.id;

    try {
      await this.initializeStatusDisplay(this.activeTabId);
      
      // Convert document numbers to pages and positions
      const startPage = Math.floor((range.startDoc - 1) / elementosPorPagina);
      const endPage = Math.floor((range.endDoc - 1) / elementosPorPagina);
      
      for (let currentPage = startPage; currentPage <= endPage; currentPage++) {
        if (this.isCancelled) {
          throw new Error('Operación cancelada por el usuario');
        }

        // Calculate which PDFs to get from this page
        const pdfStartIndex = currentPage === startPage ? (range.startDoc - 1) % elementosPorPagina : 0;
        const pdfEndIndex = currentPage === endPage ? (range.endDoc - 1) % elementosPorPagina : elementosPorPagina - 1;

        await this.bajarPagina(currentTab.url, currentPage, pdfStartIndex, pdfEndIndex);
        
        if (currentPage < endPage) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
        }
      }
      
      await this.updatePageStatus('Proceso completado');
    } catch (error) {
      console.error(`Error en el procesamiento:`, error);
      await this.updatePageStatus(`Error: ${error.message}`);
      throw error;
    }
  }

  handleMessages(request, sender, sendResponse) {
    if (request.action === 'scrapedData') {
      const tabId = sender.tab ? sender.tab.id : null;
      const url = sender.tab ? sender.tab.url : null;
      
      if (!tabId || !url) {
        console.error('No se pudo obtener el ID o URL de la pestaña');
        return;
      }

      this.processDocumentRange(
        {id: tabId, url: url}, 
        request.range
      ).catch(error => console.error('Error final:', error));
      
      return true;
    } else if (request.action === 'setTotalResults') {
      chrome.runtime.sendMessage({ 
        action: 'updateTotalResults', 
        total: request.total 
      });
      return true;
    } else if (request.action === 'cancelDownload') {
      this.isCancelled = true;
      this.updatePageStatus('Iniciando cancelación...');
      return true;
    }
  }

  handleTabRemoval(tabId) {
    if (tabId === this.activeTabId) {
      this.activeTabId = null;
      this.isCancelled = true;
    }
  }
}

// Inicializar el gestor de descargas
const downloadManager = new DownloadManager();