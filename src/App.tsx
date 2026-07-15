import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Upload, Play, Pause, Download, Search, FileText, CheckCircle, 
  AlertTriangle, RefreshCw, Sliders, BookOpen, ArrowRight, Trash2, 
  Edit2, Save, Languages, FileSpreadsheet, Plus, Check, X, HelpCircle, AlertCircle, Key
} from "lucide-react";
import { CsvRow, VerificationStats, AppConfig } from "./types";
import { parseCsv, stringifyCsv, detectDelimiter } from "./utils/csv";
import { getSampleRows, SAMPLE_HEADERS } from "./utils/sampleData";

export default function App() {
  // Stan główny kroku aplikacji
  const [step, setStep] = useState<'upload' | 'mapping' | 'verifying'>('upload');
  
  // Dane wejściowe CSV
  const [rawCsvText, setRawCsvText] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [selectedDelimiter, setSelectedDelimiter] = useState<string>("auto");
  const [fileName, setFileName] = useState<string>("");
  
  // Konfiguracja weryfikacji
  const [config, setConfig] = useState<AppConfig>({
    originalColumn: "",
    translationColumns: [],
    delimiter: ",",
    customContext: "",
    batchSize: 20,
    maxLimit: "all",
    model: "gemini-3.5-flash",
    customApiKey: ""
  });

  // Stany pętli weryfikacyjnej
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [logs, setLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'success' | 'warn' | 'error' }>>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  // Referencja do śledzenia aktualnego stanu weryfikacji, aby uniknąć problemów z zamknięciami (closures)
  const isVerifyingRef = useRef<boolean>(false);
  const rowsRef = useRef<CsvRow[]>([]);
  
  useEffect(() => {
    isVerifyingRef.current = isVerifying;
  }, [isVerifying]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // Stan wyszukiwania i filtrowania tabeli wyników
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'correct' | 'incorrect' | 'pending' | 'failed'>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 20;

  // Stan edycji komórki (rowId i kolumna)
  const [editingCell, setEditingCell] = useState<{ rowId: string; column: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");

  // Stan trybu pobierania
  const [exportMode, setExportMode] = useState<'overwrite' | 'add_columns'>('overwrite');

  // Funkcja dodawania logów
  const addLog = (text: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    const time = new Date().toLocaleTimeString('pl-PL');
    setLogs((prev) => [...prev, { time, text, type }]);
  };

  // Automatyczne przewijanie logów w dół
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Automatyczne dopasowanie domyślnych kolumn po zaimportowaniu nagłówków
  const autoDetectColumns = (cols: string[]) => {
    // Nie zgadujemy kolumn docelowych na prośbę użytkownika, by miał pełną swobodę wyboru.
    // Domyślnie ustawiamy tylko pierwszą kolumnę jako oryginał.
    setConfig(prev => ({
      ...prev,
      originalColumn: cols[0] || "",
      translationColumns: [] 
    }));
  };

  // Przetworzenie pliku CSV lub wklejonego tekstu
  const handleProcessCsv = (csvText: string, name: string = "Wklejona lista") => {
    if (!csvText.trim()) return;
    
    try {
      const delimiter = selectedDelimiter === "auto" ? detectDelimiter(csvText) : selectedDelimiter;
      const parsed = parseCsv(csvText, delimiter);
      
      if (parsed.headers.length === 0) {
        alert("Nie wykryto żadnych kolumn w pliku CSV.");
        return;
      }

      setHeaders(parsed.headers);
      setFileName(name);
      
      const mappedRows: CsvRow[] = parsed.rows.map((row, idx) => {
        const origCol = parsed.headers[0] || "";

        return {
          id: `row-${idx}`,
          originalValues: row,
          originalWord: row[origCol] || "",
          status: 'pending'
        };
      });

      setRows(mappedRows);
      autoDetectColumns(parsed.headers);
      setConfig(prev => ({ ...prev, delimiter }));
      setStep('mapping');
      
      addLog(`Zaimportowano plik "${name}" pomyślnie. Znaleziono ${mappedRows.length} wierszy.`, "success");
    } catch (err: any) {
      alert(`Błąd podczas przetwarzania pliku CSV: ${err.message}`);
    }
  };

  // Obsługa przeciągania pliku (Drag & Drop)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleProcessCsv(text, file.name);
      };
      reader.readAsText(file, "UTF-8");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleProcessCsv(text, file.name);
      };
      reader.readAsText(file, "UTF-8");
    }
  };

  // Ładowanie przykładowych danych
  const loadSampleData = () => {
    setHeaders(SAMPLE_HEADERS);
    setFileName("Przykładowy zestaw idiomy.csv");
    const sampleRows = getSampleRows();
    setRows(sampleRows);
    
    setConfig({
      originalColumn: SAMPLE_HEADERS[0],
      translationColumns: [SAMPLE_HEADERS[1]],
      delimiter: ",",
      customContext: "",
      batchSize: 20,
      maxLimit: "all"
    });
    
    setStep('mapping');
    addLog("Wczytano przykładowy zestaw testowy z najczęstszymi błędami Google Translate.", "info");
  };

  // Potwierdzenie mapowania kolumn
  const confirmMapping = () => {
    if (!config.originalColumn) {
      alert("Proszę wybrać kolumnę z oryginalnym słówkiem.");
      return;
    }
    if (config.translationColumns.length === 0) {
      alert("Proszę wybrać przynajmniej jedną kolumnę z tłumaczeniem do zweryfikowania.");
      return;
    }

    // Zaktualizuj wyodrębnione słówka w wierszach na podstawie wybranych kolumn
    const updatedRows = rows.map(row => {
      const correctedValues: Record<string, string> = {};
      const isColumnCorrect: Record<string, boolean> = {};
      
      config.translationColumns.forEach(col => {
        correctedValues[col] = row.originalValues[col] || "";
        isColumnCorrect[col] = true; // domyślnie poprawne przed analizą
      });

      return {
        ...row,
        originalWord: row.originalValues[config.originalColumn] || "",
        status: 'pending' as const,
        correctedValues,
        isColumnCorrect,
        userModified: {},
        errorMessage: undefined
      };
    });

    setRows(updatedRows);
    setStep('verifying');
    addLog(`Rozpoczęto konfigurację weryfikacji dla kolumn: ${config.translationColumns.join(", ")}.`, "info");
  };

  // Obliczanie statystyk
  const stats = useMemo<VerificationStats>(() => {
    const totalCount = config.maxLimit === 'all' ? rows.length : Math.min(Number(config.maxLimit), rows.length);
    const limitRows = rows.slice(0, totalCount);

    return {
      total: totalCount,
      pending: limitRows.filter(r => r.status === 'pending').length,
      verifying: limitRows.filter(r => r.status === 'verifying').length,
      correct: limitRows.filter(r => r.status === 'correct').length,
      incorrect: limitRows.filter(r => r.status === 'incorrect').length,
      failed: limitRows.filter(r => r.status === 'failed').length,
    };
  }, [rows, config.maxLimit]);

  // Główna pętla weryfikacyjna wywoływana partiami (batch)
  const startVerificationLoop = async () => {
    if (isVerifying) return;
    setIsVerifying(true);
    isVerifyingRef.current = true;
    addLog("Uruchomiono proces weryfikacji słówek...", "info");

    const processNextBatch = async () => {
      if (!isVerifyingRef.current) {
        addLog("Weryfikacja wstrzymana przez użytkownika.", "warn");
        return;
      }

      const currentRows = rowsRef.current;
      const totalToVerify = config.maxLimit === 'all' ? currentRows.length : Math.min(Number(config.maxLimit), currentRows.length);
      
      const pendingIndices: number[] = [];
      for (let i = 0; i < totalToVerify; i++) {
        if (currentRows[i].status === 'pending' || currentRows[i].status === 'failed') {
          pendingIndices.push(i);
        }
      }

      if (pendingIndices.length === 0) {
        addLog("Wszystkie zaplanowane słówka zostały pomyślnie zweryfikowane!", "success");
        setIsVerifying(false);
        return;
      }

      const batchIndices = pendingIndices.slice(0, config.batchSize);
      const batchItems = batchIndices.map(idx => {
        const row = currentRows[idx];
        const translations: Record<string, string> = {};
        config.translationColumns.forEach(col => {
          translations[col] = row.originalValues[col] || "";
        });
        return {
          id: row.id,
          original: row.originalWord,
          translations
        };
      });

      setRows(prevRows => {
        const next = [...prevRows];
        batchIndices.forEach(idx => {
          next[idx] = { ...next[idx], status: 'verifying' };
        });
        return next;
      });

      addLog(`Weryfikacja paczki (słówka od ${batchIndices[0] + 1} do ${batchIndices[batchIndices.length - 1] + 1})...`, "info");

      try {
        const response = await fetch("/api/verify-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: batchItems,
            columns: config.translationColumns.map(col => {
              const index = parseInt(col);
              return isNaN(index) ? col : headers[index];
            }),
            context: config.customContext,
            model: config.model,
            apiKey: config.customApiKey
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || errData.details || "Nieznany błąd serwera");
        }

        const data = await response.json();
        const resultsMap = new Map<string, any>();
        if (data.results && Array.isArray(data.results)) {
          data.results.forEach((res: any) => {
            resultsMap.set(res.id, res);
          });
        }

        setRows(prevRows => {
          const next = [...prevRows];
          batchIndices.forEach(idx => {
            const row = next[idx];
            const aiRes = resultsMap.get(row.id);

            if (aiRes && Array.isArray(aiRes.corrections)) {
              const correctedValues = { ...row.correctedValues };
              const isColumnCorrect: Record<string, boolean> = {};
              let anyCorrection = false;

              aiRes.corrections.forEach((corr: any) => {
                const colName = corr.column;
                const correctedWord = corr.corrected;
                if (colName && correctedWord !== undefined) {
                  correctedValues[colName] = correctedWord;
                  const origVal = row.originalValues[colName] || "";
                  const isCorrect = origVal.toLowerCase().trim() === correctedWord.toLowerCase().trim();
                  isColumnCorrect[colName] = isCorrect;
                  if (!isCorrect) {
                    anyCorrection = true;
                  }
                }
              });

              next[idx] = {
                ...row,
                status: anyCorrection ? 'incorrect' : 'correct',
                correctedValues,
                isColumnCorrect
              };
            } else {
              next[idx] = {
                ...row,
                status: 'failed',
                errorMessage: "Brak wyniku z AI dla tej pozycji."
              };
            }
          });
          return next;
        });

        addLog(`Ukończono weryfikację paczki. Kontynuuję...`, "success");
        await new Promise(resolve => setTimeout(resolve, 800));
        processNextBatch();

      } catch (error: any) {
        console.error("Błąd paczki:", error);
        addLog(`Błąd w paczce: ${error.message || "Błąd komunikacji"}.`, "error");
        
        setRows(prevRows => {
          const next = [...prevRows];
          batchIndices.forEach(idx => {
            next[idx] = {
              ...next[idx],
              status: 'failed',
              errorMessage: error.message || "Błąd serwera"
            };
          });
          return next;
        });

        setIsVerifying(false);
      }
    };

    processNextBatch();
  };

  // Zatrzymanie weryfikacji
  const pauseVerification = () => {
    setIsVerifying(false);
    isVerifyingRef.current = false;
    addLog("Wstrzymano weryfikację. Proces zatrzyma się po ukończeniu bieżącej paczki.", "warn");
  };

  // Reset do początku
  const handleReset = () => {
    if (confirm("Czy na pewno chcesz wyczyścić wszystkie dane i zacząć od nowa?")) {
      setStep('upload');
      setRows([]);
      setHeaders([]);
      setFileName("");
      setIsVerifying(false);
      setLogs([]);
      setSearchTerm("");
      setStatusFilter("all");
    }
  };

  // Filtrowanie i wyszukiwanie w tabeli wyników
  const filteredRows = useMemo(() => {
    const totalToVerify = config.maxLimit === 'all' ? rows.length : Math.min(Number(config.maxLimit), rows.length);
    const visibleRows = rows.slice(0, totalToVerify);

    return visibleRows.filter(row => {
      // Filtr statusu
      if (statusFilter !== 'all') {
        if (statusFilter === 'correct' && row.status !== 'correct') return false;
        if (statusFilter === 'incorrect' && row.status !== 'incorrect') return false;
        if (statusFilter === 'pending' && row.status !== 'pending' && row.status !== 'verifying') return false;
        if (statusFilter === 'failed' && row.status !== 'failed') return false;
      }

      // Filtr wyszukiwania słów
      if (searchTerm.trim() !== "") {
        const query = searchTerm.toLowerCase();
        const originalMatch = row.originalWord.toLowerCase().includes(query);
        const valuesMatch = Object.values(row.originalValues).some(v => 
          typeof v === 'string' && v.toLowerCase().includes(query)
        );
        const correctedMatch = row.correctedValues 
          ? Object.values(row.correctedValues).some(v => 
              typeof v === 'string' && v.toLowerCase().includes(query)
            ) 
          : false;
        
        return originalMatch || valuesMatch || correctedMatch;
      }

      return true;
    });
  }, [rows, statusFilter, searchTerm, config.maxLimit, config.translationColumns]);

  // Pagination
  const totalPages = Math.ceil(filteredRows.length / itemsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRows.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRows, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  // Ręczna edycja i zapis słówka dla danej kolumny
  const startEditing = (rowId: string, column: string, currentValue: string) => {
    setEditingCell({ rowId, column });
    setEditingValue(currentValue);
  };

  const saveInlineEdit = (rowId: string, column: string) => {
    setRows(prev => prev.map(row => {
      if (row.id === rowId) {
        const correctedValues = { ...row.correctedValues, [column]: editingValue };
        const userModified = { ...row.userModified, [column]: true };
        
        const isColumnCorrect = { ...row.isColumnCorrect };
        const origVal = row.originalValues[column] || "";
        isColumnCorrect[column] = origVal.toLowerCase().trim() === editingValue.toLowerCase().trim();

        let anyCorrection = false;
        config.translationColumns.forEach(col => {
          const originalValue = row.originalValues[col] || "";
          const val = correctedValues[col] || "";
          if (originalValue.toLowerCase().trim() !== val.toLowerCase().trim()) {
            anyCorrection = true;
          }
        });

        return {
          ...row,
          correctedValues,
          isColumnCorrect,
          userModified,
          status: anyCorrection ? 'incorrect' : 'correct'
        };
      }
      return row;
    }));
    setEditingCell(null);
    addLog(`Ręcznie zaktualizowano tłumaczenie dla kolumny "${column}".`, "info");
  };

  // Oznacz słówko jako poprawne (ręczne zatwierdzenie wszystkich kolumn)
  const forceApproveRow = (rowId: string) => {
    setRows(prev => prev.map(row => {
      if (row.id === rowId) {
        const correctedValues = { ...row.correctedValues };
        const isColumnCorrect: Record<string, boolean> = {};
        const userModified = { ...row.userModified };
        
        config.translationColumns.forEach(col => {
          correctedValues[col] = row.originalValues[col] || "";
          isColumnCorrect[col] = true;
          userModified[col] = true;
        });

        return {
          ...row,
          correctedValues,
          isColumnCorrect,
          userModified,
          status: 'correct'
        };
      }
      return row;
    }));
    addLog(`Ręcznie zatwierdzono wszystkie kolumny dla pozycji.`, "info");
  };

  // Obsługa generowania i pobierania pliku CSV
  const handleDownloadCsv = () => {
    if (rows.length === 0) return;

    try {
      const csvContent = stringifyCsv(
        headers,
        rows,
        config.delimiter,
        exportMode,
        config.translationColumns
      );

      // Dodaj BOM dla poprawnego kodowania UTF-8 w MS Excel
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      
      const filePrefix = exportMode === 'overwrite' ? "poprawione_" : "szczegoly_ai_";
      const cleanFileName = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
      
      link.setAttribute("href", url);
      link.setAttribute("download", `${filePrefix}${cleanFileName}`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      addLog(`Wygenerowano plik CSV i rozpoczęto pobieranie. Tryb: ${exportMode === 'overwrite' ? 'Zastąpienie oryginału' : 'Nowe kolumny z weryfikacją'}.`, "success");
    } catch (err: any) {
      alert(`Błąd tworzenia pliku CSV: ${err.message}`);
    }
  };

  return (
    <div id="app-container" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      
      {/* Top Navigation Bar in Slate-900 with shadow-md */}
      <header id="header" className="h-16 bg-slate-900 flex items-center justify-between px-6 sm:px-8 shadow-md shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
            <span className="text-white font-bold text-xl">L</span>
          </div>
          <div>
            <h1 className="text-white font-semibold text-lg sm:text-xl tracking-tight flex items-center gap-2">
              LexiCheck Pro <span className="text-slate-400 font-normal text-xs sm:text-sm hidden sm:inline ml-1">v2.4 — Batch Translator Validator</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex flex-col items-end hidden md:flex">
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">System API Status</span>
            <span className="text-emerald-400 text-xs sm:text-sm font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span> Connected (Gemini 3.5)
            </span>
          </div>
          {step !== 'upload' && (
            <button 
              onClick={handleReset}
              id="btn-reset" 
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-2 font-medium cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Resetuj dane
            </button>
          )}
        </div>
      </header>

      {/* Główna sekcja */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        
        <AnimatePresence mode="wait">
          
          {/* KROK 1: Wgrywanie / Wklejanie pliku */}
          {step === 'upload' && (
            <motion.div
              key="step-upload"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid lg:grid-cols-12 gap-6"
            >
              <div className="lg:col-span-8 flex flex-col gap-6">
                
                {/* Panel wgrania pliku - White card with Slate-200 borders and hover shadow */}
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 sm:p-12 text-center transition flex flex-col items-center justify-center gap-4 cursor-pointer relative overflow-hidden group hover:border-blue-400 hover:shadow-md"
                >
                  <input 
                    type="file" 
                    accept=".csv,.txt" 
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="p-4 bg-blue-50 border border-blue-100 rounded-full text-blue-600 transition group-hover:scale-105 duration-200">
                    <Upload className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-slate-800 mb-1">
                      Przeciągnij i upuść plik CSV
                    </h3>
                    <p className="text-sm text-slate-500 max-w-md mx-auto">
                      Wybierz plik z komputera lub upuść go tutaj. Obsługujemy pliki zakodowane w UTF-8 z separatorami (przecinek, średnik, tabulator).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full border border-slate-200 font-medium">
                      Auto-wykrywanie kodowania i separatora
                    </span>
                  </div>
                </div>

                {/* Pole tekstowe jako alternatywa - White card with Slate-200 borders */}
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                      Lub wklej zawartość CSV bezpośrednio tutaj
                    </label>
                    <div className="flex items-center gap-2 self-stretch sm:self-auto">
                      <label className="text-xs text-slate-500 font-medium">Separator:</label>
                      <select 
                        value={selectedDelimiter} 
                        onChange={(e) => setSelectedDelimiter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                      >
                        <option value="auto">Automatyczny</option>
                        <option value=",">Przecinek (,)</option>
                        <option value=";">Średnik (;)</option>
                        <option value="	">Tabulator (\t)</option>
                      </select>
                    </div>
                  </div>
                  <textarea
                    value={rawCsvText}
                    onChange={(e) => setRawCsvText(e.target.value)}
                    placeholder="Angielski;Polski&#10;a piece of cake;kawałek ciasta&#10;break a leg;złam nogę"
                    className="w-full h-44 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-700 focus:outline-none focus:border-blue-500 transition resize-none placeholder-slate-400 shadow-inner"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleProcessCsv(rawCsvText, "Wklejony_Tekst.csv")}
                      disabled={!rawCsvText.trim()}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
                    >
                      Dalej <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>

              {/* Prawy panel - Szybki start i porady */}
              <div className="lg:col-span-4 flex flex-col gap-6">
                
                {/* Sample dataset banner styled beautifully in gradient blue-50 */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-lg p-6 flex flex-col gap-4 shadow-sm">
                  <h3 className="font-display font-semibold text-slate-800 text-base flex items-center gap-2">
                    <Play className="w-4 h-4 text-blue-600" />
                    Chcesz przetestować?
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Nie masz pod ręką gotowego pliku CSV? Wczytaj nasz starannie przygotowany zestaw 18 popularnych wyrażeń i idiomów angielskich z typowymi błędami translatora. Zobaczysz na żywo, jak genialnie Gemini koryguje błędy!
                  </p>
                  <button
                    onClick={loadSampleData}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition duration-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Wczytaj przykładowy zestaw
                  </button>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                    Dlaczego warto weryfikować słówka?
                  </h4>
                  <ul className="text-xs text-slate-600 flex flex-col gap-3">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span><strong>Idiomy i Phrasal Verbs</strong> są tłumaczone dosłownie (np. <i>break a leg</i> jako <i>złam nogę</i> zamiast <i>powodzenia</i>).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span><strong>Wyrazy wieloznaczne (homonimy)</strong> gubią kontekst (np. słówko <i>spring</i> może oznaczać wiosnę, sprężynę lub źródło).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 font-bold mt-0.5">•</span>
                      <span><strong>Złe części mowy:</strong> Tłumacz Google często podaje czasownik zamiast rzeczownika w oderwaniu od kontekstu talii.</span>
                    </li>
                  </ul>
                </div>

              </div>
            </motion.div>
          )}

          {/* KROK 2: Mapowanie kolumn i opcje */}
          {step === 'mapping' && (
            <motion.div
              key="step-mapping"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="grid lg:grid-cols-12 gap-6"
            >
              <div className="lg:col-span-7 bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
                <div>
                  <h2 className="font-display font-bold text-lg text-slate-800 mb-1 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-blue-600" />
                    Konfiguracja mapowania pliku CSV
                  </h2>
                  <p className="text-xs text-slate-500">
                    Wskaż aplikacji, w której kolumnie znajdują się oryginalne słówka angielskie oraz wybierz kolumny z ich automatycznymi tłumaczeniami do jednoczesnej weryfikacji.
                  </p>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Kolumna oryginału */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-600">
                      Słówko oryginalne (Angielski)
                    </label>
                    <select
                      value={config.originalColumn}
                      onChange={(e) => {
                        const newOrig = e.target.value;
                        setConfig(prev => {
                          const filteredTrans = prev.translationColumns.filter(c => c !== newOrig);
                          return {
                            ...prev,
                            originalColumn: newOrig,
                            translationColumns: filteredTrans
                          };
                        });
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-sm animate-fade-in"
                    >
                      <option value="">-- Wybierz kolumnę --</option>
                      {headers.map((h, hIdx) => (
                        <option key={`${h}-${hIdx}`} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* Kolumny tłumaczeń (Wielokrotny wybór) */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-600">
                      Kolumny z tłumaczeniami (Wybierz wiele)
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto flex flex-col gap-2 shadow-inner">
                      {headers.filter(h => h !== config.originalColumn).map((h, hIdx) => {
                        const isChecked = config.translationColumns.includes(h);
                        return (
                          <label key={`${h}-${hIdx}`} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setConfig(prev => {
                                  const updated = checked
                                    ? [...prev.translationColumns, h]
                                    : prev.translationColumns.filter(c => c !== h);
                                  return { ...prev, translationColumns: updated };
                                });
                              }}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 accent-blue-600"
                            />
                            <span>{h}</span>
                          </label>
                        );
                      })}
                      {headers.filter(h => h !== config.originalColumn).length === 0 && (
                        <span className="text-xs text-slate-400 italic">Brak innych kolumn</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sekcja zaawansowanych parametrów języka i kontekstu */}
                <div className="border-t border-slate-100 pt-4 flex flex-col gap-4">
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-600">
                      Model AI
                    </label>
                    <select
                      value={config.model}
                      onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-sm"
                    >
                      <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                      <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Wymaga API Key)</option>
                      <option value="gemma-2-27b-it">Gemma 2 27B</option>
                      <option value="gemma-4-31b-it">Gemma 4 31B (Open Weights)</option>
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-600">
                      Kolumna z oryginałem (Angielski)
                    </label>
                    <select
                      value={config.originalColumn}
                      onChange={(e) => setConfig(prev => ({ ...prev, originalColumn: e.target.value }))}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-sm"
                    >
                      <option value="">-- Wybierz kolumnę --</option>
                      {headers.map((h, hIdx) => (
                        <option key={`${h}-${hIdx}`} value={h}>{h || `Kolumna ${hIdx + 1}`}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-600">
                      Kolumny do weryfikacji (Wybierz wiele)
                    </label>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 max-h-48 overflow-y-auto flex flex-col gap-2 shadow-inner">
                      {headers.map((h, hIdx) => {
                        if (h === config.originalColumn) return null;
                        const isChecked = config.translationColumns.includes(hIdx.toString());
                        return (
                          <label key={`${h}-${hIdx}`} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setConfig(prev => {
                                  const updated = checked
                                    ? [...prev.translationColumns, hIdx.toString()]
                                    : prev.translationColumns.filter(c => c !== hIdx.toString());
                                  return { ...prev, translationColumns: updated };
                                });
                              }}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 accent-blue-600"
                            />
                            <span>{h || `Kolumna ${hIdx + 1}`}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Wielkość paczki (batch size) */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-600">
                        Wielkość paczki (Batch Size)
                      </label>
                      <select
                        value={config.batchSize}
                        onChange={(e) => setConfig(prev => ({ ...prev, batchSize: Number(e.target.value) }))}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-sm"
                      >
                        <option value="10">10 słówek na zapytanie (Bezpieczne)</option>
                        <option value="20">20 słówek na zapytanie (Zalecane)</option>
                        <option value="35">35 słówek na zapytanie (Szybkie)</option>
                        <option value="50">50 słówek na zapytanie (Maksymalne)</option>
                      </select>
                    </div>

                    {/* Limit weryfikacji */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-bold text-slate-600">
                        Ile słówek chcesz zweryfikować?
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[15, 100, 500, "all"].map((val) => {
                          const isSelected = config.maxLimit === val;
                          const labelText = val === 'all' ? `Wszystkie (${rows.length})` : `${val} szt.`;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setConfig(prev => ({ ...prev, maxLimit: val as any }))}
                              className={`py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                                isSelected 
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm font-bold' 
                                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-700'
                              }`}
                            >
                              {labelText}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Własny klucz API */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      Twój klucz API (Opcjonalnie)
                    </label>
                    <input
                      type="password"
                      value={config.customApiKey}
                      onChange={(e) => setConfig(prev => ({ ...prev, customApiKey: e.target.value }))}
                      placeholder="Wpisz swój klucz API"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition shadow-inner placeholder-slate-400"
                    />
                  </div>

                  {/* Dodatkowy kontekst */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                      Dodatkowy kontekst lub instrukcja dla AI (Opcjonalnie)
                    </label>
                    <textarea
                      value={config.customContext}
                      onChange={(e) => setConfig(prev => ({ ...prev, customContext: e.target.value }))}
                      placeholder="np. 'Słownictwo z zakresu medycyny ratunkowej', 'Talia przygotowująca do egzaminu FCE', 'Slang młodzieżowy z USA'"
                      className="w-full h-18 bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 transition resize-none placeholder-slate-400 shadow-inner"
                    />
                  </div>

                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setStep('upload')}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold rounded-xl text-slate-600 transition cursor-pointer"
                  >
                    Wróć
                  </button>
                  <button
                    onClick={confirmMapping}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    Zatwierdź i przejdź do weryfikacji <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>

              {/* Prawa kolumna: Podgląd danych */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="font-display font-semibold text-slate-800 text-sm">
                      Podgląd pierwszych 3 wierszy
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      Suma: {rows.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-3">
                    {rows.slice(0, 3).map((row, idx) => (
                      <div key={row.id} className="bg-slate-50/50 rounded-xl p-3 border border-slate-200/60 flex flex-col gap-1 text-xs">
                        <div className="text-slate-400 font-mono text-[10px]">Wiersz #{idx + 1}</div>
                        <div className="flex flex-col gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-bold">Oryginalna kolumna ({config.originalColumn || "A"}):</span>
                            <span className="text-slate-800 font-medium">{row.originalValues[config.originalColumn] || "—"}</span>
                          </div>
                          <div className="border-t border-slate-200/50 pt-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-500 block uppercase tracking-wider font-bold">Wybrane tłumaczenia do weryfikacji:</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {config.translationColumns.map(col => (
                                <span key={col} className="bg-blue-50/50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5 text-[10px]">
                                  <strong>{col}:</strong> {row.originalValues[col] || "—"}
                                </span>
                              ))}
                              {config.translationColumns.length === 0 && (
                                <span className="text-xs text-slate-400 italic">Brak wybranych kolumn</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col gap-2.5">
                    <h4 className="text-xs font-bold text-slate-700">Wykryta struktura:</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {headers.map((h, hIdx) => {
                        const isOrig = h === config.originalColumn;
                        const isTrans = config.translationColumns.includes(h);
                        let badgeClass = "bg-slate-100 text-slate-500 border-slate-200";
                        if (isOrig) badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-200";
                        if (isTrans) badgeClass = "bg-blue-50 text-blue-700 border-blue-200";
                        return (
                          <span key={`${h}-${hIdx}`} className={`text-[10px] px-2.5 py-1 rounded-lg border font-mono font-medium ${badgeClass}`}>
                            {h} {isOrig && " (Ang)"} {isTrans && " (Tłum)"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* KROK 3: Główny dashboard i weryfikacja */}
          {step === 'verifying' && (
            <motion.div
              key="step-verifying"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="flex flex-col gap-6"
            >
              {/* Sekcja górna: Statystyki i Kontrola */}
              <div className="grid lg:grid-cols-12 gap-6">
                
                {/* Panel kontrolny AI */}
                <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col gap-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="font-display font-bold text-lg text-slate-800 mb-1">
                        Proces weryfikacji słowników
                      </h2>
                      <p className="text-xs text-slate-500">
                        Weryfikacja słówek z pliku <strong className="text-slate-700">{fileName}</strong> za pomocą Gemini AI.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isVerifying ? (
                        <button
                          onClick={startVerificationLoop}
                          id="btn-start"
                          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition duration-150 shadow-sm cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Rozpocznij weryfikację
                        </button>
                      ) : (
                        <button
                          onClick={pauseVerification}
                          id="btn-pause"
                          className="flex items-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition duration-150 shadow-sm cursor-pointer"
                        >
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          Wstrzymaj proces
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Klocki statystyk */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center shadow-sm">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Zaplanowane</div>
                      <div className="text-lg font-bold text-slate-800 mt-1">{stats.total}</div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center shadow-sm">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Oczekujące</div>
                      <div className="text-lg font-bold text-slate-600 mt-1">{stats.pending}</div>
                    </div>
                    <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-center shadow-sm">
                      <div className="text-[10px] text-emerald-600 uppercase tracking-wider font-bold">Poprawne</div>
                      <div className="text-lg font-bold text-emerald-600 mt-1">{stats.correct}</div>
                    </div>
                    <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 text-center shadow-sm">
                      <div className="text-[10px] text-red-500 uppercase tracking-wider font-bold">Błędne (AI)</div>
                      <div className="text-lg font-bold text-red-600 mt-1">{stats.incorrect}</div>
                    </div>
                    <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-center shadow-sm col-span-2 sm:col-span-1">
                      <div className="text-[10px] text-rose-500 uppercase tracking-wider font-bold">Błędy API</div>
                      <div className="text-lg font-bold text-rose-600 mt-1">{stats.failed}</div>
                    </div>
                  </div>

                  {/* Pasek postępu */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Całkowity postęp:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {stats.total > 0 ? Math.round(((stats.total - stats.pending) / stats.total) * 100) : 0}% 
                        <span className="text-slate-400 font-normal"> ({stats.total - stats.pending}/{stats.total})</span>
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 ease-out"
                        style={{ width: `${stats.total > 0 ? ((stats.total - stats.pending) / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Panel pobierania / eksportu pliku */}
                <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col justify-between gap-5">
                  <div className="flex flex-col gap-3">
                    <h3 className="font-display font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-blue-600" />
                      Eksport poprawionego CSV
                    </h3>
                    
                    <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tryb generowania:</label>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
                          <input 
                            type="radio" 
                            name="exportMode" 
                            checked={exportMode === 'overwrite'} 
                            onChange={() => setExportMode('overwrite')}
                            className="mt-0.5 accent-blue-600 h-3.5 w-3.5"
                          />
                          <div>
                            <span className="text-slate-800 block font-semibold">Zastąp oryginalne tłumaczenia</span>
                            <span className="text-[10px] text-slate-500 block leading-tight">Zastępuje wybrane kolumny ({config.translationColumns.join(", ")}) skorygowanymi wartościami. Idealne pod Anki.</span>
                          </div>
                        </label>
                        <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer border-t border-slate-250/30 pt-2 mt-1">
                          <input 
                            type="radio" 
                            name="exportMode" 
                            checked={exportMode === 'add_columns'} 
                            onChange={() => setExportMode('add_columns')}
                            className="mt-0.5 accent-blue-600 h-3.5 w-3.5"
                          />
                          <div>
                            <span className="text-slate-800 block font-semibold">Dodaj nowe kolumny ze szczegółami</span>
                            <span className="text-[10px] text-slate-500 block leading-tight">Pozostawia pierwotny plik i dokleja nowe kolumny z przedrostkiem 'Poprawione_' dla wybranego słownictwa.</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadCsv}
                    disabled={rows.filter(r => r.status === 'correct' || r.status === 'incorrect').length === 0}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 disabled:text-slate-450 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition duration-200 shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Pobierz poprawiony plik CSV
                  </button>
                </div>

              </div>

              {/* Sekcja logów z weryfikacji */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Konsola przebiegu weryfikacji (LOGI)
                  </h4>
                  {isVerifying && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                  )}
                </div>
                <div className="h-28 bg-slate-900 rounded-xl p-3 font-mono text-[11px] text-slate-300 overflow-y-auto flex flex-col gap-1 shadow-inner border border-slate-950">
                  {logs.length === 0 ? (
                    <span className="text-slate-500 italic">Oczekiwanie na uruchomienie weryfikacji... Kliknij "Rozpocznij weryfikację" powyżej.</span>
                  ) : (
                    logs.map((log, i) => {
                      let textClass = "text-slate-300";
                      if (log.type === 'success') textClass = "text-emerald-400";
                      if (log.type === 'warn') textClass = "text-amber-400";
                      if (log.type === 'error') textClass = "text-red-400";
                      return (
                        <div key={i} className="flex items-start gap-1.5 leading-relaxed">
                          <span className="text-slate-500 font-sans">[{log.time}]</span>
                          <span className={textClass}>{log.text}</span>
                        </div>
                      );
                    })
                  )}
                  <div ref={logsEndRef} />
                </div>
              </div>

              {/* Tabela interaktywna wyników */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
                
                {/* Wyszukiwanie, filtry */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  
                  {/* Zakładki filtrów */}
                  <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-full md:w-auto">
                    {[
                      { key: 'all', label: `Wszystkie (${filteredRows.length})` },
                      { key: 'correct', label: `Poprawne (${rows.filter(r => r.status === 'correct').length})` },
                      { key: 'incorrect', label: `Wymagają poprawy (${rows.filter(r => r.status === 'incorrect').length})` },
                      { key: 'pending', label: `Oczekujące (${rows.filter(r => r.status === 'pending' || r.status === 'verifying').length})` },
                      { key: 'failed', label: `Błędy API (${rows.filter(r => r.status === 'failed').length})` }
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setStatusFilter(tab.key as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          statusFilter === tab.key
                            ? 'bg-white text-slate-800 shadow-sm font-bold border border-slate-200/50'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Wyszukiwarka */}
                  <div className="relative w-full md:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Szukaj po słowie lub tłumaczeniu..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition shadow-inner"
                    />
                  </div>

                </div>

                {/* Tabela słówek */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                        <th className="py-3 px-4 w-12 text-center">LP.</th>
                        <th className="py-3 px-4 w-52">Słowo oryginalne (EN)</th>
                        <th className="py-3 px-4 w-28 text-center">Status AI</th>
                        {config.translationColumns.map(col => (
                          <th key={col} className="py-3 px-4 min-w-[200px]">Tłumaczenie: {col}</th>
                        ))}
                        <th className="py-3 px-4 w-24 text-center">Ręczne</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-slate-100">
                      {paginatedRows.length === 0 ? (
                        <tr>
                          <td colSpan={4 + config.translationColumns.length} className="py-12 text-center text-slate-450 italic bg-white">
                            {searchTerm ? "Brak słówek pasujących do kryteriów wyszukiwania." : "Brak słówek do wyświetlenia."}
                          </td>
                        </tr>
                      ) : (
                        paginatedRows.map((row, index) => {
                          const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                          
                          // Detekcja wyglądu statusu
                          let statusBadge = null;
                          if (row.status === 'pending') {
                            statusBadge = <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">Oczekuje</span>;
                          } else if (row.status === 'verifying') {
                            statusBadge = <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full animate-pulse"><RefreshCw className="w-2.5 h-2.5 animate-spin" /> Analiza</span>;
                          } else if (row.status === 'correct') {
                            statusBadge = <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full"><CheckCircle className="w-2.5 h-2.5" /> OK</span>;
                          } else if (row.status === 'incorrect') {
                            statusBadge = <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full"><AlertTriangle className="w-2.5 h-2.5" /> Błąd</span>;
                          } else if (row.status === 'failed') {
                            statusBadge = <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full">Błąd API</span>;
                          }

                          return (
                            <tr key={row.id} className="hover:bg-slate-50/70 group transition text-slate-700">
                              
                              {/* Indeks */}
                              <td className="py-3 px-4 font-mono text-slate-400 text-center">{globalIndex}</td>
                              
                              {/* Słowo oryginalne */}
                              <td className="py-3 px-4 font-semibold text-slate-800">
                                <div>{row.originalWord}</div>
                                {row.status === 'failed' && (
                                  <div className="text-[10px] text-red-500 font-mono mt-1">{row.errorMessage || "Błąd komunikacji z API."}</div>
                                )}
                              </td>
                              
                              {/* Status */}
                              <td className="py-3 px-4 text-center">{statusBadge}</td>
                              
                              {/* Dynamiczne kolumny tłumaczeń */}
                              {config.translationColumns.map(col => {
                                const origVal = row.originalValues[col] || "";
                                const isCorrect = row.isColumnCorrect?.[col] !== false;
                                const correctedVal = row.correctedValues?.[col] ?? origVal;
                                const isEditing = editingCell?.rowId === row.id && editingCell?.column === col;

                                return (
                                  <td key={col} className="py-3 px-4">
                                    {row.status === 'pending' || row.status === 'verifying' ? (
                                      <div className="text-slate-500 italic">{origVal || "—"}</div>
                                    ) : isEditing ? (
                                      <div className="flex items-center gap-1.5">
                                        <input
                                          type="text"
                                          value={editingValue}
                                          onChange={(e) => setEditingValue(e.target.value)}
                                          className="bg-white border-2 border-blue-500 text-slate-800 rounded px-2 py-1 text-xs focus:outline-none w-full font-medium"
                                          autoFocus
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveInlineEdit(row.id, col);
                                            if (e.key === 'Escape') setEditingCell(null);
                                          }}
                                        />
                                        <button 
                                          onClick={() => saveInlineEdit(row.id, col)}
                                          className="p-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded cursor-pointer flex-shrink-0"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={() => setEditingCell(null)}
                                          className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded cursor-pointer flex-shrink-0"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between gap-2 group/cell">
                                        <div>
                                          {!isCorrect ? (
                                            <div className="flex flex-col gap-0.5">
                                              <span className="text-red-400 line-through text-[11px]">{origVal || "—"}</span>
                                              <span className="text-blue-600 font-semibold text-xs flex items-center gap-1">
                                                {correctedVal}
                                                {row.userModified?.[col] && <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-100 rounded px-1 py-0 font-normal">Edytowano</span>}
                                              </span>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-1">
                                              <span className="text-emerald-600 font-semibold text-xs">{correctedVal || "—"}</span>
                                              {row.userModified?.[col] && <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-100 rounded px-1 py-0 font-normal">Edytowano</span>}
                                            </div>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => startEditing(row.id, col, correctedVal)}
                                          className="opacity-0 group-hover/cell:opacity-100 p-1 hover:bg-slate-100 rounded text-slate-450 hover:text-slate-700 transition cursor-pointer flex-shrink-0"
                                          title="Edytuj to słówko"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                );
                              })}

                              {/* Ręczna korekta */}
                              <td className="py-3 px-4 text-center">
                                {row.status === 'incorrect' && (
                                  <button
                                    onClick={() => forceApproveRow(row.id)}
                                    className="px-2 py-1 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 text-[10px] font-semibold rounded text-slate-600 cursor-pointer transition shadow-sm"
                                    title="Zatwierdź oryginalne wersje dla wszystkich języków"
                                  >
                                    Zatwierdź
                                  </button>
                                )}
                                {row.status === 'correct' && (
                                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">OK</span>
                                )}
                              </td>

                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Stopka tabeli / Paginacja */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                  <div className="text-xs text-slate-500 font-medium">
                    Pokazano <span className="text-slate-800 font-semibold">{Math.min(filteredRows.length, itemsPerPage)}</span> z <span className="text-slate-800 font-semibold">{filteredRows.length}</span> pozycji
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-slate-600 cursor-pointer transition shadow-sm"
                    >
                      Poprzednia
                    </button>
                    <span className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-mono font-medium">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-xs font-semibold text-slate-600 cursor-pointer transition shadow-sm"
                    >
                      Następna
                    </button>
                  </div>
                </div>

              </div>

              {/* Instrukcja importu do Anki */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col gap-4">
                <h3 className="font-display font-semibold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Instrukcja: Jak zaimportować poprawione słówka z powrotem do Anki?
                </h3>
                <div className="grid sm:grid-cols-3 gap-4 text-xs text-slate-500 leading-relaxed">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2">
                    <div className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-xs">1</div>
                    <p className="font-bold text-slate-800">Wygeneruj i pobierz CSV</p>
                    <p>Wybierz tryb eksportu <b>"Zastąp"</b> (będzie to bezpośrednio gotowy plik z poprawionymi tłumaczeniami), a następnie kliknij przycisk pobierania.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2">
                    <div className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-xs">2</div>
                    <p className="font-bold text-slate-800">Importuj w Anki</p>
                    <p>Uruchom Anki na komputerze. Wybierz <b>Plik → Importuj...</b> (skrót Ctrl+Shift+I) i wskaż pobrany od nas plik CSV.</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col gap-2">
                    <div className="h-6 w-6 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold font-mono text-xs">3</div>
                    <p className="font-bold text-slate-800">Dopasuj pola w talii</p>
                    <p>Upewnij się, że separator jest zgodny i przyporządkuj pierwszą kolumnę jako <b>Front (Pytanie)</b>, a drugą kolumnę z tłumaczeniem jako <b>Back (Odpowiedź)</b>.</p>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

        </AnimatePresence>

      </main>

      {/* Global Progress Overlay at the very bottom */}
      <footer className="bg-white border-t border-slate-200 h-11 px-6 sm:px-8 flex items-center justify-between text-[10px] text-slate-400 font-medium tracking-wide shrink-0">
        <div className="flex gap-4 sm:gap-6 uppercase tracking-wider font-semibold text-slate-400">
          <span>CSV Source: {fileName || "brak pliku"}</span>
          <span>Target: {config.targetLanguage || "brak"}</span>
          <span>Encoding: UTF-8</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="hidden sm:inline text-slate-400 font-semibold">Estimated time remaining: --</span>
          <span className="text-blue-600 font-bold uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded border border-blue-100">V2.4 Stable Build</span>
        </div>
      </footer>

    </div>
  );
}
