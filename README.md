# TETHER

App móvil + reloj (simulador) que se sincronizan en vivo.

Cumple:
- Reloj con UI compacta (contenido dentro del círculo, sin desbordes)
- Social: presencia, check-in Llegué/Salí, votación rápida, encuentro
- Económico: USD/MXN + S&P + IPC (datos demo en vivo)

## Qué hacer para correrla

1. Abre una terminal en esta carpeta:
   `C:\Users\usuario 1\Documents\EXAMEN_AURELIO`
2. Instala dependencias (si hace falta):
   `npm install`
3. Arranca Expo:
   `npx expo start`
4. Opciones:
   - Escanea el QR con **Expo Go** en tu celular (Android/iPhone)
   - O pulsa `w` para abrir en el navegador

## Cómo demostrar (90 segundos)

1. Deja el modo **Dual** (móvil arriba, reloj abajo).
2. En **Voto** (móvil): publica una votación → el reloj salta a la tarjeta de voto.
3. En el reloj: elige una opción → el conteo sube en el móvil.
4. En el reloj: **C** (check-in) → **Llegué** → aparece en **Círculo** del móvil.
5. En **Quedar**: crea encuentro 1 min demo → countdown en el reloj → **Voy / Llegué**.
6. Abre **Mercado** / reloj **$** → glance de divisa.

## Modos arriba

- **Dual**: ves móvil y reloj juntos (ideal para presentar)
- **Móvil**: solo teléfono
- **Reloj**: solo cara del reloj

## Nota del reloj

Esta versión incluye un **simulador de reloj** dentro de la app para poder demostar la interacción sin hardware Wear OS/Apple Watch. La lógica de sync es la misma que usarías con un companion real.
