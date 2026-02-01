/**
 * StateManager Service
 * 
 * Gestiona el estado de la aplicación usando una máquina de estados.
 * Aplica lógica de umbrales y dampening para transiciones suaves.
 */

const States = {
    SILENT: 'SILENT',       // Sin sonido detectado
    LOW: 'LOW',             // Sonido bajo
    OPTIMAL: 'OPTIMAL',     // Volumen óptimo (zona verde)
    WARNING: 'WARNING',     // Cerca del límite superior
    DANGER: 'DANGER'        // Demasiado alto
};

const StateMessages = {
    [States.SILENT]: 'No detecto ningún sonido...',
    [States.LOW]: 'Speak up a little, I can\'t hear you',
    [States.OPTIMAL]: 'That\'s better, just the right volume',
    [States.WARNING]: 'Getting a bit loud!',
    [States.DANGER]: 'That\'s too loud!'
};

const StateEmojis = {
    [States.SILENT]: '😐',
    [States.LOW]: '🤔',
    [States.OPTIMAL]: '😊',
    [States.WARNING]: '😰',
    [States.DANGER]: '😱'
};

class StateManager {
    constructor() {
        // Estado actual
        this.currentState = States.SILENT;
        this.lastVolume = 0;
        this.studentName = '';
        this.stateChangeListeners = [];

        // Configuración de umbrales (pueden ser modificados)
        this.config = {
            lowerThreshold: 25,      // Umbral inferior de zona verde (1er cuarto)
            upperThreshold: 75,      // Umbral superior de zona verde (3er cuarto)
            sensitivity: 85,         // Sensibilidad del micrófono (0-100) - más sensible
            dampening: 20            // Amortiguación (0-100) - menos amortiguación para más respuesta
        };

        // Historial para dampening
        this.volumeHistory = [];
        this.historyMaxLength = 5;
    }

    /**
     * Actualiza el estado basado en el volumen actual
     * @param {number} rawVolume - Volumen en bruto (0-100)
     * @returns {Object} - Estado actualizado con información relevante
     */
    updateState(volume) {
        // Determinamos el estado basándonos directamente en el volumen recibido.
        // El volumen ya viene procesado con Peak Hold y Suavizado desde app.js.
        const newState = this.determineState(volume);

        // Verificar si hubo cambio de estado
        const stateChanged = newState !== this.currentState;

        if (stateChanged) {
            this.previousState = this.currentState;
            this.currentState = newState;
            this.notifyStateChange();
        }

        this.lastVolume = volume;

        return {
            state: this.currentState,
            volume: volume,
            stateChanged: stateChanged,
            message: this.getStateInfo(this.currentState).message,
            emoji: this.getStateInfo(this.currentState).emoji,
            isInGreenZone: this.currentState === States.OPTIMAL
        };
    }

    /**
     * Aplica la sensibilidad configurada al volumen
     * @private
     */
    applySensitivity(volume) {
        const sensitivity = this.config.sensitivity / 100;

        // Sensitivity actúa como un multiplicador
        // 50% = sin cambio, >50% amplifica, <50% atenúa
        const adjusted = volume * (0.5 + sensitivity);

        return Math.min(100, Math.max(0, adjusted));
    }

    /**
     * Aplica dampening (suavizado) para evitar cambios bruscos
     * @private
     */
    applyDampening(volume) {
        // Agregar a historial
        this.volumeHistory.push(volume);
        if (this.volumeHistory.length > this.historyMaxLength) {
            this.volumeHistory.shift();
        }

        // Sin dampening, retornar volumen actual
        if (this.config.dampening === 0) {
            return volume;
        }

        // Calcular promedio ponderado
        const dampeningFactor = this.config.dampening / 100;
        const weightCurrent = 1 - dampeningFactor;
        const weightHistory = dampeningFactor;

        const historyAverage = this.volumeHistory.reduce((sum, v) => sum + v, 0) / this.volumeHistory.length;

        return (volume * weightCurrent) + (historyAverage * weightHistory);
    }

