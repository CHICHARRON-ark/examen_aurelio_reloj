# TETHER

App móvil + reloj (simulador) que se sincronizan en vivo.

Cumple:
- Reloj con UI compacta (contenido dentro del círculo, sin desbordes)
- Social: presencia, check-in Llegué/Salí, votación rápida, encuentro
- Económico: USD/MXN + S&P + IPC en vivo
- Cara del reloj configurable desde el móvil: hora, tipo de cambio, temperatura y ritmo cardiaco

## Qué hacer para correrla

El móvil y el reloj son dos sesiones. Hace falta el enlace y Expo.

1. En esta carpeta: `npm install`
2. Arranca los dos: `npm run dev`
3. Abre http://localhost:8081
4. Pulsa **Abrir reloj** para la otra sesión, o entra a http://localhost:8081/?as=watch
   Desde el celular, Expo Go usa la IP de la computadora. El enlace escucha en el puerto 8787 de esa misma IP.

Voto, encuentro y check-ins quedan en `server/data/state.json` aunque cierres la terminal.

## Cómo demostrar (90 segundos)

1. Deja el modo **Dual** (móvil arriba, reloj abajo). En **Inicio**, sube, baja, muestra u oculta Hora, Tipo de cambio, Temperatura y Ritmo cardiaco. La cara principal cambia al momento.
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

La cara redonda sigue siendo un simulador (no es un Wear OS físico). La sincronía ya no es estado local: cada ventana es un cliente del enlace WebSocket en el puerto 8787. Llegué pide la ubicación del dispositivo. USD/MXN sale de Frankfurter; S&P 500 e IPC, de Yahoo. La temperatura de la cara sale de Open-Meteo. El ritmo cardiaco entra por Bluetooth, con un pulsómetro, desde **Conectar pulsómetro**.
