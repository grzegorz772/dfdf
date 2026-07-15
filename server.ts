import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Initialize Gemini client lazily to prevent crashing on boot if key is temporarily missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (aiClient) return aiClient;
  
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Klucz GEMINI_API_KEY nie został znaleziony. Skonfiguruj go w panelu Settings > Secrets w AI Studio.");
  }
  
  aiClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
  
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", hasApiKey: !!process.env.GEMINI_API_KEY });
});

// Translation batch verification endpoint
app.post("/api/verify-batch", async (req, res) => {
  try {
    const { items, columns = [], context = "", model = "gemini-3.5-flash" } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Brak danych lub niepoprawny format (oczekiwano tablicy 'items')." });
      return;
    }

    let ai;
    try {
      ai = getGeminiClient();
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Błąd konfiguracji klucza API." });
      return;
    }

    const prompt = `Jesteś zaawansowanym wielojęzycznym systemem weryfikacji i korekty słownictwa.
Twoim zadaniem jest ocena i korekta tłumaczeń słówek lub fraz z języka angielskiego (English) na wybrane języki docelowe, reprezentowane przez nazwy kolumn: ${JSON.stringify(columns)}.

Dla każdego słówka otrzymujesz oryginalne słowo w języku angielskim (original) oraz dotychczasowe automatyczne tłumaczenia (translations) w poszczególnych kolumnach docelowych.
Dzięki temu, że widzisz tłumaczenia we wszystkich językach na raz, zyskujesz lepszy kontekst semantyczny (zazwyczaj większość tłumaczeń określa jedno poprawne znaczenie słowa, a jedno lub dwa mogą być błędnymi kalkami lub homonimami o złym znaczeniu).

Zasady:
1. Przeanalizuj słowo oryginalne w zestawieniu ze wszystkimi podanymi tłumaczeniami docelowymi.
2. Dla każdej kolumny (języka):
   - Jeśli aktualne tłumaczenie w tej kolumnie jest poprawne, naturalne i pasuje do głównego, zamierzonego znaczenia słowa oryginalnego (widocznego z kontekstu pozostałych poprawnych tłumaczeń), pozostaw je bez zmian.
   - Jeśli tłumaczenie jest niepoprawne, sztuczne, zbyt dosłowne (np. błędna kalka językowa) lub odnosi się do niewłaściwego znaczenia wyrazu wieloznacznego, popraw je i wpisz ulepszone, poprawne i powszechne tłumaczenie w tym języku docelowym.
3. NIE podawaj żadnych wyjaśnień, komentarzy ani alternatyw. Zwróć tylko i wyłącznie poprawione słowo dla każdej kolumny w strukturze wyjściowej.

${context ? `DODATKOWY KONTEKST OD UŻYTKOWNIKA (weź go pod uwagę przy ocenie i korekcie): "${context}".` : ""}

Oto lista słówek do zweryfikowania:
${JSON.stringify(items.map(it => ({ id: it.id, original: it.original, translations: it.translations })), null, 2)}
`;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "Lista zweryfikowanych wierszy z poprawkami dla poszczególnych kolumn językowych",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "ID wiersza" },
              corrections: {
                type: Type.ARRAY,
                description: "Lista poprawek dla poszczególnych kolumn językowych",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    column: { type: Type.STRING, description: "Nazwa kolumny (np. pl, fr, es)" },
                    corrected: { type: Type.STRING, description: "Skorygowane lub niezmienione (jeśli poprawne) tłumaczenie w tym języku" }
                  },
                  required: ["column", "corrected"]
                }
              }
            },
            required: ["id", "corrections"]
          }
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Model Gemini nie zwrócił żadnego tekstu.");
    }

    const verifiedItems = JSON.parse(responseText.trim());
    res.json({ results: verifiedItems });

  } catch (error: any) {
    console.error("Błąd podczas weryfikacji paczki słówek:", error);
    res.status(500).json({ 
      error: "Wystąpił błąd podczas komunikacji z Gemini API.", 
      details: error.message || String(error)
    });
  }
});

// Setup Vite or production static file serving
async function setupViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in DEVELOPMENT mode, mounting Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in PRODUCTION mode, serving built assets from dist/...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Serwer działa poprawnie pod adresem http://0.0.0.0:${PORT}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error("Nie udało się uruchomić serwera Express:", err);
  process.exit(1);
});