    /**
     * Determina el estado basado en el volumen procesado
     * Sistema por cuartos: 0-25% ROJO, 25-75% VERDE, 75-100% NEGRO
     * @private
     */
    determineState(volume) {
        const { lowerThreshold, upperThreshold } = this.config;

        // Zona de silencio (casi sin volumen)
        if (volume < 3) {
            return States.SILENT;
        }

        // Primer cuarto: ROJO (volumen bajo)
        if (volume < lowerThreshold) {
            return States.LOW;
        }

        // Segundo y tercer cuarto: VERDE (volumen correcto)
        if (volume >= lowerThreshold && volume <= upperThreshold) {
            return States.OPTIMAL;
        }

        // Último cuarto: NEGRO (volumen muy alto)
        return States.DANGER;
    }

    /**
     * Actualiza la configuración de umbrales y filtros
     * @param {Object} newConfig - Nueva configuración parcial o completa
     */
    updateConfiguration(newConfig) {
        this.config = { ...this.config, ...newConfig };

        // Validar rangos
        this.config.lowerThreshold = Math.max(0, Math.min(85, this.config.lowerThreshold));
        this.config.upperThreshold = Math.max(15, Math.min(100, this.config.upperThreshold));
        this.config.sensitivity = Math.max(0, Math.min(100, this.config.sensitivity));
        this.config.dampening = Math.max(0, Math.min(100, this.config.dampening));

        // Asegurar que lower < upper
        if (this.config.lowerThreshold >= this.config.upperThreshold) {
            this.config.upperThreshold = this.config.lowerThreshold + 10;
        }
    }

    /**
     * Obtiene la configuración actual
     * @returns {Object} - Configuración actual
     */
    getConfiguration() {
        return { ...this.config };
    }

    /**
     * Registra un listener para cambios de estado
     * @param {Function} callback - Función a llamar cuando cambie el estado
     */
    addStateChangeListener(callback) {
        this.stateChangeListeners.push(callback);
    }

    /**
     * Establece el nombre del estudiante para personalizar mensajes
     */
    setStudentName(name) {
        this.studentName = name ? name.trim() : '';
    }

    /**
     * Obtiene el mensaje y emoji correspondiente al estado
     * Con mensajes personalizados según el nombre del estudiante
     * @private
     */
    getStateInfo(state) {
        const studentName = this.studentName || '';
        const nameToUse = studentName || 'amigo';

        const info = {
            SILENT: {
                message: studentName ? `Habla, ${studentName}` : 'Habla un poco, no te oigo',
                emoji: '🤔'
            },
            LOW: {
                message: studentName ? `Habla, ${studentName}` : 'Habla un poco, no te oigo',
                emoji: '🤔'
            },
            OPTIMAL: {
                message: 'Perfecto, sigue así, mantén el volumen',
                emoji: '😊'
            },
            DANGER: {
                message: '¡Vamos!!',
                emoji: '😅'
            }
        };

        return info[state] || info.SILENT;
    }

    /**
     * Notifica a todos los listeners sobre cambio de estado
     * @private
     */
    notifyStateChange() {
        const stateInfo = this.getStateInfo(this.currentState);
        this.stateChangeListeners.forEach(callback => {
            callback({
                state: this.currentState,
                previousState: this.previousState,
                message: stateInfo.message,
                emoji: stateInfo.emoji
            });
        });
    }

    /**
     * Obtiene el estado actual
     * @returns {string} - Estado actual
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * Verifica si está en zona verde (óptima)
     * @returns {boolean}
     */
    isInGreenZone() {
        return this.currentState === States.OPTIMAL;
    }

    /**
     * Reinicia el gestor de estado
     */
    reset() {
        this.currentState = States.SILENT;
        this.previousVolume = 0;
        this.volumeHistory = [];
    }
}

export { StateManager, States, StateMessages, StateEmojis };
