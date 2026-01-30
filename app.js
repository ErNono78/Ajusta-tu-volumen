/**
 * Eco-Logro - Main Application
 * 
 * Punto de entrada principal que orquesta todos los servicios y componentes.
 */

import AudioAnalyzer from './services/AudioAnalyzer.js';
import { StateManager, States } from './services/StateManager.js';
import SessionTracker from './services/SessionTracker.js';
import StorageManager from './data/StorageManager.js';

class EcoLogroApp {
    constructor() {
        // Servicios
        this.audioAnalyzer = new AudioAnalyzer();
        this.stateManager = new StateManager();
        this.sessionTracker = new SessionTracker();
        this.storageManager = new StorageManager();

        // Estado de la aplicación
        this.isRunning = false;
        this.isPaused = false;

        // Sistema de persistencia de volumen (hold time de 2 segundos)
        this.lastSignificantVolume = 0;
        this.lastVolumeTimestamp = 0;
        this.volumeHoldDuration = 2000; // 2 segundos en milisegundos
        this.displayedVolume = 0;

        // Referencias DOM (se inicializan en init)
        this.elements = {};

        // Bind de métodos
        this.handleVolumeUpdate = this.handleVolumeUpdate.bind(this);
        this.handleStateChange = this.handleStateChange.bind(this);
        this.handleStatsUpdate = this.handleStatsUpdate.bind(this);
        this.handleError = this.handleError.bind(this);
    }

    /**
     * Inicializa la aplicación
     */
    async init() {
        console.log('🚀 Inicializando Eco-Logro...');

        // Obtener referencias DOM
        this.cacheElements();

        // Cargar configuración guardada
        this.loadSavedConfiguration();

        // Configurar event listeners
        this.setupEventListeners();

        // Configurar callbacks de servicios
        this.setupServiceCallbacks();

        // Inicializar el analizador de audio
        const initialized = await this.audioAnalyzer.initialize();

        if (initialized) {
            console.log('✅ Micrófono inicializado correctamente');
            this.start();
        } else {
            console.error('❌ Error al inicializar el micrófono');
            this.showError('No se pudo acceder al micrófono. Verifica los permisos del navegador.');
        }
    }

    /**
     * Cachea referencias a elementos DOM
     * @private
     */
    cacheElements() {
        this.elements = {
            // Status
            statusMessage: document.getElementById('statusMessage'),
            emojiIcon: document.getElementById('emojiIcon'),

            // Termómetro
            thermometerFill: document.getElementById('thermometerFill'),
            thermometerMercury: document.getElementById('thermometerMercury'),

            // Stats
            totalTime: document.getElementById('totalTime'),
            greenTime: document.getElementById('greenTime'),
            successRate: document.getElementById('successRate'),

            // Controles
            pauseBtn: document.getElementById('pauseBtn'),
            settingsBtn: document.getElementById('settingsBtn'),
            controlPanel: document.getElementById('controlPanel'),
            closePanel: document.getElementById('closePanel'),

            // Sliders y configuración
            studentName: document.getElementById('studentName'),
            sensitivitySlider: document.getElementById('sensitivitySlider'),
            sensitivityValue: document.getElementById('sensitivityValue'),
            dampeningSlider: document.getElementById('dampeningSlider'),
            dampeningValue: document.getElementById('dampeningValue'),
            upperThreshold: document.getElementById('upperThreshold'),
            upperThresholdValue: document.getElementById('upperThresholdValue'),
            lowerThreshold: document.getElementById('lowerThreshold'),
            lowerThresholdValue: document.getElementById('lowerThresholdValue'),
            persistenceSlider: document.getElementById('persistenceSlider'),
            persistenceValue: document.getElementById('persistenceValue'),

            // Botones
            saveSettings: document.getElementById('saveSettings'),
            moreBtn: document.getElementById('moreBtn'),

            // Preview zones
            previewZoneHigh: document.getElementById('previewZoneHigh'),
            previewZoneOptimal: document.getElementById('previewZoneOptimal'),
            previewZoneLow: document.getElementById('previewZoneLow'),

            // Modal
            sessionModal: document.getElementById('sessionModal'),
            closeModal: document.getElementById('closeModal'),
            newSessionBtn: document.getElementById('newSessionBtn'),
            summaryTotalTime: document.getElementById('summaryTotalTime'),
            summaryGreenTime: document.getElementById('summaryGreenTime'),
            summarySuccess: document.getElementById('summarySuccess'),
            summaryPeak: document.getElementById('summaryPeak'),
            summaryConsistency: document.getElementById('summaryConsistency'),
            summaryChart: document.getElementById('summaryChart')
        };
    }

