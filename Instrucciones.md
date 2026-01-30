## **Especificación Técnica: Web App "Eco-Logro"**

### **1\. Interfaz de Usuario (UI)**

* **Visualizador Central:** Un círculo o barra de gran tamaño que cambia de color dinámicamente.  
  * **Gris/Negro:** Ausencia total de sonido.  
  * **Rojo:** Sonido detectado pero insuficiente.  
  * **Amarillo:** Cerca del objetivo.  
  * **Verde:** ¡Objetivo cumplido\! (Volumen óptimo).  
* **Panel de Control (Ocultable):** Deslizadores para ajustar la sensibilidad del micrófono según el ruido ambiental.  
* **Dashboard de Sesión:** Cronómetro que muestra el tiempo total en "Zona Verde".

### **2\. Lógica de Procesamiento (Web Audio API)**

La aplicación utilizará la **Web Audio API** para analizar las frecuencias y la amplitud sin necesidad de grabar o almacenar el audio (protegiendo la privacidad del alumno).

### **3\. Módulo de Estadísticas (Nuevo Requisito)**

* **Registro de Tiempo:** Un contador que solo avanza cuando el estado es "Verde".  
* **Cálculo de Eficacia:** Al finalizar la sesión, la app mostrará:  
  * Tiempo total de la sesión.  
  * Porcentaje de éxito ($(Tiempo\_{verde} / Tiempo\_{total}) \\times 100$).  
  * Gráfico de barras simple con el resumen del desempeño.

---

## **Estructura de Datos para Estadísticas**

Para que puedas ver cómo se guardaría la información (por ejemplo, en la memoria local del navegador), la estructura sería algo así:

| Dato | Descripción |
| :---- | :---- |
| **Sesión ID** | Identificador único con fecha y hora. |
| **Tiempo en Verde** | Segundos totales acumulados en el umbral correcto. |
| **Pico Máximo** | El nivel más alto de $dB$ alcanzado. |
| **Consistencia** | Veces que el alumno cayó del verde al rojo (para medir fatiga). |

