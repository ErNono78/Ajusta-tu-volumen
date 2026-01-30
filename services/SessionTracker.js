/**
 * SessionTracker Service
 * 
 * Rastrea y gestiona las métricas de sesión.
 * Calcula estadísticas en tiempo real y mantiene historial de estados.
 */

class SessionTracker {
    constructor() {
        this.currentSession = null;
        this.isTracking = false;
        this.timerInterval = null;

        // Listeners
        this.onStatsUpdate = null;
    }

    /**
     * Inicia una nueva sesión de tracking
     */
    startSession() {
        if (this.isTracking) {
            this.endSession();
        }

        this.currentSession = {
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            totalDuration: 0,           // En segundos
            greenZoneTime: 0,           // Tiempo en zona óptima (segundos)
            peakVolume: 0,              // Volumen máximo alcanzado
            consistencyScore: 100,      // Puntuación de consistencia
            dropCount: 0,               // Veces que cayó de verde a no-verde
            stateHistory: [],           // Historial de cambios de estado
            currentState: 'SILENT',
            lastGreenTime: null
        };

        this.isTracking = true;

        // Iniciar temporizador (actualiza cada segundo)
        this.timerInterval = setInterval(() => {
            this.updateTimer();
        }, 1000);
    }

    /**
     * Finaliza la sesión actual
     * @returns {Object} - Resumen de la sesión
     */
    endSession() {
        if (!this.isTracking || !this.currentSession) {
            return null;
        }

        this.isTracking = false;

        // Detener temporizador
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }

        // Calcular duración total final
        this.currentSession.totalDuration = Math.floor(
            (Date.now() - this.currentSession.startTime) / 1000
        );

        // Calcular puntuación de consistencia
        this.currentSession.consistencyScore = this.calculateConsistency();

        const summary = { ...this.currentSession };

        // Guardar en historial
        this.saveSessionToHistory(summary);

        return summary;
    }

    /**
     * Actualiza el temporizador cada segundo
     * @private
     */
    updateTimer() {
        if (!this.currentSession) return;

        this.currentSession.totalDuration = Math.floor(
            (Date.now() - this.currentSession.startTime) / 1000
        );

        // Incrementar tiempo en zona verde si aplica
        if (this.currentSession.currentState === 'OPTIMAL') {
            this.currentSession.greenZoneTime++;
        }

        this.notifyStatsUpdate();
    }

    /**
     * Registra actualización de estado desde el StateManager
     * @param {Object} stateData - Datos del estado actual
     */
    updateState(stateData) {
        if (!this.isTracking || !this.currentSession) return;

        const { state, volume, stateChanged } = stateData;

        // Actualizar estado actual
        const previousState = this.currentSession.currentState;
        this.currentSession.currentState = state;

        // Actualizar volumen pico
        if (volume > this.currentSession.peakVolume) {
            this.currentSession.peakVolume = Math.round(volume);
        }

        // Registrar cambio de estado en historial
        if (stateChanged) {
            this.currentSession.stateHistory.push({
                state: state,
                timestamp: Date.now(),
                volume: Math.round(volume)
            });

            // Detectar caída de zona verde
            if (previousState === 'OPTIMAL' && state !== 'OPTIMAL') {
                this.currentSession.dropCount++;
            }
        }

        // Trackear tiempo en verde
        if (state === 'OPTIMAL') {
            if (!this.currentSession.lastGreenTime) {
                this.currentSession.lastGreenTime = Date.now();
            }
        } else {
            this.currentSession.lastGreenTime = null;
        }
    }

    /**
     * Calcula el porcentaje de éxito de la sesión
     * @returns {number} - Porcentaje (0-100)
     */
    getSuccessPercentage() {
        if (!this.currentSession || this.currentSession.totalDuration === 0) {
            return 0;
        }

        const percentage = (this.currentSession.greenZoneTime / this.currentSession.totalDuration) * 100;
        return Math.min(100, Math.round(percentage));
    }

    /**
     * Calcula la puntuación de consistencia
     * @returns {number} - Puntuación (0-100)
     * @private
     */
    calculateConsistency() {
        if (!this.currentSession) return 100;

        const { greenZoneTime, dropCount } = this.currentSession;

        // Si nunca estuvo en verde, consistencia es 0
        if (greenZoneTime === 0) return 0;

        // Penalizar por cada caída (máximo 5 puntos por caída)
        const penalty = Math.min(dropCount * 5, 80);

        return Math.max(0, 100 - penalty);
    }

    /**
     * Formatea tiempo en formato MM:SS
     * @param {number} seconds - Segundos
     * @returns {string} - Tiempo formateado
     */
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Obtiene estadísticas actuales de la sesión
     * @returns {Object} - Estadísticas formateadas
     */
    getCurrentStats() {
        if (!this.currentSession) {
            return {
                totalTime: '00:00',
                greenTime: '00:00',
                successRate: '0%',
                peakVolume: 0
            };
        }

        return {
            totalTime: this.formatTime(this.currentSession.totalDuration),
            greenTime: this.formatTime(this.currentSession.greenZoneTime),
            successRate: `${this.getSuccessPercentage()}%`,
            peakVolume: this.currentSession.peakVolume
        };
    }

    /**
     * Genera un ID único para la sesión
     * @private
     */
    generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 9);
        return `session-${timestamp}-${random}`;
    }

    /**
     * Guarda la sesión en el historial (localStorage)
     * @private
     */
    saveSessionToHistory(session) {
        try {
            const history = this.getSessionHistory();
            history.unshift(session);

            // Mantener solo las últimas 50 sesiones
            const limitedHistory = history.slice(0, 50);

            localStorage.setItem('eco-logro-sessions', JSON.stringify(limitedHistory));
        } catch (error) {
            console.error('Error guardando sesión en localStorage:', error);
        }
    }

    /**
     * Obtiene el historial de sesiones desde localStorage
     * @returns {Array} - Array de sesiones
     */
    getSessionHistory() {
        try {
            const stored = localStorage.getItem('eco-logro-sessions');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error leyendo historial:', error);
            return [];
        }
    }

    /**
     * Exporta el historial de sesiones como JSON
     * @returns {string} - JSON string del historial
     */
    exportHistory() {
        const history = this.getSessionHistory();
        return JSON.stringify(history, null, 2);
    }

    /**
     * Limpia el historial de sesiones
     */
    clearHistory() {
        try {
            localStorage.removeItem('eco-logro-sessions');
        } catch (error) {
            console.error('Error limpiando historial:', error);
        }
    }

    /**
     * Registra callback para actualizaciones de estadísticas
     * @param {Function} callback - Función a llamar cuando se actualicen las stats
     */
    setStatsUpdateCallback(callback) {
        this.onStatsUpdate = callback;
    }

    /**
     * Notifica actualización de estadísticas
     * @private
     */
    notifyStatsUpdate() {
        if (this.onStatsUpdate) {
            this.onStatsUpdate(this.getCurrentStats());
        }
    }

    /**
     * Verifica si hay una sesión activa
     * @returns {boolean}
     */
    isSessionActive() {
        return this.isTracking;
    }
}

export default SessionTracker;
