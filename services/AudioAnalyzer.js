/**
 * AudioAnalyzer Service
 * 
 * Wrapper agnóstico para Web Audio API.
 * Responsable de capturar y analizar el audio del micrófono en tiempo real.
 * No graba ni almacena audio para proteger la privacidad.
 */

class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.dataArray = null;
        this.bufferLength = null;
        this.isInitialized = false;
        this.isAnalyzing = false;
        this.animationFrameId = null;

        // Configuration
        this.fftSize = 2048;
        this.smoothingTimeConstant = 0.8;

        // Callbacks
        this.onVolumeUpdate = null;
        this.onError = null;
    }

    /**
     * Actualiza la constante de suavizado (amortiguación)
     * @param {number} value - Valor entre 0 y 1 (ej: 0.8)
     */
    setSmoothingTimeConstant(value) {
        this.smoothingTimeConstant = Math.max(0, Math.min(0.99, value));
        if (this.analyser) {
            this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
        }
    }

    /**
     * Inicializa el contexto de audio y solicita permisos de micrófono
     * @returns {Promise<boolean>} - True si la inicialización fue exitosa
     */
    async initialize() {
        try {
            // Verificar soporte de navegador
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Tu navegador no soporta acceso al micrófono');
            }

            // Solicitar permiso de micrófono
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: false
                }
            });

            // Crear contexto de audio
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();

            // Crear analizador
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = this.fftSize;
            this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;

            // Conectar micrófono
            this.microphone = this.audioContext.createMediaStreamSource(stream);
            this.microphone.connect(this.analyser);

            // Preparar buffer para datos
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);

            this.isInitialized = true;
            return true;

        } catch (error) {
            this.handleError('Error al inicializar el micrófono', error);
            return false;
        }
    }

    /**
     * Inicia el análisis continuo de audio
     */
    startAnalysis() {
        if (!this.isInitialized) {
            this.handleError('Debes inicializar el analizador primero', null);
            return;
        }

        this.isAnalyzing = true;
        this.analyze();
    }

    /**
     * Detiene el análisis de audio
     */
    stopAnalysis() {
        this.isAnalyzing = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    /**
     * Ciclo de análisis de audio (se ejecuta en cada frame)
     * @private
     */
    analyze() {
        if (!this.isAnalyzing) return;

        // Obtener datos de frecuencia
        this.analyser.getByteFrequencyData(this.dataArray);

        // Calcular volumen promedio
        const volume = this.getCurrentVolume();

        // Notificar a través de callback
        if (this.onVolumeUpdate) {
            this.onVolumeUpdate(volume);
        }

        // Continuar análisis en el próximo frame
        this.animationFrameId = requestAnimationFrame(() => this.analyze());
    }

    /**
     * Obtiene el volumen actual normalizado (0-100)
     * @returns {number} - Volumen normalizado
     */
    getCurrentVolume() {
        if (!this.dataArray) return 0;

        // Calcular promedio de todas las frecuencias
        let sum = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            sum += this.dataArray[i];
        }
        const average = sum / this.bufferLength;

        // Normalizar a escala 0-100
        const normalized = Math.min(100, (average / 255) * 100);

        return normalized;
    }

    /**
     * Obtiene el volumen RMS ponderado (más preciso para voz)
     * @returns {number} - Volumen RMS normalizado
     */
    getRMSVolume() {
        if (!this.dataArray) return 0;

        // Calcular RMS (Root Mean Square)
        let sum = 0;
        for (let i = 0; i < this.bufferLength; i++) {
            const normalized = this.dataArray[i] / 255;
            sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / this.bufferLength);

        // Volver a escala Lineal con Puerta de Ruido (Noise Gate)
        // Esto es mucho más efectivo para ignorar ruidos de fondo (pasos, aire) que la escala dB

        // Ajuste x250: Punto ideal tras eliminar el filtrado doble del StateManager.
        // Equilibrio entre captación de voz en iPad y estabilidad frente a ruidos.
        let volume = Math.min(100, rms * 250);

        // --- NOISE GATE ---
        // Si el volumen detectado es menor al 8%, se fuerza a 0 absoluto.
        // Esto hace que la barra sea más "limpia" y no salte con ruidos suaves.
        if (volume < 8) {
            volume = 0;
        }

        return volume;
    }

    /**
     * Obtiene datos de frecuencia para visualización avanzada
     * @returns {Uint8Array} - Array de datos de frecuencia
     */
    getFrequencyData() {
        if (!this.dataArray) return new Uint8Array(0);

        this.analyser.getByteFrequencyData(this.dataArray);
        return this.dataArray;
    }

    /**
     * Registra callback para actualizaciones de volumen
     * @param {Function} callback - Función a llamar con el volumen actualizado
     */
    setVolumeUpdateCallback(callback) {
        this.onVolumeUpdate = callback;
    }

    /**
     * Registra callback para manejo de errores
     * @param {Function} callback - Función a llamar cuando ocurra un error
     */
    setErrorCallback(callback) {
        this.onError = callback;
    }

    /**
     * Maneja errores y notifica a través de callback
     * @private
     */
    handleError(message, error) {
        console.error(message, error);

        if (this.onError) {
            this.onError({ message, error });
        }
    }

    /**
     * Limpia recursos y detiene el análisis
     */
    destroy() {
        this.stopAnalysis();

        if (this.microphone) {
            this.microphone.disconnect();
            this.microphone = null;
        }

        if (this.analyser) {
            this.analyser.disconnect();
            this.analyser = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.isInitialized = false;
    }
}

export default AudioAnalyzer;
