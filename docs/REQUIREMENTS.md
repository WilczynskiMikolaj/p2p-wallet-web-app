## 1. Cel aplikacji i zakres
**P2P Wallet Web:** jest aplikacją webową do szybkich rozliczeń między osobami. Użytkownik może utworzyć portfel, zobaczyć saldo, wysłać przelew, wygenerować prośbę o płatność w postaci linku i kodu QR oraz przeglądać historię.

## 2. Role i możliwości użytkowników
| Rola | Co może? | Czego nie może? |
|---|---|---|
| **Gość** | Otworzyć stronę główną, zapoznać się z regulaminem, przejść do logowania i rejestracji. | Odczytywać saldo, historię, szczegóły cudzych kont ani wykonywać przelewy. |
| **Użytkownik** | Zarządzać swoim profilem, przeglądać saldo i historię, zlecać przelewy, tworzyć i realizować prośby o płatność, generować QR i linki. | Zmieniać salda bez przelewu, odczytywać dane cudzych portfeli, modyfikować księgi transakcji, przyznawać sobie rolę administratora. |
| **Administrator** | Wyświetlać listę kont i ich statusy, blokować/odblokowywać portfele, przyznawać środki **testowe**, przeglądać zdarzenia audytowe. | Odczytywać hasła i tokeny, wykonywać przelewy jako inny użytkownik, usuwać lub edytować zakończone operacje księgowe. |

## 3. Wymagania funkcjonalne
| Wymaganie funkcjonalne | Sposób realizacji |
|---|---|
| Rejestracja, logowanie, wylogowanie i przywracanie sesji | Użytkownik loguje się, a niezalogowany nie otworzy chronionych widoków. |
| Dwie role: user i admin | Uprawnienia i widoki są zgodne z rolą; próba użycia operacji admina jako user kończy się odmową. |
| Przegląd stanu własnego portfela | Po zalogowaniu wyświetla się aktualne saldo pobrane z backendu. |
| Przelew P2P do wskazanego użytkownika | Backend wykonuje przelew lub zwraca przyczynę odrzucenia. |
| Historia transakcji | Użytkownik widzi tylko własne przelewy z kwotą, kierunkiem, czasem i statusem. |
| Utworzenie prośby o płatność | Użytkownik podaje kwotę i otrzymuje link oraz kod QR do prośby. |
| Realizacja prośby z QR/linku | Po otwarciu linku zalogowany płatnik widzi odbiorcę i kwotę, a przelew następuje dopiero po potwierdzeniu. |
| Zarządzanie statusem prośby o płatność | Prośba ma stan pending, paid, expired lub cancelled; ponowna realizacja tej samej prośby jest odrzucana. |
| Panel administratora | Administrator może zablokować konto/portfel i nadać mu środki testowe; akcje są audytowane. |
| Obsługa walidacji i błędów | Formularze pokazują błędy, a nieudany przelew nie zmienia sald ani księgi. |
| Aktualizacja salda i statusu prośby bez przeładowania | Zmiany pojawiają się na bieżąco.|
| Płatności przez krótkie kody jednorazowe | Kod wygasa, jest ograniczony liczbą prób i wymaga zatwierdzenia przez płatnika. |


## 4. Wymagania bezpieczeństwa
- **Uwierzytelnianie i ochrona sesji**
- **Kontrola ról i uprawnień**
- **Ochrona danych innych użytkowników**
- **Integralność przelewów i sald**
- **Ochrona przed ponownym wykonaniem przelewu**
- **Bezpieczne kody QR i linki**
- **Walidacja danych wejściowych**
- **Ochrona przed nadmierną liczbą żądań**
- **Ochrona aplikacji webowej przed XSS i CSRF**
- **Ochrona sekretów i komunikacji**
- **Rejestrowanie zdarzeń bezpieczeństwa**
