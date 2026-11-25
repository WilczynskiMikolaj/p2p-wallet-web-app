## Informacje o projekcie
- Nazwa projektu: **P2P Wallet Web**
- Członkowie zespołu: **Mikołaj Wilczyński**
- Wybrany język: **frontend React + Vite oraz Supabase**

## Krótki opis
P2P Wallet Web to aplikacja internetowa umożliwiająca szybkie przesyłanie wirtualnych środków pomiędzy użytkownikami.

- **Jaki problem rozwiązuje aplikacja?** Uproszcza rozliczanie wspólnych wydatków: zamiast ręcznie wpisywać dane odbiorcy, można skorzystać z prośby o płatność udostępnionej linkiem lub kodem QR.
- **Kto będzie z niej korzystał?** Osoby rozliczające drobne wydatki ze znajomymi, np. za jedzenie.
- **Dlaczego aplikacja jest potrzebna?** Pozwala wygodnie inicjować i śledzić rozliczenia w jednym miejscu.
- **Jaką podstawową czynność umożliwia?** Wysłanie przelewu P2P do innego użytkownika. Dodatkowo użytkownik może sprawdzić saldo i historię oraz wygenerować albo zrealizować prośbę o płatność przez QR lub link.


## Wymagania środowiskowe
- Node.js 22.12 lub nowszy z linii 22, albo Node.js 24.
- npm, instalowany razem z Node.js.
- Przeglądarka internetowa, np. Firefox, Chrome lub Edge.
- Do korzystania z kont i portfeli potrzebne są URL istniejącego projektu Supabase i jego publiczny klucz anon lub publishable. Do uruchomienia samych testów wystarczą Node.js, npm i zwykłe konto systemowe.

## Instalacja

1. Pobierz i rozpakuj projekt lub sklonuj jego repozytorium.
2. Otwórz terminal w katalogu projektu, w którym znajduje się `package.json`.
3. Zainstaluj zależności:

```bash
npm ci
```

## Uruchomienie aplikacji

Uruchom serwer developerski:

```bash
npm run dev
```

Domyślny adres aplikacji:

**http://localhost:5173**

## Podstawowe adresy
| Adres | Opis |
| --- | --- |
| `http://localhost:5173/` | Strona główna |
| `http://localhost:5173/login` | Logowanie |
| `http://localhost:5173/register` | Rejestracja |
| `http://localhost:5173/app` | Panel dostępny po zalogowaniu |
| `http://localhost:5173/app/profile` | Profil użytkownika |
| `http://localhost:5173/health` | Endpoint stanu serwera Vite |


## Przykładowe żądania

Uruchom aplikację przed wykonaniem poniższych przykładów. Jeśli Vite używa innego portu, zmień adres w żądaniach.

### Przeglądarka

Otwórz:

```text
http://localhost:5173/health
```

Przeglądarka wykona żądanie `GET` i wyświetli JSON.

### curl — sprawdzenie stanu

```bash
curl -i http://localhost:5173/health
```

Przykładowe istotne elementy odpowiedzi:

```
HTTP/1.1 200 OK
Vary: Origin
Content-Type: application/json; charset=utf-8
Cache-Control: no-store
Date: Thu, 12 Nov 2026 00:36:20 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 46

{"status":"ok","application":"P2P Wallet Web"}
```

## Testy

Projekt korzysta z **Vitest**. Test interfejsu używa React Testing Library i jsdom, a testy bazy korzystają z PostgreSQL 17.

By uruchommić testy należy wykonać komendę:

```bash
npm test
```

| Katalog | Liczba | Co sprawdza |
|---|---:|---|
| `tests/unit/` | 8 | Kwoty w groszach, granica precyzji, format PLN, odbiorca i tytuł. |
| `tests/integration/` | 5 | Księgowanie i kierunki historii, wycofanie operacji po błędzie księgi, równoczesne ponowienie, dwa zlecenia konkurujące o saldo oraz potwierdzenie w React po utracie odpowiedzi. |
| `tests/security/` | 2 | Izolacja sald i historii przez RLS oraz odmowa wywołania przelewu przez gościa i bezpośrednich zmian przez użytkownika. |
| `tests/endpoint/` | 1 | Rzeczywiste lokalne żądanie HTTP do `GET /health` obsługiwane przez konfigurację Vite projektu. Sprawdza status, nagłówki i treść JSON. |
| `tests/stage1/` | 4 | Zachowane testy przekierowań, roli i rejestracji. |

Testy korzystają z adresu pętli zwrotnej, losowych portów i tymczasowego katalogu systemowego. Po zakończeniu klaster jest zatrzymywany, a pliki bazy usuwane.
