export interface CsvRow {
  id: string; // Unikalne ID wygenerowane na potrzeby aplikacji
  originalValues: Record<string, string>; // Wszystkie oryginalne kolumny jako klucz-wartość
  originalWord: string; // Wyodrębnione oryginalne słówko angielskie
  
  // Stan weryfikacji przez AI
  status: 'pending' | 'verifying' | 'correct' | 'incorrect' | 'failed';
  errorMessage?: string;
  
  // Słownik poprawionych wartości wygenerowanych przez AI (klucz: nazwa kolumny, wartość: poprawione słówko)
  correctedValues?: Record<string, string>;
  
  // Słownik poprawności kolumn (klucz: nazwa kolumny, wartość: true jeśli oryginalne tłumaczenie było poprawne)
  isColumnCorrect?: Record<string, boolean>;
  
  // Słownik ręcznych modyfikacji użytkownika (klucz: nazwa kolumny, wartość: true)
  userModified?: Record<string, boolean>;
}

export interface VerificationStats {
  total: number;
  pending: number;
  verifying: number;
  correct: number;
  incorrect: number;
  failed: number;
}

export interface AppConfig {
  originalColumn: string;
  translationColumns: string[]; // Wybrane kolumny z tłumaczeniami
  delimiter: string;
  customContext: string;
  batchSize: number;
  maxLimit: number | 'all';
  model: string;
  customApiKey?: string;
}

