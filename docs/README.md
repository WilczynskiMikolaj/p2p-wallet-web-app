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
- Dostęp do istniejącego projektu Supabase: URL projektu i publiczny klucz anon/publishable.

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