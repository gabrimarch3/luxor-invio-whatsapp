// components/TemplateDialog.js

// Importazione delle dipendenze necessarie
import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogHeader,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Componente principale per il dialogo dei template
export default function TemplateDialog(props) {
  // Destrutturazione delle props
  const {
    isTemplateDialogOpen,
    setIsTemplateDialogOpen,
    handleSendMessage,
    codiceSpotty,
    selectedChat,
    scrollToBottom,
  } = props;

  // Stati per gestire i template e le interazioni dell'utente
  const [templatesByLanguage, setTemplatesByLanguage] = useState({});
  const [selectedLanguage, setSelectedLanguage] = useState("it");
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [errorTemplates, setErrorTemplates] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateType, setTemplateType] = useState('all'); // Stato per il filtro dei tipi di template

  // Effetto per caricare i template quando il dialogo viene aperto
  useEffect(() => {
    if (isTemplateDialogOpen) {
      fetchTemplates();
    }
  }, [isTemplateDialogOpen]);

  // Funzione per recuperare i template dal server
  const fetchTemplates = async () => {
    if (!codiceSpotty) return;

    setLoadingTemplates(true);
    setErrorTemplates(null);

    try {
      const response = await fetch(
        `/api/templates?codice_spotty=${codiceSpotty}`
      );

      if (!response.ok) {
        throw new Error("Errore nel recupero dei template");
      }

      const data = await response.json();

      if (data.templates) {
        setTemplatesByLanguage(data.templates);
      } else {
        throw new Error("Struttura dei template non valida");
      }
    } catch (error) {
      console.error("Errore nel recupero dei template:", error);
      setErrorTemplates("Errore nel recupero dei template.");
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Funzione per gestire la selezione e l'invio di un template
  const handleTemplateSelect = async (template) => {
    if (
      !template ||
      !template.NomeTemplate ||
      !selectedChat ||
      !codiceSpotty
    ) {
      console.error("Parametri mancanti per l'invio del template.");
      return;
    }

    let endpoint = '/api/send-template';
    let method = 'POST';
    let body;
    let queryParams;

    // Preparazione dei dati per l'invio del template in base al tipo (media o testo)
    if (template.IsMediaTemplate) {
      endpoint = '/api/send-media-template';
      const formData = new FormData();
      formData.append('codice_spotty', codiceSpotty);
      formData.append('mobile', selectedChat);
      formData.append('template_name', template.NomeTemplate);
      formData.append('lang_code', selectedLanguage);
      formData.append('media_url', `https://media.spottywifi.app/wa/${codiceSpotty.replace("spotty", "")}/images/${template.Immagine}`);
      formData.append('caption', template.CorpoMessaggio);
      body = formData;
    } else {
      // Per i template di testo, usiamo i query params
      queryParams = new URLSearchParams({
        codice_spotty: codiceSpotty,
        mobile: selectedChat,
        template_name: template.NomeTemplate,
        lang_code: selectedLanguage,
        params: template.CorpoMessaggio
      });
      endpoint = `${endpoint}?${queryParams.toString()}`;
      method = 'GET';
    }

    console.log(`Invio template ${template.IsMediaTemplate ? 'con media' : 'di testo'} a ${endpoint}`);
    console.log('Dati inviati:', template.IsMediaTemplate ? Object.fromEntries(body) : queryParams.toString());

    try {
      const response = await fetch(endpoint, {
        method: method,
        ...(template.IsMediaTemplate ? { body } : {}),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Errore nella risposta del server:", errorData);
        throw new Error("Errore nell'invio del template");
      }

      const data = await response.json();
      console.log("Template inviato con successo:", data);

    } catch (error) {
      console.error("Errore nell'invio del template:", error);
    }

    // Chiusura del dialogo e reset degli stati dopo l'invio
    setIsTemplateDialogOpen(false);
    setSelectedTemplate(null);
    scrollToBottom();
  };

  // Funzione di utilità per ottenere il MIME type dall'estensione del file
  const getMimeType = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'mp4': 'video/mp4',
      'pdf': 'application/pdf',
      // Aggiungi altri tipi MIME se necessario
    };
    return mimeTypes[ext] || 'application/octet-stream';
  };

  // Funzione per gestire il cambio di lingua
  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    setCurrentPage(1);
    setSelectedTemplate(null);
  };

  // Funzione per cambiare pagina nella lista dei template
  const changePage = (pageNumber) => {
    setCurrentPage(pageNumber);
    setSelectedTemplate(null);
  };

  // Funzione per gestire il click su un template
  const handleTemplateClick = (template) => {
    setSelectedTemplate(template);
  };

  // Funzione per chiudere l'anteprima del template
  const closePreview = () => {
    setSelectedTemplate(null);
  };

  // Funzione per rimuovere i caratteri di escape dal contenuto del messaggio
  const unescapeMessageContent = (content) => {
    if (!content) return "";
    return content
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\");
  };

  // Validazione e preparazione dei template per la visualizzazione
  const validTemplatesByLanguage =
    templatesByLanguage && typeof templatesByLanguage === "object"
      ? templatesByLanguage
      : {};

  const templates = validTemplatesByLanguage[selectedLanguage] || [];

  // Funzione per filtrare i template in base al tipo selezionato
  const filterTemplates = (templates) => {
    switch(templateType) {
      case 'text':
        return templates.filter(t => !t.IsMediaTemplate);
      case 'media':
        return templates.filter(t => t.IsMediaTemplate);
      default:
        return templates;
    }
  };

  const filteredTemplates = filterTemplates(templates);

  // Configurazione della paginazione
  const TEMPLATES_PER_PAGE = 6;
  const totalPages = Math.ceil(filteredTemplates.length / TEMPLATES_PER_PAGE);
  const currentTemplates = filteredTemplates.slice(
    (currentPage - 1) * TEMPLATES_PER_PAGE,
    currentPage * TEMPLATES_PER_PAGE
  );

  // Rendering del componente
  return (
    <Dialog
      open={isTemplateDialogOpen}
      onOpenChange={(open) => {
        setIsTemplateDialogOpen(open);
        setSelectedTemplate(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-[#54656f]">
          Template
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 max-h-screen overflow-y-auto">
        <div className="space-y-4 p-4 bg-background">
          <DialogHeader>
            <DialogTitle>Seleziona un template</DialogTitle>
            <DialogDescription>
              Scegli uno dei template disponibili per inviare un messaggio
              predefinito.
            </DialogDescription>
          </DialogHeader>
          {/* Selettore della lingua */}
          <div className="max-w-xs mx-auto">
            <Select
              value={selectedLanguage}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona una lingua" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(validTemplatesByLanguage).length > 0 ? (
                  Object.keys(validTemplatesByLanguage).map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang.toUpperCase()}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="it">IT</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro per tipo di template */}
          <div className="max-w-xs mx-auto">
            <Select value={templateType} onValueChange={setTemplateType}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Filtra per tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tutti i template</SelectItem>
                <SelectItem value="text">Solo testo</SelectItem>
                <SelectItem value="media">Con media</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Visualizzazione dell'anteprima del template o della lista dei template */}
          {selectedTemplate ? (
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={closePreview}
                className="absolute top-2 right-2 z-10"
              >
                <X className="h-6 w-6" />
              </Button>
              {/* Anteprima del messaggio */}
              <div className="flex justify-end mt-8">
                <div
                  className="max-w-full sm:max-w-md md:max-w-lg p-2 rounded-lg bg-[#dcf8c6] text-right"
                  style={{ overflowWrap: "break-word" }}
                >
                  {/* Visualizzazione dei media nell'anteprima */}
                  {selectedTemplate.Immagine && (
                    <div className="mb-2">
                      {selectedTemplate.Immagine.endsWith(".pdf") ? (
                        <div className="flex items-center justify-center">
                          <FileText className="w-12 h-12 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">PDF</p>
                        </div>
                      ) : /\.(mp4|mov|avi|mkv)$/i.test(
                          selectedTemplate.Immagine
                        ) ? (
                        <video
                          src={`https://media.spottywifi.app/wa/${codiceSpotty.replace(
                            "spotty",
                            ""
                          )}/images/${selectedTemplate.Immagine}`}
                          controls
                          className="mb-2 max-w-full h-auto rounded max-h-64"
                        />
                      ) : (
                        <img
                          src={`https://media.spottywifi.app/wa/${codiceSpotty.replace(
                            "spotty",
                            ""
                          )}/images/${selectedTemplate.Immagine}`}
                          alt={selectedTemplate.Nome}
                          className="mb-2 max-w-full h-auto rounded max-h-64"
                        />
                      )}
                    </div>
                  )}

                  {/* Contenuto del messaggio */}
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    className="prose text-sm break-words"
                  >
                    {unescapeMessageContent(selectedTemplate.CorpoMessaggio)}
                  </ReactMarkdown>
                  {/* Orario */}
                  <div className="flex items-center justify-end text-xs text-[#667781] mt-1">
                    {format(new Date(), "HH:mm")}
                  </div>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button
                  onClick={() => {
                    handleTemplateSelect(selectedTemplate);
                  }}
                  className="mt-4"
                >
                  Invia Template
                </Button>
              </div>
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentTemplates.map((template) => (
                <Card
                  key={template.Uuid}
                  className="hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => handleTemplateClick(template)}
                >
                  <CardHeader className="p-0 overflow-hidden">
                    <div className="w-full h-32 bg-muted rounded-t-lg flex items-center justify-center">
                      {template.IsMediaTemplate ? (
                        <div className="flex flex-col items-center">
                          <ImageIcon className="w-12 h-12 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Media</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <FileText className="w-12 h-12 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Testo</p>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-3">
                    <h3 className="text-sm font-semibold text-foreground truncate">
                      {template.Nome}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {template.NomeTemplate}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tipo: {template.IsMediaTemplate ? 'Media' : 'Testo'}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">
              Nessun template disponibile per i criteri selezionati.
            </p>
          )}
          {/* Paginazione */}
          {totalPages > 1 && !selectedTemplate && (
            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => changePage(currentPage - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Precedente
              </Button>
              <span className="text-sm text-muted-foreground">
                Pagina {currentPage} di {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => changePage(currentPage + 1)}
              >
                Successiva
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}