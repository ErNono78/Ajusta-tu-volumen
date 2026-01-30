/**
 * StorageManager
 * 
 * Wrapper agnóstico para localStorage.
 * Proporciona métodos CRUD para gestionar configuraciones y sesiones.
 */

class StorageManager {
    constructor() {
        this.storageAvailable = this.checkStorageAvailability();
        this.configKey = 'eco-logro-config';
        this.sessionsKey = 'eco-logro-sessions';
    }

    /**
     * Verifica si localStorage está disponible
     * @private
     */
    checkStorageAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage no está disponible:', e);
            return false;
        }
    }

    /**
     * Guarda la configuración del usuario
     * @param {Object} config - Configuración a guardar
     */
    saveConfig(config) {
        if (!this.storageAvailable) return false;

        try {
            const configWithTimestamp = {
                ...config,
                lastUpdated: Date.now()
            };

            localStorage.setItem(this.configKey, JSON.stringify(configWithTimestamp));
            return true;
        } catch (error) {
            console.error('Error guardando configuración:', error);
            return false;
        }
    }

    /**
     * Carga la configuración del usuario
     * @returns {Object|null} - Configuración guardada o null
     */
    loadConfig() {
        if (!this.storageAvailable) return null;

        try {
            const stored = localStorage.getItem(this.configKey);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error('Error cargando configuración:', error);
            return null;
        }
    }

    /**
     * Obtiene la configuración por defecto
     * @returns {Object} - Configuración por defecto
     */
    getDefaultConfig() {
        return {
            sensitivity: 85,
            dampening: 20,
            upperThreshold: 75,
            lowerThreshold: 25,
            persistenceDuration: 2000, // Duración de hold en milisegundos (2 segundos)
            studentName: ''
        };
    }

    /**
     * Resetea la configuración a valores por defecto
     */
    resetConfig() {
        const defaultConfig = this.getDefaultConfig();
        this.saveConfig(defaultConfig);
        return defaultConfig;
    }

    /**
     * Guarda una sesión en el historial
     * @param {Object} session - Sesión a guardar
     */
    saveSession(session) {
        if (!this.storageAvailable) return false;

        try {
            const sessions = this.getSessions();
            sessions.unshift(session);

            // Limitar a 50 sesiones
            const limited = sessions.slice(0, 50);

            localStorage.setItem(this.sessionsKey, JSON.stringify(limited));
            return true;
        } catch (error) {
            console.error('Error guardando sesión:', error);
            return false;
        }
    }

    /**
     * Obtiene todas las sesiones guardadas
     * @returns {Array} - Array de sesiones
     */
    getSessions() {
        if (!this.storageAvailable) return [];

        try {
            const stored = localStorage.getItem(this.sessionsKey);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error cargando sesiones:', error);
            return [];
        }
    }

    /**
     * Obtiene una sesión específica por ID
     * @param {string} sessionId - ID de la sesión
     * @returns {Object|null} - Sesión encontrada o null
     */
    getSession(sessionId) {
        const sessions = this.getSessions();
        return sessions.find(s => s.sessionId === sessionId) || null;
    }

    /**
     * Elimina una sesión específica
     * @param {string} sessionId - ID de la sesión a eliminar
     */
    deleteSession(sessionId) {
        if (!this.storageAvailable) return false;

        try {
            const sessions = this.getSessions();
            const filtered = sessions.filter(s => s.sessionId !== sessionId);

            localStorage.setItem(this.sessionsKey, JSON.stringify(filtered));
            return true;
        } catch (error) {
            console.error('Error eliminando sesión:', error);
            return false;
        }
    }

    /**
     * Limpia todas las sesiones
     */
    clearSessions() {
        if (!this.storageAvailable) return false;

        try {
            localStorage.removeItem(this.sessionsKey);
            return true;
        } catch (error) {
            console.error('Error limpiando sesiones:', error);
            return false;
        }
    }

    /**
     * Exporta todas las sesiones como JSON
     * @returns {string} - JSON string de las sesiones
     */
    exportSessions() {
        const sessions = this.getSessions();
        return JSON.stringify(sessions, null, 2);
    }

    /**
     * Obtiene estadísticas agregadas de todas las sesiones
     * @returns {Object} - Estadísticas agregadas
     */
    getAggregateStats() {
        const sessions = this.getSessions();

        if (sessions.length === 0) {
            return {
                totalSessions: 0,
                averageSuccessRate: 0,
                totalGreenTime: 0,
                totalTime: 0,
                bestSession: null
            };
        }

        const totalTime = sessions.reduce((sum, s) => sum + s.totalDuration, 0);
        const totalGreenTime = sessions.reduce((sum, s) => sum + s.greenZoneTime, 0);
        const averageSuccessRate = Math.round(
            sessions.reduce((sum, s) => {
                const rate = s.totalDuration > 0 ? (s.greenZoneTime / s.totalDuration) * 100 : 0;
                return sum + rate;
            }, 0) / sessions.length
        );

        const bestSession = sessions.reduce((best, current) => {
            const currentRate = current.totalDuration > 0
                ? (current.greenZoneTime / current.totalDuration) * 100
                : 0;
            const bestRate = best.totalDuration > 0
                ? (best.greenZoneTime / best.totalDuration) * 100
                : 0;

            return currentRate > bestRate ? current : best;
        }, sessions[0]);

        return {
            totalSessions: sessions.length,
            averageSuccessRate,
            totalGreenTime,
            totalTime,
            bestSession
        };
    }

    /**
     * Limpia todos los datos almacenados
     */
    clearAll() {
        if (!this.storageAvailable) return false;

        try {
            localStorage.removeItem(this.configKey);
            localStorage.removeItem(this.sessionsKey);
            return true;
        } catch (error) {
            console.error('Error limpiando datos:', error);
            return false;
        }
    }
}

export default StorageManager;
