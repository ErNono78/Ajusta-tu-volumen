# Ajusta tu Volumen de Voz (Eco-Logro) 🎤

Aplicación web educativa para monitorear el volumen de voz en tiempo real con feedback visual interactivo.

## 🌟 Características

- **Monitor de volumen en tiempo real** usando Web Audio API
- **Feedback visual dinámico** con colores intuitivos (sistema de semáforo)
- **Persistencia de volumen inteligente** para simular el ritmo natural del habla (Hold + Decay)
- **Personalización** con nombre del alumno y mensajes motivadores
- **Sistema de zonas configurable** (umbrales superior e inferior)
- **Control de Persistencia** ajustable de 0.5s a 10s
- **Estadísticas de sesión** con cronómetro y porcentaje de éxito
- **Configuración guardada** automáticamente en localStorage
- **Interfaz moderna** con diseño responsive y animaciones suaves

## 🎨 Estados de Volumen

| Estado | Color | Emoji | Descripción | Mensaje Típico |
|--------|-------|-------|-------------|----------------|
| **Silencio** | Gris | 🤔 | Sin sonido o muy bajo | "Habla, [Nombre]" |
| **Bajo** | Rojo | 🤔 | Volumen insuficiente | "Habla, [Nombre]" |
| **Óptimo** | Verde | 😊 | Volumen correcto | "Perfecto, sigue así" |
| **Alto** | Negro | 😅 | Demasiado alto | "¡Vamos!!" |

## 🚀 Inicio Rápido

### Opción 1: Servidor Python (Recomendado)

```bash
python3 server.py
```

Luego abre http://localhost:8080 en tu navegador.

### Opción 2: Servidor Node.js

```bash
npx http-server . -p 8080
```

### Opción 3: Cualquier servidor HTTP

La aplicación solo requiere servir archivos estáticos con soporte para ES modules.

## 📁 Estructura del Proyecto

```
Antigravity/
├── index.html              # Estructura HTML principal
├── styles.css              # Sistema de diseño y estilos
├── app.js                  # Orquestador principal
├── server.py               # Servidor HTTP de desarrollo
│
├── services/               # Capa de lógica de negocio
│   ├── AudioAnalyzer.js    # Wrapper para Web Audio API
│   ├── StateManager.js     # Máquina de estados
│   └── SessionTracker.js   # Tracking de métricas
│
└── data/                   # Capa de datos
    └── StorageManager.js   # Wrapper para localStorage
```

## 🎛️ Configuración

La aplicación permite ajustar:

- **Nombre del Alumno**: Personaliza los mensajes de feedback
- **Sensibilidad** (0-100%): Ajusta la respuesta del micrófono al ruido ambiental
- **Amortiguación** (0-100%): Suaviza cambios bruscos en el volumen
- **Persistencia** (0.5s - 10s): Tiempo que se mantiene el nivel entre palabras
- **Umbral Superior** (30-95): Límite máximo de la zona verde
- **Umbral Inferior** (5-70): Límite mínimo de la zona verde

Todas las configuraciones se guardan automáticamente en localStorage.

## 📊 Estadísticas

La aplicación rastrea:

- **Tiempo Total**: Duración de la sesión
- **Tiempo en Verde**: Tiempo en volumen óptimo
- **% de Éxito**: Porcentaje de tiempo en zona verde
- **Pico Máximo**: Volumen más alto alcanzado (dB)
- **Consistencia**: Puntuación basada en estabilidad

Las sesiones se guardan en el historial local (máximo 50 sesiones).

## 🔒 Privacidad

La aplicación **NO graba ni almacena audio**. Solo analiza el volumen en tiempo real usando Web Audio API. Toda la información se procesa localmente en el navegador.

## 🌐 Compatibilidad

- **Chrome/Edge**: ✅ Totalmente compatible
- **Firefox**: ✅ Compatible
- **Safari**: ✅ Compatible (requiere permisos de micrófono)

**Nota**: Requiere navegador con soporte para Web Audio API y getUserMedia.

## 🛠️ Tecnologías

- HTML5 con estructura semántica
- CSS3 con Custom Properties (tokens de diseño)
- JavaScript ES6+ con módulos
- Web Audio API
- Canvas API (para gráficos)
- localStorage API

## 📖 Arquitectura

El proyecto sigue principios de **Separación de Responsabilidades**:

- **UI Layer** (index.html, styles.css): Solo visualización
- **Business Logic** (services/): Lógica agnóstica de UI
- **Data Layer** (data/): Persistencia y storage
- **Orchestration** (app.js): Coordinación de capas

### Principios de Diseño

- ✅ **Sistema de tokens** para colores, espaciado y tipografía
- ✅ **Componentes inmutables** con datos de una sola dirección
- ✅ **Wrappers agnósticos** para APIs externas (fácil sustitución)
- ✅ **Early return pattern** para código limpio
- ✅ **Manejo de errores global** con feedback al usuario

## 🎯 Uso Educativo

Perfecto para:
- Clases virtuales (monitorear volumen de estudiantes)
- Ejercicios de oratoria y dicción
- Terapia de habla
- Presentaciones públicas
- Control de ruido en espacios compartidos

## 📝 Licencia

Este proyecto fue creado para uso educativo.

---

**Desarrollado con ❤️ siguiendo las mejores prácticas de desarrollo web**