    /**
     * Configura todos los event listeners
     * @private
     */
    setupEventListeners() {
        // Botón de pausa/reanudar
        this.elements.pauseBtn.addEventListener('click', () => this.togglePause());

        // Botón de configuración
        this.elements.settingsBtn.addEventListener('click', () => this.openSettings());
        this.elements.closePanel.addEventListener('click', () => this.closeSettings());

        // Sliders de configuración
        this.elements.sensitivitySlider.addEventListener('input', (e) => {
            this.elements.sensitivityValue.textContent = `${e.target.value}%`;
        });

        this.elements.dampeningSlider.addEventListener('input', (e) => {
            this.elements.dampeningValue.textContent = `${e.target.value}%`;
        });

        this.elements.upperThreshold.addEventListener('input', (e) => {
            this.elements.upperThresholdValue.textContent = e.target.value;
            this.updateThresholdPreview();
        });

        this.elements.lowerThreshold.addEventListener('input', (e) => {
            this.elements.lowerThresholdValue.textContent = e.target.value;
            this.updateThresholdPreview();
        });

        this.elements.persistenceSlider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.elements.persistenceValue.textContent = (val / 1000).toFixed(1) + 's';
        });

        // Guardar configuración
        this.elements.saveSettings.addEventListener('click', () => this.saveConfiguration());

        // Botón "More" - finalizar sesión
        this.elements.moreBtn.addEventListener('click', () => this.showSessionSummary());

        // Modal
        this.elements.closeModal.addEventListener('click', () => this.closeModal());
        this.elements.newSessionBtn.addEventListener('click', () => this.startNewSession());

        // Cerrar modal al hacer click fuera
        this.elements.sessionModal.addEventListener('click', (e) => {
            if (e.target === this.elements.sessionModal) {
                this.closeModal();
            }
        });
    }

    /**
     * Configura callbacks de los servicios
     * @private
     */
    setupServiceCallbacks() {
        this.audioAnalyzer.setVolumeUpdateCallback(this.handleVolumeUpdate);
        this.audioAnalyzer.setErrorCallback(this.handleError);
        this.stateManager.addStateChangeListener(this.handleStateChange);
        this.sessionTracker.setStatsUpdateCallback(this.handleStatsUpdate);
    }

    /**
     * Carga la configuración guardada
     * @private
     */
    loadSavedConfiguration() {
        const config = this.storageManager.loadConfig() || this.storageManager.getDefaultConfig();

        // Aplicar al StateManager
        this.stateManager.updateConfiguration(config);
        this.stateManager.setStudentName(config.studentName || '');

        // Actualizar UI de sliders
        this.elements.sensitivitySlider.value = config.sensitivity;
        this.elements.sensitivityValue.textContent = `${config.sensitivity}%`;

        this.elements.dampeningSlider.value = config.dampening;
        this.elements.dampeningValue.textContent = `${config.dampening}%`;

        this.elements.upperThreshold.value = config.upperThreshold;
        this.elements.upperThresholdValue.textContent = config.upperThreshold;

        this.elements.lowerThreshold.value = config.lowerThreshold;
        this.elements.lowerThresholdValue.textContent = config.lowerThreshold;

        this.elements.studentName.value = config.studentName || '';

        // Actualizar persistencia
        const persistence = config.persistenceDuration || 2000;
        this.elements.persistenceSlider.value = persistence;
        this.elements.persistenceValue.textContent = (persistence / 1000).toFixed(1) + 's';
        this.volumeHoldDuration = persistence;

        // Actualizar vista previa inicial
        this.updateThresholdPreview();
    }

    /**
     * Inicia el análisis de audio y tracking de sesión
     */
    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.audioAnalyzer.startAnalysis();
        this.sessionTracker.startSession();

        console.log('▶️ Sesión iniciada');
    }

    /**
     * Detiene el análisis de audio
     */
    stop() {
        if (!this.isRunning) return;

        this.isRunning = false;
        this.audioAnalyzer.stopAnalysis();

        console.log('⏸️ Análisis detenido');
    }

    /**
     * Alterna entre pausa y reproducción
     */
    togglePause() {
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            this.audioAnalyzer.stopAnalysis();
            this.elements.pauseBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                </svg>
            `;
            this.elements.pauseBtn.setAttribute('aria-label', 'Reanudar');
        } else {
            this.audioAnalyzer.startAnalysis();
            this.elements.pauseBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
            `;
            this.elements.pauseBtn.setAttribute('aria-label', 'Pausar');
        }
    }

    /**
     * Callback: Maneja actualizaciones de volumen desde AudioAnalyzer
     * @private
     */
    handleVolumeUpdate(volume) {
        if (this.isPaused) return;

        // Usar RMS para mejor precisión
        const rmsVolume = this.audioAnalyzer.getRMSVolume();

        // Actualizar termómetro visual primero (con sistema de persistencia)
        this.updateThermometer(rmsVolume);

        // Usar el volumen mostrado (con persistencia) para determinar el estado
        // Esto hace que el color del bulbo y los mensajes también se mantengan
        const stateData = this.stateManager.updateState(this.displayedVolume);

        // Actualizar tracker
        this.sessionTracker.updateState(stateData);
    }

    /**
     * Callback: Maneja cambios de estado
     * @private
     */
    handleStateChange(stateInfo) {
        const { state, message, emoji } = stateInfo;

        // Actualizar mensaje y emoji
        this.elements.statusMessage.textContent = message;
        this.elements.emojiIcon.textContent = emoji;

        // Actualizar clase del body para cambio de color de fondo
        document.body.className = '';
        document.body.classList.add(`state-${state.toLowerCase()}`);

        // Actualizar color del mercurio del termómetro
        this.elements.thermometerMercury.className = 'thermometer-mercury';
        this.elements.thermometerMercury.classList.add(`state-${state.toLowerCase()}`);
    }

    /**
     * Callback: Maneja actualizaciones de estadísticas
     * @private
     */
    handleStatsUpdate(stats) {
        this.elements.totalTime.textContent = stats.totalTime;
        this.elements.greenTime.textContent = stats.greenTime;
        this.elements.successRate.textContent = stats.successRate;
    }

    /**
     * Actualiza la visualización del termómetro con sistema de persistencia
     * La barra se mantiene durante 2 segundos para simular habla natural
     * @private
     */
    updateThermometer(volume) {
        const currentTime = Date.now();

        // --- 1. LÓGICA DE PERSISTENCIA (Peak Hold) ---

        // Umbral mínimo de ruido
        const noiseFloor = 3;

        if (volume > this.lastSignificantVolume) {
            // Subida: actualización instantánea
            this.lastSignificantVolume = volume;
            this.lastVolumeTimestamp = currentTime;
            this.displayedVolume = volume;
        } else {
            // Bajada: aplicar persistencia
            const timeSinceLastPeak = currentTime - this.lastVolumeTimestamp;

            if (timeSinceLastPeak < this.volumeHoldDuration) {
                // Hold
                this.displayedVolume = this.lastSignificantVolume;
            } else {
                // Decay
                const decayDuration = 1000;
                const timeInDecay = timeSinceLastPeak - this.volumeHoldDuration;
                const progress = Math.min(1, timeInDecay / decayDuration);
                this.displayedVolume = this.lastSignificantVolume * (1 - progress) + (volume * progress);

                if (progress >= 1) {
                    this.lastSignificantVolume = volume;
                    this.lastVolumeTimestamp = currentTime;
                }
            }
        }

        // --- 2. ESCALADO VISUAL INTELIGENTE ---

        let visualHeight = 0;

        // Cargar umbrales actuales del DOM (Fuente de la verdad)
        const lower = parseInt(this.elements.lowerThreshold.value) || 25;
        const upper = parseInt(this.elements.upperThreshold.value) || 75;

        // Mapeo no lineal para diseño de 3 Tercios (Rojo, Verde, Negro)
        if (this.displayedVolume <= lower) {
            // Zona Roja/Baja
            visualHeight = (this.displayedVolume / Math.max(1, lower)) * 33.3;
        } else if (this.displayedVolume <= upper) {
            // Zona Verde/Óptima
            const range = Math.max(1, upper - lower);
            const progress = (this.displayedVolume - lower) / range;
            visualHeight = 33.3 + (progress * 51.7); // 33.3 + 51.7 ≈ 85
        } else {
            // Zona Negra/Alta
            const range = Math.max(1, 100 - upper);
            const progress = (this.displayedVolume - upper) / range;
            visualHeight = 85 + (progress * 15);
        }

        // Asegurar límites visuales
        visualHeight = Math.min(100, Math.max(0, visualHeight));
        this.elements.thermometerFill.style.height = `${visualHeight}%`;

        // --- 3. LÓGICA DE COLOR (Sincronización Estricta) ---
        // El color depende SOLO de los umbrales, igual que el bulbo

        this.elements.thermometerFill.classList.remove('fill-low', 'fill-optimal', 'fill-high');

        if (this.displayedVolume > upper) {
            this.elements.thermometerFill.classList.add('fill-high'); // Negro (Alto)
        } else if (this.displayedVolume > lower) {
            this.elements.thermometerFill.classList.add('fill-optimal'); // Verde (Óptimo)
        } else {
            this.elements.thermometerFill.classList.add('fill-low'); // Rojo (Bajo)
        }
    }

    /**
     * Abre el panel de configuración
     */
    openSettings() {
        this.elements.controlPanel.classList.add('active');
    }

    /**
     * Cierra el panel de configuración
     */
    closeSettings() {
        this.elements.controlPanel.classList.remove('active');
    }

    /**
     * Guarda la configuración actual
     */
    saveConfiguration() {
        const config = {
            sensitivity: parseInt(this.elements.sensitivitySlider.value),
            dampening: parseInt(this.elements.dampeningSlider.value),
            upperThreshold: parseInt(this.elements.upperThreshold.value),
            lowerThreshold: parseInt(this.elements.lowerThreshold.value),
            persistenceDuration: parseInt(this.elements.persistenceSlider.value),
            studentName: this.elements.studentName.value.trim()
        };

        // Aplicar amortiguación al analizador de audio en tiempo real
        // Mapeamos 0-100 a 0-0.95 (para evitar el bloqueo total en 1.0)
        if (this.audioAnalyzer) {
            this.audioAnalyzer.setSmoothingTimeConstant(config.dampening / 105);
        }

        // Aplicar amortiguación al analizador de audio en tiempo real
        // Mapeamos 0-100 a 0-0.95 (para evitar el bloqueo total en 1.0)
        if (this.audioAnalyzer) {
            this.audioAnalyzer.setSmoothingTimeConstant(config.dampening / 105);
        }

        // Actualizar StateManager
        this.stateManager.updateConfiguration(config);
        this.stateManager.setStudentName(config.studentName);

        // Guardar en localStorage
        this.storageManager.saveConfig(config);

        // Aplicar configuración de persistencia inmediatamente
        this.volumeHoldDuration = config.persistenceDuration;

        // Feedback visual
        this.elements.saveSettings.textContent = '✓ Guardado';
        setTimeout(() => {
            this.elements.saveSettings.textContent = 'Guardar Configuración';
        }, 2000);

        // Cerrar panel
        setTimeout(() => {
            this.closeSettings();
        }, 1500);

        console.log('💾 Configuración guardada:', config);
    }

    /**
     * Actualiza la vista previa de los umbrales
     */
    updateThresholdPreview() {
        const lower = parseInt(this.elements.lowerThreshold.value);
        const upper = parseInt(this.elements.upperThreshold.value);

        // Calcular porcentajes de cada zona
        const lowPercent = lower;
        const optimalPercent = upper - lower;
        const highPercent = 100 - upper;

        // Actualizar tamaños de las zonas
        this.elements.previewZoneLow.style.flex = lowPercent;
        this.elements.previewZoneOptimal.style.flex = optimalPercent;
        this.elements.previewZoneHigh.style.flex = highPercent;
    }


    /**
     * Muestra el resumen de la sesión
     */
    async showSessionSummary() {
        const summary = this.sessionTracker.endSession();

        if (!summary) {
            console.warn('No hay sesión activa para mostrar');
            return;
        }

        // Detener análisis
        this.stop();

        // Actualizar datos del modal
        this.elements.summaryTotalTime.textContent = this.sessionTracker.formatTime(summary.totalDuration);
        this.elements.summaryGreenTime.textContent = this.sessionTracker.formatTime(summary.greenZoneTime);

        const successRate = summary.totalDuration > 0
            ? Math.round((summary.greenZoneTime / summary.totalDuration) * 100)
            : 0;
        this.elements.summarySuccess.textContent = `${successRate}%`;
        this.elements.summaryPeak.textContent = `${summary.peakVolume} dB`;
        this.elements.summaryConsistency.textContent = `${summary.consistencyScore}%`;

        // Dibujar gráfico
        this.drawSummaryChart(summary);

        // Mostrar modal
        this.elements.sessionModal.classList.add('active');
    }

    /**
     * Dibuja el gráfico de resumen en canvas
     * @private
     */
    drawSummaryChart(summary) {
        const canvas = this.elements.summaryChart;
        const ctx = canvas.getContext('2d');

        // Limpiar canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Contar estados
        const stateCounts = {
            SILENT: 0,
            LOW: 0,
            OPTIMAL: 0,
            WARNING: 0,
            DANGER: 0
        };

        summary.stateHistory.forEach(entry => {
            if (stateCounts[entry.state] !== undefined) {
                stateCounts[entry.state]++;
            }
        });

        // Colores por estado
        const colors = {
            SILENT: '#333',
            LOW: '#3B82F6',
            OPTIMAL: '#10B981',
            WARNING: '#FBBF24',
            DANGER: '#EF4444'
        };

        // Dibujar barras
        const states = Object.keys(stateCounts);
        const maxCount = Math.max(...Object.values(stateCounts), 1);
        const barWidth = canvas.width / states.length - 20;
        const maxBarHeight = canvas.height - 40;

        states.forEach((state, index) => {
            const count = stateCounts[state];
            const barHeight = (count / maxCount) * maxBarHeight;
            const x = index * (barWidth + 20) + 10;
            const y = canvas.height - barHeight - 20;

            // Barra
            ctx.fillStyle = colors[state];
            ctx.fillRect(x, y, barWidth, barHeight);

            // Etiqueta
            ctx.fillStyle = '#333';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText(state, x + barWidth / 2, canvas.height - 5);

            // Valor
            if (count > 0) {
                ctx.fillText(count.toString(), x + barWidth / 2, y - 5);
            }
        });
    }

    /**
     * Cierra el modal de resumen
     */
    closeModal() {
        this.elements.sessionModal.classList.remove('active');
    }

    /**
     * Inicia una nueva sesión
     */
    startNewSession() {
        this.closeModal();
        this.stateManager.reset();
        this.sessionTracker.startSession();
        this.start();
    }

    /**
     * Muestra un error al usuario
     * @private
     */
    showError(message) {
        alert(`Error: ${message}`);
    }

    /**
     * Callback: Maneja errores de los servicios
     * @private
     */
    handleError(errorInfo) {
        console.error('Error en servicio:', errorInfo);

        if (errorInfo.message.includes('micrófono')) {
            this.showError('No se pudo acceder al micrófono. Por favor, verifica los permisos en tu navegador.');
        } else {
            this.showError(errorInfo.message);
        }
    }

    /**
     * Limpia recursos al cerrar la aplicación
     */
    destroy() {
        this.stop();
        this.audioAnalyzer.destroy();

        if (this.sessionTracker.isSessionActive()) {
            this.sessionTracker.endSession();
        }
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', async () => {
    const app = new EcoLogroApp();
    await app.init();

    // Exponer globalmente para debugging
    window.ecoLogroApp = app;
});

// Limpiar recursos al cerrar la página
window.addEventListener('beforeunload', () => {
    if (window.ecoLogroApp) {
        window.ecoLogroApp.destroy();
    }
});
