import { useState, useEffect } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function TemplateDialog({ codiceSpotty, handleTemplateSelect }) {
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("it");
  const [templatesByLanguage, setTemplatesByLanguage] = useState({});
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [errorTemplates, setErrorTemplates] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const TEMPLATES_PER_PAGE = 6;

  const fetchTemplates = async () => {
    if (!codiceSpotty) return;

    setLoadingTemplates(true);
    setErrorTemplates(null);

    try {
      const response = await fetch(
        `https://welcome.spottywifi.app/concierge/chatbot/api/templates.php?codice_spotty=${encodeURIComponent(codiceSpotty)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Errore HTTP! status: ${response.status} - ${errorData.message}`);
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

  useEffect(() => {
    if (isTemplateDialogOpen) {
      fetchTemplates();
    }
  }, [isTemplateDialogOpen]);

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    setCurrentPage(1);
    setSelectedTemplate(null);
  };

  const changePage = (pageNumber) => {
    setCurrentPage(pageNumber);
    setSelectedTemplate(null);
  };

  const templates = templatesByLanguage[selectedLanguage] || [];
  const totalPages = Math.ceil(templates.length / TEMPLATES_PER_PAGE);
  const currentTemplates = templates.slice((currentPage - 1) * TEMPLATES_PER_PAGE, currentPage * TEMPLATES_PER_PAGE);

  return (
    <Dialog open={isTemplateDialogOpen} onOpenChange={(open) => setIsTemplateDialogOpen(open)}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-[#54656f]">
          Template
        </Button>
      </DialogTrigger>
      <DialogContent className="p-0 max-h-screen overflow-y-auto">
        <div className="space-y-4 p-4 bg-background">
          <DialogHeader>
            <DialogTitle>Seleziona un template</DialogTitle>
            <DialogDescription>Scegli uno dei template disponibili per inviare un messaggio predefinito.</DialogDescription>
          </DialogHeader>
          <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleziona una lingua" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(templatesByLanguage).length > 0
                ? Object.keys(templatesByLanguage).map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang.toUpperCase()}
                    </SelectItem>
                  ))
                : null}
            </SelectContent>
          </Select>

          {selectedTemplate ? (
            <div>
              <Button onClick={() => handleTemplateSelect(selectedTemplate)}>Invia Template</Button>
            </div>
          ) : (
            <div>
              {currentTemplates.map((template) => (
                <div key={template.Uuid} onClick={() => setSelectedTemplate(template)}>
                  {template.Nome}
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>
                <ChevronLeft className="h-4 w-4 mr-2" />
                Precedente
              </Button>
              <span className="text-sm text-muted-foreground">Pagina {currentPage} di {totalPages}</span>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => changePage(currentPage + 1)}>
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
