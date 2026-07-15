import { CsvRow } from "../types";

export const SAMPLE_HEADERS = ["Angielski (Oryginał)", "Tłumaczenie (Google Translate)", "Temat", "Notatki"];

export const SAMPLE_ROWS_DATA = [
  {
    "Angielski (Oryginał)": "a piece of cake",
    "Tłumaczenie (Google Translate)": "kawałek ciasta",
    "Temat": "Idiomy",
    "Notatki": "Bardzo proste zadanie"
  },
  {
    "Angielski (Oryginał)": "break a leg",
    "Tłumaczenie (Google Translate)": "złam nogę",
    "Temat": "Idiomy",
    "Notatki": "Życzenie powodzenia przed wystąpieniem"
  },
  {
    "Angielski (Oryginał)": "I have a spring in my step",
    "Tłumaczenie (Google Translate)": "Mam sprężynę w moim kroku",
    "Temat": "Wyrażenia potoczne",
    "Notatki": "Iść wesołym, energicznym krokiem"
  },
  {
    "Angielski (Oryginał)": "once in a blue moon",
    "Tłumaczenie (Google Translate)": "raz na niebieskim księżycu",
    "Temat": "Idiomy",
    "Notatki": "Coś co zdarza się niezmiernie rzadko"
  },
  {
    "Angielski (Oryginał)": "I am feeling under the weather",
    "Tłumaczenie (Google Translate)": "Czuję się pod pogodą",
    "Temat": "Samopoczucie",
    "Notatki": "Kiepskie samopoczucie, przeziębienie"
  },
  {
    "Angielski (Oryginał)": "it is raining cats and dogs",
    "Tłumaczenie (Google Translate)": "pada kotami i psami",
    "Temat": "Pogoda",
    "Notatki": "Bardzo mocna ulewa"
  },
  {
    "Angielski (Oryginał)": "let's face the music",
    "Tłumaczenie (Google Translate)": "stańmy twarzą w twarz z muzyką",
    "Temat": "Wyrażenia potoczne",
    "Notatki": "Stawić czoła konsekwencjom"
  },
  {
    "Angielski (Oryginał)": "spill the beans",
    "Tłumaczenie (Google Translate)": "rozlej fasolę",
    "Temat": "Wyrażenia potoczne",
    "Notatki": "Wyjawić sekret, puścić farbę"
  },
  {
    "Angielski (Oryginał)": "kick the bucket",
    "Tłumaczenie (Google Translate)": "kopnąć wiadro",
    "Temat": "Slang / Eufemizmy",
    "Notatki": "Umrzeć, wykończyć się"
  },
  {
    "Angielski (Oryginał)": "cost an arm and a leg",
    "Tłumaczenie (Google Translate)": "kosztować ramię i nogę",
    "Temat": "Zakupy",
    "Notatki": "Być niezwykle drogim"
  },
  {
    "Angielski (Oryginał)": "give a cold shoulder",
    "Tłumaczenie (Google Translate)": "dać zimne ramię",
    "Temat": "Relacje",
    "Notatki": "Ignorować kogoś, traktować chłodno"
  },
  {
    "Angielski (Oryginał)": "kill two birds with one stone",
    "Tłumaczenie (Google Translate)": "zabić dwa ptaki jednym kamieniem",
    "Temat": "Wyrażenia potoczne",
    "Notatki": "Załatwić dwie sprawy za jednym zamachem"
  },
  {
    "Angielski (Oryginał)": "barking up the wrong tree",
    "Tłumaczenie (Google Translate)": "szczekać na złe drzewo",
    "Temat": "Wyrażenia potoczne",
    "Notatki": "Błędnie kogoś oskarżać lub szukać rozwiązania w złym miejscu"
  },
  {
    "Angielski (Oryginał)": "bite the bullet",
    "Tłumaczenie (Google Translate)": "ugryźć kulę",
    "Temat": "Nastawienie",
    "Notatki": "Zacisnąć zęby i zrobić coś trudnego ale koniecznego"
  },
  {
    "Angielski (Oryginał)": "sit on the fence",
    "Tłumaczenie (Google Translate)": "siedzieć na płocie",
    "Temat": "Decyzje",
    "Notatki": "Być niezdecydowanym, wstrzymać się od wyboru strony"
  },
  {
    "Angielski (Oryginał)": "hit the sack",
    "Tłumaczenie (Google Translate)": "uderzyć w worek",
    "Temat": "Sen",
    "Notatki": "Pójść spać"
  },
  {
    "Angielski (Oryginał)": "run-of-the-mill",
    "Tłumaczenie (Google Translate)": "bieg młyna",
    "Temat": "Opis",
    "Notatki": "Zwyczajny, przeciętny, szablonowy"
  },
  {
    "Angielski (Oryginał)": "see eye to eye",
    "Tłumaczenie (Google Translate)": "widzieć oko w oko",
    "Temat": "Relacje",
    "Notatki": "Zgadzać się w pełni z kimś"
  }
];

export function getSampleRows(): CsvRow[] {
  return SAMPLE_ROWS_DATA.map((row, index) => ({
    id: `sample-${index}`,
    originalValues: row,
    originalWord: row["Angielski (Oryginał)"],
    translatedWord: row["Tłumaczenie (Google Translate)"],
    status: "pending"
  }));
}
