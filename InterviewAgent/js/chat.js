// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license.

// Global objects
var speechRecognizer
var avatarSynthesizer
var peerConnection
var peerConnectionDataChannel
var messages = []
var messageInitiated = false
var dataSources = []
var sentenceLevelPunctuations = [ '.', '?', '!', ':', ';', '。', '？', '！', '：', '；' ]
var enableDisplayTextAlignmentWithSpeech = true
var enableQuickReply = false
var quickReplies = [ 'Let me take a look.', 'Let me check.', 'One moment, please.' ]
var byodDocRegex = new RegExp(/\[doc(\d+)\]/g)
var isSpeaking = false
var isReconnecting = false
var speakingText = ""
var spokenTextQueue = []
var repeatSpeakingSentenceAfterReconnection = true
var sessionActive = false
var userClosedSession = false
var lastInteractionTime = new Date()
var lastSpeakTime
var imgUrl = ""
var conversationStarted = false
var config = {}

// Fallback config in case JSON file cannot be loaded due to CORS
// API keys should be set via environment variables or secure config
var fallbackConfig = {
    "azureSpeech": {
        "region": "swedencentral",
        "apiKey": "", // Will be loaded from environment
        "enablePrivateEndpoint": false,
        "privateEndpoint": ""
    },
    "azureOpenAI": {
        "endpoint": "https://faris-sweden.openai.azure.com/",
        "apiKey": "", // Will be loaded from environment
        "deploymentName": "gpt-4.1",
        "systemPrompt": "You are a Risk and Controls expert that supports various teams from a company to create a risk and controls self-assessment. In order to do that, you have to go through a thorough discussion with the team you are working with to deeply understand the process they are trying to create a risk assessment for. Ask as much questions and follow-up questions as you need until you have a full understanding of the process being discussed. Only ask 1-2 questions at a time when have questions on the process. Only use alphabets, numbers and punctuation in your response. Don't use symbols or markdown in your communication, and don't use short forms or abbreviations.",
        "enableOyd": false
    },
    "azureCognitiveSearch": {
        "endpoint": "",
        "apiKey": "", // Will be loaded from environment
        "indexName": ""
    },
    "speechConfig": {
        "sttLocales": "en-US",
        "ttsVoice": "en-US-AvaMultilingualNeural",
        "customVoiceEndpointId": "",
        "continuousConversation": true
    },
    "avatarConfig": {
        "character": "meg",
        "style": "business",
        "customized": false,
        "useBuiltInVoice": false,
        "autoReconnect": true,
        "useLocalVideoForIdle": false,
        "showSubtitles": true
    }
}

// Function to load environment variables for browser applications
function loadEnvironmentVariables() {
    // Try to get API keys from various sources in order of preference:
    // 1. URL query parameters (for development)
    // 2. localStorage (if previously stored)
    // 3. Prompt user if not available anywhere
    
    const urlParams = new URLSearchParams(window.location.search)
    
    // Azure Speech API Key
    let speechApiKey = urlParams.get('AZURE_SPEECH_API_KEY') || 
                      localStorage.getItem('AZURE_SPEECH_API_KEY') ||
                      (typeof process !== 'undefined' && process.env ? process.env.AZURE_SPEECH_API_KEY : '')
    
    // Azure OpenAI API Key  
    let openaiApiKey = urlParams.get('AZURE_OPENAI_API_KEY') || 
                      localStorage.getItem('AZURE_OPENAI_API_KEY') ||
                      (typeof process !== 'undefined' && process.env ? process.env.AZURE_OPENAI_API_KEY : '')
    
    // Azure Cognitive Search API Key
    let searchApiKey = urlParams.get('AZURE_SEARCH_API_KEY') || 
                      localStorage.getItem('AZURE_SEARCH_API_KEY') ||
                      (typeof process !== 'undefined' && process.env ? process.env.AZURE_SEARCH_API_KEY : '')
    
    // Security Note: Removed insecure JavaScript prompt() calls that showed API keys in plain text
    // API keys should be provided through:
    // 1. Environment variables (recommended for production)
    // 2. URL parameters (development only)
    // 3. localStorage (browser storage)
    // 4. Configuration UI form inputs (with password type fields)
    
    // Log warning if keys are missing in development environment
    if ((window.location.hostname === 'localhost' || window.location.protocol === 'file:')) {
        if (!speechApiKey) {
            console.warn('⚠️ Azure Speech API Key not found. Please set it via environment variables, URL parameters, or the configuration form.')
        }
        if (!openaiApiKey) {
            console.warn('⚠️ Azure OpenAI API Key not found. Please set it via environment variables, URL parameters, or the configuration form.')
        }
    }
    
    return {
        speechApiKey: speechApiKey || '',
        openaiApiKey: openaiApiKey || '',
        searchApiKey: searchApiKey || ''
    }
}

// Load configuration from JSON file
async function loadConfig() {
    // First, load environment variables
    const envVars = loadEnvironmentVariables()
    
    try {
        const response = await fetch('./config.json')
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const text = await response.text()
        console.log('Config file loaded:', text)
        
        config = JSON.parse(text)
        
        // Override API keys with environment variables if available
        if (envVars.speechApiKey) {
            config.azureSpeech.apiKey = envVars.speechApiKey
        }
        if (envVars.openaiApiKey) {
            config.azureOpenAI.apiKey = envVars.openaiApiKey
        }
        if (envVars.searchApiKey) {
            config.azureCognitiveSearch.apiKey = envVars.searchApiKey
        }
        
        populateConfigElements()
        updateStatus('Configuration loaded successfully from config.json with environment variables')
    } catch (error) {
        console.error('Error loading config from file:', error)
        
        // Use fallback configuration when JSON file cannot be loaded
        console.log('Using fallback configuration...')
        config = fallbackConfig
        
        // Apply environment variables to fallback config
        if (envVars.speechApiKey) {
            config.azureSpeech.apiKey = envVars.speechApiKey
        }
        if (envVars.openaiApiKey) {
            config.azureOpenAI.apiKey = envVars.openaiApiKey
        }
        if (envVars.searchApiKey) {
            config.azureCognitiveSearch.apiKey = envVars.searchApiKey
        }
        
        populateConfigElements()
        
        // Provide more specific error message but still continue with fallback
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            updateStatus('Using built-in configuration with environment variables (config.json not accessible via file://)')
        } else if (error.name === 'SyntaxError') {
            updateStatus('Error: Invalid JSON in config.json file. Using built-in configuration with environment variables.')
        } else {
            updateStatus('Using built-in configuration with environment variables (config.json not found)')
        }
    }
    
    // Perform detailed configuration validation
    const validationResults = validateConfiguration()
    if (validationResults.length > 0) {
        updateStatus('⚠️ Configuration issues found: ' + validationResults.join(' | '))
    }
}

// Comprehensive configuration validation function
function validateConfiguration() {
    const issues = []
    
    // Validate Azure Speech configuration
    if (!config.azureSpeech) {
        issues.push('Azure Speech config missing')
    } else {
        if (!config.azureSpeech.region || config.azureSpeech.region.trim() === '') {
            issues.push('Azure Speech region not set')
        }
        if (!config.azureSpeech.apiKey || config.azureSpeech.apiKey.trim() === '') {
            issues.push('Azure Speech API key missing (set AZURE_SPEECH_API_KEY)')
        }
        if (config.azureSpeech.enablePrivateEndpoint && (!config.azureSpeech.privateEndpoint || config.azureSpeech.privateEndpoint.trim() === '')) {
            issues.push('Private endpoint enabled but URL not configured')
        }
    }
    
    // Validate Azure OpenAI configuration
    if (!config.azureOpenAI) {
        issues.push('Azure OpenAI config missing')
    } else {
        if (!config.azureOpenAI.endpoint || config.azureOpenAI.endpoint.trim() === '') {
            issues.push('Azure OpenAI endpoint not set')
        } else if (!isValidUrl(config.azureOpenAI.endpoint)) {
            issues.push('Azure OpenAI endpoint is not a valid URL')
        }
        if (!config.azureOpenAI.apiKey || config.azureOpenAI.apiKey.trim() === '') {
            issues.push('Azure OpenAI API key missing (set AZURE_OPENAI_API_KEY)')
        }
        if (!config.azureOpenAI.deploymentName || config.azureOpenAI.deploymentName.trim() === '') {
            issues.push('Azure OpenAI deployment name not set')
        }
        if (!config.azureOpenAI.systemPrompt || config.azureOpenAI.systemPrompt.trim() === '') {
            issues.push('System prompt not configured')
        }
    }
    
    // Validate Azure Cognitive Search (if enabled)
    if (config.azureOpenAI?.enableOyd) {
        if (!config.azureCognitiveSearch) {
            issues.push('Cognitive Search config missing (required for OYD)')
        } else {
            if (!config.azureCognitiveSearch.endpoint || config.azureCognitiveSearch.endpoint.trim() === '') {
                issues.push('Cognitive Search endpoint not set (required for OYD)')
            } else if (!isValidUrl(config.azureCognitiveSearch.endpoint)) {
                issues.push('Cognitive Search endpoint is not a valid URL')
            }
            if (!config.azureCognitiveSearch.apiKey || config.azureCognitiveSearch.apiKey.trim() === '') {
                issues.push('Cognitive Search API key missing (set AZURE_SEARCH_API_KEY)')
            }
            if (!config.azureCognitiveSearch.indexName || config.azureCognitiveSearch.indexName.trim() === '') {
                issues.push('Cognitive Search index name not set')
            }
        }
    }
    
    // Validate Speech configuration
    if (!config.speechConfig) {
        issues.push('Speech config missing')
    } else {
        if (!config.speechConfig.sttLocales || config.speechConfig.sttLocales.trim() === '') {
            issues.push('Speech-to-text locales not configured')
        }
        if (!config.speechConfig.ttsVoice || config.speechConfig.ttsVoice.trim() === '') {
            issues.push('Text-to-speech voice not configured')
        }
    }
    
    // Validate Avatar configuration
    if (!config.avatarConfig) {
        issues.push('Avatar config missing')
    } else {
        if (!config.avatarConfig.character || config.avatarConfig.character.trim() === '') {
            issues.push('Avatar character not set')
        }
        if (!config.avatarConfig.style || config.avatarConfig.style.trim() === '') {
            issues.push('Avatar style not set')
        }
    }
    
    return issues
}

// Helper function to validate URLs
function isValidUrl(string) {
    try {
        new URL(string)
        return true
    } catch (_) {
        return false
    }
}

// Populate hidden form elements with config values
function populateConfigElements() {
    document.getElementById('region').value = config.azureSpeech.region
    document.getElementById('APIKey').value = config.azureSpeech.apiKey
    document.getElementById('enablePrivateEndpoint').checked = config.azureSpeech.enablePrivateEndpoint
    document.getElementById('privateEndpoint').value = config.azureSpeech.privateEndpoint
    
    document.getElementById('azureOpenAIEndpoint').value = config.azureOpenAI.endpoint
    document.getElementById('azureOpenAIApiKey').value = config.azureOpenAI.apiKey
    document.getElementById('azureOpenAIDeploymentName').value = config.azureOpenAI.deploymentName
    document.getElementById('prompt').value = config.azureOpenAI.systemPrompt
    document.getElementById('enableOyd').checked = config.azureOpenAI.enableOyd
    
    document.getElementById('azureCogSearchEndpoint').value = config.azureCognitiveSearch.endpoint
    document.getElementById('azureCogSearchApiKey').value = config.azureCognitiveSearch.apiKey
    document.getElementById('azureCogSearchIndexName').value = config.azureCognitiveSearch.indexName
    
    document.getElementById('sttLocales').value = config.speechConfig.sttLocales
    document.getElementById('ttsVoice').value = config.speechConfig.ttsVoice
    document.getElementById('customVoiceEndpointId').value = config.speechConfig.customVoiceEndpointId
    document.getElementById('continuousConversation').checked = config.speechConfig.continuousConversation
    
    document.getElementById('talkingAvatarCharacter').value = config.avatarConfig.character
    document.getElementById('talkingAvatarStyle').value = config.avatarConfig.style
    document.getElementById('customizedAvatar').checked = config.avatarConfig.customized
    document.getElementById('useBuiltInVoice').checked = config.avatarConfig.useBuiltInVoice
    document.getElementById('autoReconnectAvatar').checked = config.avatarConfig.autoReconnect
    document.getElementById('useLocalVideoForIdle').checked = config.avatarConfig.useLocalVideoForIdle
    document.getElementById('showSubtitles').checked = config.avatarConfig.showSubtitles
}

// Update status message
function updateStatus(message) {
    const statusElement = document.getElementById('status')
    if (statusElement) {
        statusElement.textContent = message
    }
}

// Start conversation - this replaces the old startSession function
window.startConversation = async function() {
    updateStatus('Starting conversation...')
    lastInteractionTime = new Date()
    userClosedSession = false
    
    // Disable start button, enable others
    document.getElementById('startConversation').disabled = true
    document.getElementById('endConversation').disabled = false
    
    try {
        await connectAvatar()
        conversationStarted = true
        updateStatus('🎤 Listening... Speak to start chatting with the avatar!')
        
        // Change the start button text to indicate it's active
        document.getElementById('startConversation').textContent = 'Conversation Active'
        document.getElementById('startConversation').style.backgroundColor = '#107c10'
    } catch (error) {
        console.error('Error starting conversation:', error)
        updateStatus('❌ Error starting conversation: ' + error.message)
        document.getElementById('startConversation').disabled = false
        document.getElementById('endConversation').disabled = true
    }
}

// End conversation
window.endConversation = function() {
    updateStatus('Ending conversation...')
    lastInteractionTime = new Date()
    
    document.getElementById('startConversation').disabled = false
    document.getElementById('endConversation').disabled = true
    document.getElementById('stopSpeaking').disabled = true
    
    // Reset the start button
    document.getElementById('startConversation').textContent = 'Start Conversation'
    document.getElementById('startConversation').style.backgroundColor = '#0078d4'
    
    userClosedSession = true
    conversationStarted = false
    disconnectAvatar()
    
    updateStatus('Ready to start conversation')
}

// Clear conversation history
window.clearHistory = function() {
    try {
        // Clear the visual chat history
        const chatHistoryElement = document.getElementById('chatHistory')
        if (chatHistoryElement) {
            chatHistoryElement.innerHTML = ''
        }
        
        // Clear the messages array
        messages = []
        
        // Clear any spoken text queue
        spokenTextQueue = []
        
        // Reset speaking state
        isSpeaking = false
        speakingText = ""
        
        // Update status to confirm action
        updateStatus('📝 Conversation history cleared')
        
        // Reset status back to ready after a brief moment
        setTimeout(() => {
            if (!conversationStarted) {
                updateStatus('Ready to start conversation')
            }
        }, 2000)
        
        console.log('Conversation history cleared successfully')
    } catch (error) {
        console.error('Error clearing history:', error)
        updateStatus('❌ Error clearing history')
    }
}

// Connect to avatar service
function connectAvatar() {
    const cogSvcRegion = document.getElementById('region').value
    const cogSvcSubKey = document.getElementById('APIKey').value
    if (cogSvcSubKey === '') {
        updateStatus('❌ Azure Speech API key is missing - please set AZURE_SPEECH_API_KEY environment variable or add to config.json')
        return Promise.reject('Azure Speech API key not configured. Check your configuration setup.')
    }

    const privateEndpointEnabled = document.getElementById('enablePrivateEndpoint').checked
    const privateEndpoint = document.getElementById('privateEndpoint').value.slice(8)
    if (privateEndpointEnabled && privateEndpoint === '') {
        updateStatus('❌ Private endpoint is enabled but URL not configured - please set privateEndpoint in config.json')
        return Promise.reject('Private endpoint enabled but URL not configured in config.json.')
    }

    let speechSynthesisConfig
    if (privateEndpointEnabled) {
        speechSynthesisConfig = SpeechSDK.SpeechConfig.fromEndpoint(new URL(`wss://${privateEndpoint}/tts/cognitiveservices/websocket/v1?enableTalkingAvatar=true`), cogSvcSubKey) 
    } else {
        speechSynthesisConfig = SpeechSDK.SpeechConfig.fromSubscription(cogSvcSubKey, cogSvcRegion)
    }
    speechSynthesisConfig.endpointId = document.getElementById('customVoiceEndpointId').value

    const talkingAvatarCharacter = document.getElementById('talkingAvatarCharacter').value
    const talkingAvatarStyle = document.getElementById('talkingAvatarStyle').value
    const avatarConfig = new SpeechSDK.AvatarConfig(talkingAvatarCharacter, talkingAvatarStyle)
    avatarConfig.customized = document.getElementById('customizedAvatar').checked
    avatarConfig.useBuiltInVoice = document.getElementById('useBuiltInVoice').checked
    avatarSynthesizer = new SpeechSDK.AvatarSynthesizer(speechSynthesisConfig, avatarConfig)
    avatarSynthesizer.avatarEventReceived = function (s, e) {
        var offsetMessage = ", offset from session start: " + e.offset / 10000 + "ms."
        if (e.offset === 0) {
            offsetMessage = ""
        }

        console.log("Event received: " + e.description + offsetMessage)
    }

    let speechRecognitionConfig
    if (privateEndpointEnabled) {
        speechRecognitionConfig = SpeechSDK.SpeechConfig.fromEndpoint(new URL(`wss://${privateEndpoint}/stt/speech/universal/v2`), cogSvcSubKey) 
    } else {
        speechRecognitionConfig = SpeechSDK.SpeechConfig.fromEndpoint(new URL(`wss://${cogSvcRegion}.stt.speech.microsoft.com/speech/universal/v2`), cogSvcSubKey)
    }
    speechRecognitionConfig.setProperty(SpeechSDK.PropertyId.SpeechServiceConnection_LanguageIdMode, "Continuous")
    var sttLocales = document.getElementById('sttLocales').value.split(',')
    var autoDetectSourceLanguageConfig = SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages(sttLocales)
    speechRecognizer = SpeechSDK.SpeechRecognizer.FromConfig(speechRecognitionConfig, autoDetectSourceLanguageConfig, SpeechSDK.AudioConfig.fromDefaultMicrophoneInput())

    // Setup continuous recognition for hands-free conversation
    if (document.getElementById('continuousConversation').checked) {
        speechRecognizer.recognized = function (s, e) {
            if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech && e.result.text.trim() !== '') {
                console.log('Recognized: ' + e.result.text)
                updateStatus('🗣️ You said: "' + e.result.text + '" - Processing...')
                handleUserQuery(e.result.text, e.result.text, '')
            }
        }
        
        // Add speech recognition event handlers for better user feedback
        speechRecognizer.recognizing = function (s, e) {
            if (e.result.text.trim() !== '') {
                updateStatus('🎤 Listening... "' + e.result.text + '"')
            }
        }
        
        speechRecognizer.sessionStopped = function (s, e) {
            console.log('Speech recognition session stopped')
        }
        
        speechRecognizer.canceled = function (s, e) {
            console.log('Speech recognition canceled: ' + e.errorDetails)
        }

        speechRecognizer.startContinuousRecognitionAsync(
            () => {
                console.log('Continuous recognition started')
                updateStatus('🎤 Listening... Start speaking to chat with the avatar!')
            },
            (err) => {
                console.error('Error starting continuous recognition: ' + err)
                updateStatus('❌ Error starting speech recognition: ' + err)
            }
        )
    }

    const azureOpenAIEndpoint = document.getElementById('azureOpenAIEndpoint').value
    const azureOpenAIApiKey = document.getElementById('azureOpenAIApiKey').value
    const azureOpenAIDeploymentName = document.getElementById('azureOpenAIDeploymentName').value
    
    // Detailed Azure OpenAI validation
    if (azureOpenAIEndpoint === '') {
        updateStatus('❌ Azure OpenAI endpoint is missing - please set endpoint in config.json')
        return Promise.reject('Azure OpenAI endpoint not configured in config.json.')
    }
    if (azureOpenAIApiKey === '') {
        updateStatus('❌ Azure OpenAI API key is missing - please set AZURE_OPENAI_API_KEY environment variable or add to config.json')
        return Promise.reject('Azure OpenAI API key not configured. Check your configuration setup.')
    }
    if (azureOpenAIDeploymentName === '') {
        updateStatus('❌ Azure OpenAI deployment name is missing - please set deploymentName in config.json')
        return Promise.reject('Azure OpenAI deployment name not configured in config.json.')
    }

    dataSources = []
    if (document.getElementById('enableOyd').checked) {
        const azureCogSearchEndpoint = document.getElementById('azureCogSearchEndpoint').value
        const azureCogSearchApiKey = document.getElementById('azureCogSearchApiKey').value
        const azureCogSearchIndexName = document.getElementById('azureCogSearchIndexName').value
        
        // Detailed Azure Cognitive Search validation
        if (azureCogSearchEndpoint === "") {
            updateStatus('❌ Cognitive Search endpoint is missing - please set endpoint in config.json (required for On Your Data)')
            return Promise.reject('Azure Cognitive Search endpoint not configured but required for On Your Data feature.')
        }
        if (azureCogSearchApiKey === "") {
            updateStatus('❌ Cognitive Search API key is missing - please set AZURE_SEARCH_API_KEY environment variable (required for On Your Data)')
            return Promise.reject('Azure Cognitive Search API key not configured but required for On Your Data feature.')
        }
        if (azureCogSearchIndexName === "") {
            updateStatus('❌ Cognitive Search index name is missing - please set indexName in config.json (required for On Your Data)')
            return Promise.reject('Azure Cognitive Search index name not configured but required for On Your Data feature.')
        }
        
        setDataSources(azureCogSearchEndpoint, azureCogSearchApiKey, azureCogSearchIndexName)
    }

    // Only initialize messages once
    if (!messageInitiated) {
        initMessages()
        messageInitiated = true
    }

    const xhr = new XMLHttpRequest()
    if (privateEndpointEnabled) {
        xhr.open("GET", `https://${privateEndpoint}/tts/cognitiveservices/avatar/relay/token/v1`)
    } else {
        xhr.open("GET", `https://${cogSvcRegion}.tts.speech.microsoft.com/cognitiveservices/avatar/relay/token/v1`)
    }
    xhr.setRequestHeader("Ocp-Apim-Subscription-Key", cogSvcSubKey)
    
    return new Promise((resolve, reject) => {
        xhr.addEventListener("readystatechange", function() {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    const responseData = JSON.parse(this.responseText)
                    const iceServerUrl = responseData.Urls[0]
                    const iceServerUsername = responseData.Username
                    const iceServerCredential = responseData.Password
                    setupWebRTC(iceServerUrl, iceServerUsername, iceServerCredential, resolve, reject)
                } else {
                    reject('Failed to get avatar token')
                }
            }
        })
        xhr.send()
    })
}

// Disconnect from avatar service
function disconnectAvatar() {
    try {
        // Stop speech recognizer first
        if (speechRecognizer !== undefined) {
            speechRecognizer.stopContinuousRecognitionAsync(
                () => {
                    console.log('Speech recognition stopped successfully')
                    speechRecognizer.close()
                    speechRecognizer = undefined
                },
                (err) => {
                    console.error('Error stopping speech recognition:', err)
                    speechRecognizer.close()
                    speechRecognizer = undefined
                }
            )
        }

        // Stop avatar synthesizer
        if (avatarSynthesizer !== undefined) {
            avatarSynthesizer.close()
            avatarSynthesizer = undefined
        }

        // Close WebRTC peer connection
        if (peerConnection !== undefined) {
            peerConnection.close()
            peerConnection = undefined
        }

        // Clear video/audio elements
        const remoteVideo = document.getElementById('remoteVideo')
        if (remoteVideo) {
            remoteVideo.innerHTML = ''
        }

        // Reset global states
        sessionActive = false
        isSpeaking = false
        conversationStarted = false
        
        console.log('Avatar session disconnected successfully')
    } catch (error) {
        console.error('Error during disconnect:', error)
    }
}

// Setup WebRTC
function setupWebRTC(iceServerUrl, iceServerUsername, iceServerCredential, resolve, reject) {
    // Create WebRTC peer connection
    peerConnection = new RTCPeerConnection({
        iceServers: [{
            urls: [ iceServerUrl ],
            username: iceServerUsername,
            credential: iceServerCredential
        }]
    })

    // Fetch WebRTC video stream and mount it to an HTML video element
    peerConnection.ontrack = function (event) {
        if (event.track.kind === 'audio') {
            let audioElement = document.createElement('audio')
            audioElement.id = 'audioPlayer'
            audioElement.srcObject = event.streams[0]
            audioElement.autoplay = true

            audioElement.onplaying = () => {
                console.log(`WebRTC ${event.track.kind} channel connected.`)
            }

            // Clean up existing audio element if there is any
            remoteVideoDiv = document.getElementById('remoteVideo')
            for (var i = 0; i < remoteVideoDiv.childNodes.length; i++) {
                if (remoteVideoDiv.childNodes[i].localName === event.track.kind) {
                    remoteVideoDiv.removeChild(remoteVideoDiv.childNodes[i])
                }
            }

            // Append the new audio element
            document.getElementById('remoteVideo').appendChild(audioElement)
        }

        if (event.track.kind === 'video') {
            let videoElement = document.createElement('video')
            videoElement.id = 'videoPlayer'
            videoElement.srcObject = event.streams[0]
            videoElement.autoplay = true
            videoElement.playsInline = true
            videoElement.style.width = '0.5px'
            document.getElementById('remoteVideo').appendChild(videoElement)

            // Continue speaking if there are unfinished sentences
            if (repeatSpeakingSentenceAfterReconnection) {
                if (speakingText !== '') {
                    speakNext(speakingText, 0, true)
                }
            } else {
                if (spokenTextQueue.length > 0) {
                    speakNext(spokenTextQueue.shift())
                }
            }

            videoElement.onplaying = () => {
                // Clean up existing video element if there is any
                remoteVideoDiv = document.getElementById('remoteVideo')
                for (var i = 0; i < remoteVideoDiv.childNodes.length; i++) {
                    if (remoteVideoDiv.childNodes[i].localName === event.track.kind) {
                        remoteVideoDiv.removeChild(remoteVideoDiv.childNodes[i])
                    }
                }

                // Append the new video element
                videoElement.style.width = '960px'
                document.getElementById('remoteVideo').appendChild(videoElement)

                console.log(`WebRTC ${event.track.kind} channel connected.`)
                document.getElementById('stopSpeaking').disabled = false
                document.getElementById('remoteVideo').style.width = '960px'
                document.getElementById('chatHistory').hidden = false

                if (document.getElementById('useLocalVideoForIdle').checked) {
                    document.getElementById('localVideo').hidden = true
                    if (lastSpeakTime === undefined) {
                        lastSpeakTime = new Date()
                    }
                }

                isReconnecting = false
                setTimeout(() => { 
                    sessionActive = true
                    resolve() // Resolve the promise when avatar is ready
                }, 1000) // Set session active after 1 second
            }
        }
    }
    
     // Listen to data channel, to get the event from the server
    peerConnection.addEventListener("datachannel", event => {
        peerConnectionDataChannel = event.channel
        peerConnectionDataChannel.onmessage = e => {
            let subtitles = document.getElementById('subtitles')
            const webRTCEvent = JSON.parse(e.data)
            if (webRTCEvent.event.eventType === 'EVENT_TYPE_TURN_START' && document.getElementById('showSubtitles').checked) {
                subtitles.hidden = false
                subtitles.innerHTML = speakingText
            } else if (webRTCEvent.event.eventType === 'EVENT_TYPE_SESSION_END' || webRTCEvent.event.eventType === 'EVENT_TYPE_SWITCH_TO_IDLE') {
                subtitles.hidden = true
                if (webRTCEvent.event.eventType === 'EVENT_TYPE_SESSION_END') {
                    if (document.getElementById('autoReconnectAvatar').checked && !userClosedSession && !isReconnecting) {
                        // No longer reconnect when there is no interaction for a while
                        if (new Date() - lastInteractionTime < 300000) {
                            // Session disconnected unexpectedly, need reconnect
                            console.log(`[${(new Date()).toISOString()}] The WebSockets got disconnected, need reconnect.`)
                            isReconnecting = true

                            // Remove data channel onmessage callback to avoid duplicatedly triggering reconnect
                            peerConnectionDataChannel.onmessage = null

                            // Release the existing avatar connection
                            if (avatarSynthesizer !== undefined) {
                                avatarSynthesizer.close()
                            }

                            // Setup a new avatar connection
                            connectAvatar()
                        }
                    }
                }
            }

            console.log("[" + (new Date()).toISOString() + "] WebRTC event received: " + e.data)
        }
    })

    // This is a workaround to make sure the data channel listening is working by creating a data channel from the client side
    c = peerConnection.createDataChannel("eventChannel")

    // Make necessary update to the web page when the connection state changes
    peerConnection.oniceconnectionstatechange = e => {
        console.log("WebRTC status: " + peerConnection.iceConnectionState)
        if (peerConnection.iceConnectionState === 'disconnected') {
            if (document.getElementById('useLocalVideoForIdle').checked) {
                document.getElementById('localVideo').hidden = false
                document.getElementById('remoteVideo').style.width = '0.1px'
            }
        }
    }

    // Offer to receive 1 audio, and 1 video track
    peerConnection.addTransceiver('video', { direction: 'sendrecv' })
    peerConnection.addTransceiver('audio', { direction: 'sendrecv' })

    // start avatar, establish WebRTC connection
    avatarSynthesizer.startAvatarAsync(peerConnection).then((r) => {
        if (r.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            console.log("[" + (new Date()).toISOString() + "] Avatar started. Result ID: " + r.resultId)
            // Note: resolve will be called in the video onplaying event handler
        } else {
            console.log("[" + (new Date()).toISOString() + "] Unable to start avatar. Result ID: " + r.resultId)
            if (r.reason === SpeechSDK.ResultReason.Canceled) {
                let cancellationDetails = SpeechSDK.CancellationDetails.fromResult(r)
                if (cancellationDetails.reason === SpeechSDK.CancellationReason.Error) {
                    console.log(cancellationDetails.errorDetails)
                };

                console.log("Unable to start avatar: " + cancellationDetails.errorDetails);
            }
            reject(new Error("Unable to start avatar: " + (r.reason === SpeechSDK.ResultReason.Canceled ? 
                SpeechSDK.CancellationDetails.fromResult(r).errorDetails : 
                "Unknown error")))
        }
    }).catch(
        (error) => {
            console.log("[" + (new Date()).toISOString() + "] Avatar failed to start. Error: " + error)
            reject(error)
        }
    )
}

// Initialize messages
function initMessages() {
    messages = []

    if (dataSources.length === 0) {
        let systemPrompt = document.getElementById('prompt').value
        // Append PDF content to system prompt if available
        if (pdfExtractedText && pdfExtractedText.trim() !== '') {
            systemPrompt += `\n\n--- BACKGROUND CONTEXT FROM PDF ---\nThe following content has been extracted from the uploaded PDF file "${pdfFileName}" and should be used as background context for your responses:\n\n${pdfExtractedText}\n\n--- END OF PDF CONTEXT ---\n\nUse this information as background knowledge to understand the process before generating any questions.`
        }      
        let systemMessage = {
            role: 'system',
            content: systemPrompt
        }

        messages.push(systemMessage)
    }
}

// Set data sources for chat API
function setDataSources(azureCogSearchEndpoint, azureCogSearchApiKey, azureCogSearchIndexName) {
    let dataSource = {
        type: 'AzureCognitiveSearch',
        parameters: {
            endpoint: azureCogSearchEndpoint,
            key: azureCogSearchApiKey,
            indexName: azureCogSearchIndexName,
            semanticConfiguration: '',
            queryType: 'simple',
            fieldsMapping: {
                contentFieldsSeparator: '\n',
                contentFields: ['content'],
                filepathField: null,
                titleField: 'title',
                urlField: null
            },
            inScope: true,
            roleInformation: document.getElementById('prompt').value
        }
    }

    dataSources.push(dataSource)
}

// Do HTML encoding on given text
function htmlEncode(text) {
    const entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    };

    return String(text).replace(/[&<>"'\/]/g, (match) => entityMap[match])
}

// Speak the given text
function speak(text, endingSilenceMs = 0) {
    if (isSpeaking) {
        spokenTextQueue.push(text)
        return
    }

    speakNext(text, endingSilenceMs)
}

function speakNext(text, endingSilenceMs = 0, skipUpdatingChatHistory = false) {
    let ttsVoice = document.getElementById('ttsVoice').value
     let ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='en-US'><voice name='${ttsVoice}'><mstts:leadingsilence-exact value='0'/>${htmlEncode(text)}</voice></speak>`
    if (endingSilenceMs > 0) {
        ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='en-US'><voice name='${ttsVoice}'><mstts:leadingsilence-exact value='0'/>${htmlEncode(text)}<break time='${endingSilenceMs}ms' /></voice></speak>`
    }

    if (enableDisplayTextAlignmentWithSpeech && !skipUpdatingChatHistory) {
        let chatHistoryTextArea = document.getElementById('chatHistory')
        chatHistoryTextArea.innerHTML += text.replace(/\n/g, '<br/>')
        chatHistoryTextArea.scrollTop = chatHistoryTextArea.scrollHeight
    }

    lastSpeakTime = new Date()
    isSpeaking = true
    speakingText = text
    document.getElementById('stopSpeaking').disabled = false
    
    // Check if avatarSynthesizer exists before trying to speak
    if (!avatarSynthesizer) {
        console.log("Avatar synthesizer not initialized yet")
        isSpeaking = false
        return
    }
    
    avatarSynthesizer.speakSsmlAsync(ssml).then(
        (result) => {
            if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
                console.log(`Speech synthesized to speaker for text [ ${text} ]. Result ID: ${result.resultId}`)
                lastSpeakTime = new Date()
            } else {
                console.log(`Error occurred while speaking the SSML. Result ID: ${result.resultId}`)
            }

            speakingText = ''

            if (spokenTextQueue.length > 0) {
                speakNext(spokenTextQueue.shift())
            } else {
                isSpeaking = false
                document.getElementById('stopSpeaking').disabled = true
            }
        }).catch(
            (error) => {
                console.log(`Error occurred while speaking the SSML: [ ${error} ]`)

                speakingText = ''

                if (spokenTextQueue.length > 0) {
                    speakNext(spokenTextQueue.shift())
                } else {
                    isSpeaking = false
                    document.getElementById('stopSpeaking').disabled = true
                }
            }
        )
}

// Stop speaking function - make it globally accessible
window.stopSpeaking = function() {
    lastInteractionTime = new Date()
    spokenTextQueue = []
    
    // Check if avatarSynthesizer exists before trying to stop speaking
    if (!avatarSynthesizer) {
        console.log("Avatar synthesizer not initialized yet")
        document.getElementById('stopSpeaking').disabled = true
        return
    }
    
    avatarSynthesizer.stopSpeakingAsync().then(
        () => {
            isSpeaking = false
            document.getElementById('stopSpeaking').disabled = true
            console.log("[" + (new Date()).toISOString() + "] Stop speaking request sent.")
        }
    ).catch(
        (error) => {
            console.log("Error occurred while stopping speaking: " + error)
        }
    )
}

function handleUserQuery(userQuery, userQueryHTML, imgUrlPath) {
    lastInteractionTime = new Date()
    let contentMessage = userQuery
    if (imgUrlPath.trim()) {
        contentMessage = [  
            { 
                "type": "text", 
                "text": userQuery 
            },
            { 
                "type": "image_url",
                "image_url": {
                    "url": imgUrlPath
                }
            }
        ]
    }
    let chatMessage = {
        role: 'user',
        content: contentMessage
    }

    messages.push(chatMessage)
    let chatHistoryTextArea = document.getElementById('chatHistory')
    if (chatHistoryTextArea.innerHTML !== '' && !chatHistoryTextArea.innerHTML.endsWith('\n\n')) {
        chatHistoryTextArea.innerHTML += '\n\n'
    }

    chatHistoryTextArea.innerHTML += imgUrlPath.trim() ? "<br/><br/>User: " + userQueryHTML : "<br/><br/>User: " + userQuery + "<br/>";
        
    chatHistoryTextArea.scrollTop = chatHistoryTextArea.scrollHeight

    // Stop previous speaking if there is any
    if (isSpeaking) {
        window.stopSpeaking()
    }

    // For 'bring your data' scenario, chat API currently has long (4s+) latency
    // We return some quick reply here before the chat API returns to mitigate.
    if (dataSources.length > 0 && enableQuickReply) {
        speak(getQuickReply(), 2000)
    }

    const azureOpenAIEndpoint = document.getElementById('azureOpenAIEndpoint').value
    const azureOpenAIApiKey = document.getElementById('azureOpenAIApiKey').value
    const azureOpenAIDeploymentName = document.getElementById('azureOpenAIDeploymentName').value

    let url = "{AOAIEndpoint}/openai/deployments/{AOAIDeployment}/chat/completions?api-version=2023-06-01-preview".replace("{AOAIEndpoint}", azureOpenAIEndpoint).replace("{AOAIDeployment}", azureOpenAIDeploymentName)
    let body = JSON.stringify({
        messages: messages,
        tools: functionDefinitions,
        tool_choice: "auto",
        stream: true
    })

    if (dataSources.length > 0) {
        url = "{AOAIEndpoint}/openai/deployments/{AOAIDeployment}/extensions/chat/completions?api-version=2023-06-01-preview".replace("{AOAIEndpoint}", azureOpenAIEndpoint).replace("{AOAIDeployment}", azureOpenAIDeploymentName)
        body = JSON.stringify({
            dataSources: dataSources,
            messages: messages,
            tools: functionDefinitions,
            tool_choice: "auto",
            stream: true
        })
    }

    let assistantReply = ''
    let toolContent = ''
    let spokenSentence = ''
    let displaySentence = ''
    let accumulatedToolCalls = {} // To accumulate tool call data

    fetch(url, {
        method: 'POST',
        headers: {
            'api-key': azureOpenAIApiKey,
            'Content-Type': 'application/json'
        },
        body: body
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Chat API response status: ${response.status} ${response.statusText}`)
        }

        let chatHistoryTextArea = document.getElementById('chatHistory')
        chatHistoryTextArea.innerHTML += imgUrlPath.trim() ? 'Assistant: ':'<br/>Assistant: '

        const reader = response.body.getReader()

        // Function to recursively read chunks from the stream
        function read(previousChunkString = '') {
            return reader.read().then(({ value, done }) => {
                // Check if there is still data to read
                if (done) {
                    // Stream complete
                    return
                }

                // Process the chunk of data (value)
                let chunkString = new TextDecoder().decode(value, { stream: true })
                if (previousChunkString !== '') {
                    // Concatenate the previous chunk string in case it is incomplete
                    chunkString = previousChunkString + chunkString
                }

                if (!chunkString.endsWith('}\n\n') && !chunkString.endsWith('[DONE]\n\n')) {
                    // This is a incomplete chunk, read the next chunk
                    return read(chunkString)
                }

                chunkString.split('\n\n').forEach((line) => {
                    try {
                        if (line.startsWith('data:') && !line.endsWith('[DONE]')) {
                            const responseJson = JSON.parse(line.substring(5).trim())
                            let responseToken = undefined
                            if (dataSources.length === 0) {
                                // Handle standard chat completions
                                const delta = responseJson.choices[0].delta
                                
                                if (delta.tool_calls) {
                                    // Process function calls - accumulate data until complete
                                    console.log("Received tool call delta:", delta.tool_calls)
                                    
                                    for (const toolCall of delta.tool_calls) {
                                        const index = toolCall.index
                                        
                                        if (!accumulatedToolCalls[index]) {
                                            accumulatedToolCalls[index] = {
                                                id: '',
                                                type: 'function',
                                                function: {
                                                    name: '',
                                                    arguments: ''
                                                }
                                            }
                                        }
                                        
                                        // Accumulate the tool call data
                                        if (toolCall.id) {
                                            accumulatedToolCalls[index].id = toolCall.id
                                        }
                                        if (toolCall.function) {
                                            if (toolCall.function.name) {
                                                accumulatedToolCalls[index].function.name += toolCall.function.name
                                            }
                                            if (toolCall.function.arguments) {
                                                accumulatedToolCalls[index].function.arguments += toolCall.function.arguments
                                            }
                                        }
                                        
                                        console.log(`Accumulated tool call ${index}:`, accumulatedToolCalls[index])
                                    }
                                } else {
                                    responseToken = delta.content
                                }
                            } else {
                                // Handle extensions chat completions
                                let role = responseJson.choices[0].messages[0].delta.role
                                if (role === 'tool') {
                                    toolContent = responseJson.choices[0].messages[0].delta.content
                                } else {
                                    responseToken = responseJson.choices[0].messages[0].delta.content
                                    if (responseToken !== undefined) {
                                        if (byodDocRegex.test(responseToken)) {
                                            responseToken = responseToken.replace(byodDocRegex, '').trim()
                                        }

                                        if (responseToken === '[DONE]') {
                                            responseToken = undefined
                                        }
                                    }
                                }
                            }

                            if (responseToken !== undefined && responseToken !== null) {
                                assistantReply += responseToken // build up the assistant message
                                displaySentence += responseToken // build up the display sentence

                                // console.log(`Current token: ${responseToken}`)

                                if (responseToken === '\n' || responseToken === '\n\n') {
                                    spokenSentence += responseToken
                                    speak(spokenSentence)
                                    spokenSentence = ''
                                } else {
                                    spokenSentence += responseToken // build up the spoken sentence

                                    responseToken = responseToken.replace(/\n/g, '')
                                    if (responseToken.length === 1 || responseToken.length === 2) {
                                        for (let i = 0; i < sentenceLevelPunctuations.length; ++i) {
                                            let sentenceLevelPunctuation = sentenceLevelPunctuations[i]
                                            if (responseToken.startsWith(sentenceLevelPunctuation)) {
                                                speak(spokenSentence)
                                                spokenSentence = ''
                                                break
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (error) {
                        console.log(`Error occurred while parsing the response: ${error}`)
                        console.log(chunkString)
                    }
                })

                if (!enableDisplayTextAlignmentWithSpeech) {
                    chatHistoryTextArea.innerHTML += displaySentence.replace(/\n/g, '<br/>')
                    chatHistoryTextArea.scrollTop = chatHistoryTextArea.scrollHeight
                    displaySentence = ''
                }

                // Continue reading the next chunk
                return read()
            })
        }

        // Start reading the stream
        return read()
    })
    .then(async () => {
        if (spokenSentence !== '') {
            speak(spokenSentence)
            spokenSentence = ''
        }

        // Execute accumulated tool calls after streaming is complete
        if (Object.keys(accumulatedToolCalls).length > 0) {
            console.log("Executing accumulated tool calls:", accumulatedToolCalls)
            
            // Convert accumulated tool calls to array
            const toolCallsArray = Object.values(accumulatedToolCalls)
            
            // Add assistant message with tool calls
            let assistantMessage = {
                role: 'assistant',
                content: assistantReply || null,
                tool_calls: toolCallsArray
            }
            messages.push(assistantMessage)
            
            // Execute each tool call
            for (const toolCall of toolCallsArray) {
                try {
                    console.log("Executing tool call:", toolCall)
                    
                    // Validate that we have complete arguments before parsing
                    if (!toolCall.function.arguments || toolCall.function.arguments.trim() === '') {
                        throw new Error("Function arguments are empty or incomplete")
                    }
                    
                    // Additional check: ensure arguments look like complete JSON
                    const argsStr = toolCall.function.arguments.trim()
                    if (!argsStr.startsWith('{') || !argsStr.endsWith('}')) {
                        throw new Error("Function arguments do not appear to be complete JSON")
                    }
                    
                    const functionResult = await executeFunctionCall(toolCall.function)
                    
                    // Add function result to chat history
                    let chatHistoryTextArea = document.getElementById('chatHistory')
                    chatHistoryTextArea.innerHTML += `<div class="function-execution">🔧 Function executed: ${toolCall.function.name}</div>`
                    chatHistoryTextArea.scrollTop = chatHistoryTextArea.scrollHeight
                    
                    // Add function result message to conversation history
                    messages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: functionResult
                    })
                    
                } catch (error) {
                    console.error("Error executing function call:", error)
                    let chatHistoryTextArea = document.getElementById('chatHistory')
                    chatHistoryTextArea.innerHTML += `<div class="function-execution">❌ Function execution failed: ${error.message}</div>`
                    chatHistoryTextArea.scrollTop = chatHistoryTextArea.scrollHeight
                }
            }
            
            return // Exit early since we handled the assistant message above
        }

        if (dataSources.length > 0) {
            let toolMessage = {
                role: 'tool',
                content: toolContent
            }

            messages.push(toolMessage)
        }

        let assistantMessage = {
            role: 'assistant',
            content: assistantReply
        }

        messages.push(assistantMessage)
    })
}

function getQuickReply() {
    return quickReplies[Math.floor(Math.random() * quickReplies.length)]
}

function checkHung() {
    // Check whether the avatar video stream is hung, by checking whether the video time is advancing
    let videoElement = document.getElementById('videoPlayer')
    if (videoElement !== null && videoElement !== undefined && sessionActive) {
        let videoTime = videoElement.currentTime
        setTimeout(() => {
            // Check whether the video time is advancing
            if (videoElement.currentTime === videoTime) {
                // Check whether the session is active to avoid duplicatedly triggering reconnect
                if (sessionActive) {
                    sessionActive = false
                    if (document.getElementById('autoReconnectAvatar').checked) {
                        // No longer reconnect when there is no interaction for a while
                        if (new Date() - lastInteractionTime < 300000) {
                            console.log(`[${(new Date()).toISOString()}] The video stream got disconnected, need reconnect.`)
                            isReconnecting = true
                            // Remove data channel onmessage callback to avoid duplicatedly triggering reconnect
                            peerConnectionDataChannel.onmessage = null
                            // Release the existing avatar connection
                            if (avatarSynthesizer !== undefined) {
                                avatarSynthesizer.close()
                            }
    
                            // Setup a new avatar connection
                            connectAvatar()
                        }
                    }
                }
            }
        }, 2000)
    }
}

function checkLastSpeak() {
    if (lastSpeakTime === undefined) {
        return
    }

    let currentTime = new Date()
    if (currentTime - lastSpeakTime > 15000) {
        if (document.getElementById('useLocalVideoForIdle').checked && sessionActive && !isSpeaking) {
            disconnectAvatar()
            document.getElementById('localVideo').hidden = false
            document.getElementById('remoteVideo').style.width = '0.1px'
            sessionActive = false
        }
    }
}

window.onload = () => {
    setInterval(() => {
        checkHung()
        checkLastSpeak()
    }, 2000) // Check session activity every 2 seconds
}

window.startSession = () => {
    lastInteractionTime = new Date()
    if (document.getElementById('useLocalVideoForIdle').checked) {
        document.getElementById('startSession').disabled = true
        document.getElementById('configuration').hidden = true
        document.getElementById('microphone').disabled = false
        document.getElementById('stopSession').disabled = false
        document.getElementById('localVideo').hidden = false
        document.getElementById('remoteVideo').style.width = '0.1px'
        document.getElementById('chatHistory').hidden = false
        document.getElementById('showTypeMessage').disabled = false
        return
    }

    userClosedSession = false
    connectAvatar()
}

window.stopSession = () => {
    lastInteractionTime = new Date()
    document.getElementById('startSession').disabled = false
    document.getElementById('microphone').disabled = true
    document.getElementById('stopSession').disabled = true
    document.getElementById('configuration').hidden = false
    document.getElementById('chatHistory').hidden = true
    document.getElementById('showTypeMessage').checked = false
    document.getElementById('showTypeMessage').disabled = true
    document.getElementById('userMessageBox').hidden = true
    document.getElementById('uploadImgIcon').hidden = true
    if (document.getElementById('useLocalVideoForIdle').checked) {
        document.getElementById('localVideo').hidden = true
    }

    userClosedSession = true
    disconnectAvatar()
}

window.clearChatHistory = () => {
    lastInteractionTime = new Date()
    document.getElementById('chatHistory').innerHTML = ''
    initMessages()
}

window.microphone = () => {
    lastInteractionTime = new Date()
    if (document.getElementById('microphone').innerHTML === 'Stop Microphone') {
        // Stop microphone
        document.getElementById('microphone').disabled = true
        speechRecognizer.stopContinuousRecognitionAsync(
            () => {
                document.getElementById('microphone').innerHTML = 'Start Microphone'
                document.getElementById('microphone').disabled = false
            }, (err) => {
                console.log("Failed to stop continuous recognition:", err)
                document.getElementById('microphone').disabled = false
            })

        return
    }

    if (document.getElementById('useLocalVideoForIdle').checked) {
        if (!sessionActive) {
            connectAvatar()
        }

        setTimeout(() => {
            document.getElementById('audioPlayer').play()
        }, 5000)
    } else {
        document.getElementById('audioPlayer').play()
    }

    document.getElementById('microphone').disabled = true
    speechRecognizer.recognized = async (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            let userQuery = e.result.text.trim()
            if (userQuery === '') {
                return
            }

            // Auto stop microphone when a phrase is recognized, when it's not continuous conversation mode
            if (!document.getElementById('continuousConversation').checked) {
                document.getElementById('microphone').disabled = true
                speechRecognizer.stopContinuousRecognitionAsync(
                    () => {
                        document.getElementById('microphone').innerHTML = 'Start Microphone'
                        document.getElementById('microphone').disabled = false
                    }, (err) => {
                        console.log("Failed to stop continuous recognition:", err)
                        document.getElementById('microphone').disabled = false
                    })
            }

            handleUserQuery(userQuery,"","")
        }
    }

    speechRecognizer.startContinuousRecognitionAsync(
        () => {
            document.getElementById('microphone').innerHTML = 'Stop Microphone'
            document.getElementById('microphone').disabled = false
        }, (err) => {
            console.log("Failed to start continuous recognition:", err)
            document.getElementById('microphone').disabled = false
        })
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing Avatar Chat Application...')
    
    // Load configuration from config.json or environment variables
    loadConfig().then(() => {
        console.log('Configuration loaded successfully')
        
        // Check for missing API keys and show modal if needed
        const modalShown = checkAndShowApiKeyModal()
        
        // Perform detailed validation and provide specific feedback
        const validationResults = validateConfiguration()
        
        if (validationResults.length === 0) {
            updateStatus('✅ Configuration valid - Ready to start conversation!')
        } else {
            // Show specific configuration issues
            const criticalIssues = validationResults.filter(issue => 
                issue.includes('API key missing') || 
                issue.includes('endpoint not set') || 
                issue.includes('deployment name not set')
            )
            
            if (criticalIssues.length > 0) {
                if (!modalShown) {
                    updateStatus('❌ Critical configuration errors: ' + criticalIssues.join(', '))
                    console.warn('Full validation results:', validationResults)
                }
            } else {
                if (!modalShown) {
                    updateStatus('⚠️ Configuration warnings: ' + validationResults.join(', ') + ' - App may still work')
                }
            }
        }
    }).catch(error => {
        console.error('Failed to load configuration:', error)
        updateStatus('❌ Configuration loading failed: ' + error.message)
    })
    
    // Add button hover effects
    const buttons = document.querySelectorAll('button')
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            if (!this.disabled) {
                this.style.opacity = '0.8'
            }
        })
        button.addEventListener('mouseleave', function() {
            this.style.opacity = '1'
        })
    })
})

window.updataEnableOyd = () => {
    if (document.getElementById('enableOyd').checked) {
        document.getElementById('cogSearchConfig').hidden = false
    } else {
        document.getElementById('cogSearchConfig').hidden = true
    }
}

window.updateTypeMessageBox = () => {
    if (document.getElementById('showTypeMessage').checked) {
        document.getElementById('userMessageBox').hidden = false
        document.getElementById('uploadImgIcon').hidden = false
        document.getElementById('userMessageBox').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const userQuery = document.getElementById('userMessageBox').innerText
                const messageBox = document.getElementById('userMessageBox')
                const childImg = messageBox.querySelector("#picInput")
                if (childImg) {
                    childImg.style.width = "200px"
                    childImg.style.height = "200px"
                }
                let userQueryHTML = messageBox.innerHTML.trim("")
                if(userQueryHTML.startsWith('<img')){
                    userQueryHTML="<br/>"+userQueryHTML
                }
                if (userQuery !== '') {
                    handleUserQuery(userQuery.trim(''), userQueryHTML, imgUrl)
                    document.getElementById('userMessageBox').innerHTML = ''
                    imgUrl = ""
                }
            }
        })
        document.getElementById('uploadImgIcon').addEventListener('click', function() {
            imgUrl = "https://wallpaperaccess.com/full/528436.jpg"
            const userMessage = document.getElementById("userMessageBox");
            const childImg = userMessage.querySelector("#picInput");
            if (childImg) {
                userMessage.removeChild(childImg)
            }
            userMessage.innerHTML+='<br/><img id="picInput" src="https://wallpaperaccess.com/full/528436.jpg" style="width:100px;height:100px"/><br/><br/>'   
        });
    } else {
        document.getElementById('userMessageBox').hidden = true
        document.getElementById('uploadImgIcon').hidden = true
        imgUrl = ""
    }
}

window.updateLocalVideoForIdle = () => {
    if (document.getElementById('useLocalVideoForIdle').checked) {
        document.getElementById('showTypeMessageCheckbox').hidden = true
    } else {
        document.getElementById('showTypeMessageCheckbox').hidden = false
    }
}

window.updatePrivateEndpoint = () => {
    if (document.getElementById('enablePrivateEndpoint').checked) {
        document.getElementById('showPrivateEndpointCheckBox').hidden = false
    } else {
        document.getElementById('showPrivateEndpointCheckBox').hidden = true
    }
}

window.updateCustomAvatarBox = () => {
    if (document.getElementById('customizedAvatar').checked) {
        document.getElementById('useBuiltInVoice').disabled = false
    } else {
        document.getElementById('useBuiltInVoice').disabled = true
        document.getElementById('useBuiltInVoice').checked = false
    }
}

// Make modal functions globally available
window.saveApiKeysFromModal = saveApiKeysFromModal
window.skipApiKeySetup = skipApiKeySetup

// Function to hide the Mermaid chart container
window.hideMermaidChart = function() {
    const chartContainer = document.getElementById('mermaidChartContainer');
    chartContainer.style.display = 'none';
    chartContainer.hidden = true;
}

// Helper function to check for missing API keys and show modal
function checkAndShowApiKeyModal() {
    const envVars = loadEnvironmentVariables()
    const missingKeys = []
    
    // Check which API keys are missing
    if (!envVars.speechApiKey || envVars.speechApiKey.trim() === '') {
        missingKeys.push({
            id: 'modalSpeechApiKey',
            name: 'Azure Speech API Key',
            storageKey: 'AZURE_SPEECH_API_KEY',
            description: 'Required for speech recognition and synthesis'
        })
    }
    
    if (!envVars.openaiApiKey || envVars.openaiApiKey.trim() === '') {
        missingKeys.push({
            id: 'modalOpenaiApiKey',
            name: 'Azure OpenAI API Key',
            storageKey: 'AZURE_OPENAI_API_KEY',
            description: 'Required for AI chat responses'
        })
    }
    
    // Only show search API key if "On Your Data" feature is enabled
    if (config.azureOpenAI?.enableOyd && (!envVars.searchApiKey || envVars.searchApiKey.trim() === '')) {
        missingKeys.push({
            id: 'modalSearchApiKey',
            name: 'Azure Cognitive Search API Key',
            storageKey: 'AZURE_SEARCH_API_KEY',
            description: 'Required for "On Your Data" feature'
        })
    }
    
    if (missingKeys.length > 0) {
        showApiKeyModal(missingKeys)
        return true
    }
    
    return false
}

// Function to show the API key modal with missing keys
function showApiKeyModal(missingKeys) {
    const modal = document.getElementById('apiKeyModal')
    const form = document.getElementById('apiKeyForm')
    
    // Clear existing form content
    form.innerHTML = ''
    
    // Add input fields for each missing key
    missingKeys.forEach(key => {
        const fieldHTML = `
            <div style="margin-bottom: 20px;">
                <label for="${key.id}" style="display: block; font-weight: bold; margin-bottom: 5px; color: #333;">
                    ${key.name}:
                </label>
                <p style="font-size: 12px; color: #666; margin-bottom: 8px;">${key.description}</p>
                <input 
                    type="password" 
                    id="${key.id}" 
                    data-storage-key="${key.storageKey}"
                    placeholder="Enter your ${key.name}"
                    style="
                        width: 100%;
                        padding: 10px;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        font-size: 14px;
                        box-sizing: border-box;
                    "
                />
            </div>
        `
        form.innerHTML += fieldHTML
    })
    
    // Show the modal
    modal.style.display = 'block'
    
    // Focus on the first input field
    setTimeout(() => {
        const firstInput = form.querySelector('input')
        if (firstInput) {
            firstInput.focus()
        }
    }, 100)
}

// Function to save API keys from modal and close it
function saveApiKeysFromModal() {
    const form = document.getElementById('apiKeyForm')
    const inputs = form.querySelectorAll('input[type="password"]')
    let savedCount = 0
    
    inputs.forEach(input => {
        const value = input.value.trim()
        const storageKey = input.getAttribute('data-storage-key')
        
        if (value && storageKey) {
            localStorage.setItem(storageKey, value)
            savedCount++
            console.log(`✅ ${storageKey} saved to localStorage`)
            
            // Also update the config object immediately
            if (storageKey === 'AZURE_SPEECH_API_KEY') {
                config.azureSpeech.apiKey = value
            } else if (storageKey === 'AZURE_OPENAI_API_KEY') {
                config.azureOpenAI.apiKey = value
            } else if (storageKey === 'AZURE_SEARCH_API_KEY') {
                config.azureCognitiveSearch.apiKey = value
            }
        }
    })
    
    // Close modal
    document.getElementById('apiKeyModal').style.display = 'none'
    
    // Update status
    if (savedCount > 0) {
        updateStatus(`✅ ${savedCount} API key(s) saved successfully!`)
        
        // Update the form elements with the new values
        populateConfigElements()
        
        // Validate configuration again
        setTimeout(() => {
            const validationResults = validateConfiguration()
            if (validationResults.length === 0) {
                updateStatus('✅ Configuration complete - Ready to start conversation!')
            } else {
                const remainingIssues = validationResults.filter(issue => !issue.includes('API key missing'))
                if (remainingIssues.length === 0) {
                    updateStatus('✅ All API keys configured - Ready to start conversation!')
                } else {
                    updateStatus('⚠️ Some configuration issues remain: ' + remainingIssues.slice(0, 2).join(', '))
                }
            }
        }, 500)
    } else {
        updateStatus('ℹ️ No API keys were provided')
    }
}

// Function to skip API key setup
function skipApiKeySetup() {
    document.getElementById('apiKeyModal').style.display = 'none'
    updateStatus('⚠️ API key setup skipped - some features may not work without proper configuration')
}

// Make modal functions globally available
window.saveApiKeysFromModal = saveApiKeysFromModal
window.skipApiKeySetup = skipApiKeySetup

// Function to hide the Mermaid chart container
window.hideMermaidChart = function() {
    const chartContainer = document.getElementById('mermaidChartContainer');
    chartContainer.style.display = 'none';
    chartContainer.hidden = true;
}

// Function to clear all Mermaid charts
window.clearMermaidCharts = function() {
    const chartContent = document.getElementById('mermaidChartContent');
    chartContent.innerHTML = '';
}

// Function to create Mermaid charts
async function createMermaidChart(args) {
    console.log("createMermaidChart called with args:", args);
    
    if (!args.chartType || !args.content) {
        return "Error: Chart type and content are required to create a Mermaid chart.";
    }

    try {
        // Generate the Mermaid chart syntax based on the chart type and content
        let mermaidSyntax = '';
        
        switch (args.chartType.toLowerCase()) {
            case 'flowchart':
                mermaidSyntax = `flowchart TD\n${args.content}`;
                break;
            case 'sequence':
                mermaidSyntax = `sequenceDiagram\n${args.content}`;
                break;
            case 'gantt':
                mermaidSyntax = `gantt\n    title ${args.title || 'Project Timeline'}\n${args.content}`;
                break;
            case 'class':
                mermaidSyntax = `classDiagram\n${args.content}`;
                break;
            case 'pie':
                mermaidSyntax = `pie title ${args.title || 'Pie Chart'}\n${args.content}`;
                break;
            case 'mindmap':
                mermaidSyntax = `mindmap\n  root)${args.title || 'Main Topic'})\n${args.content}`;
                break;
            case 'timeline':
                mermaidSyntax = `timeline\n    title ${args.title || 'Timeline'}\n${args.content}`;
                break;
            default:
                mermaidSyntax = args.content; // Use raw content if type not recognized
        }

        // Create a unique container ID for this chart
        const chartId = 'mermaid-chart-' + Date.now();
        
        // Create the HTML structure for the Mermaid chart
        const chartHtml = `
            <div class="mermaid-chart-container" style="margin-bottom: 20px;">
                <h4 style="margin-top: 0; color: #0078d4; font-size: 16px;">${args.title || 'Generated Chart'}</h4>
                <div id="${chartId}" class="mermaid" style="text-align: center; margin: 15px 0;">
                    ${mermaidSyntax}
                </div>
                <details style="margin-top: 15px;">
                    <summary style="cursor: pointer; color: #0078d4; font-weight: bold;">View Mermaid Syntax</summary>
                    <pre style="background-color: #f5f5f5; padding: 10px; border-radius: 5px; overflow-x: auto; margin-top: 10px;"><code>${mermaidSyntax}</code></pre>
                </details>
            </div>
        `;

        // Add the chart to the dedicated chart container instead of chat history
        const chartContainer = document.getElementById('mermaidChartContainer');
        const chartContent = document.getElementById('mermaidChartContent');
        
        // Add new chart to existing content (support multiple charts)
        chartContent.innerHTML += chartHtml;
        
        // Show the chart container
        chartContainer.style.display = 'block';
        chartContainer.hidden = false;
        
        // Scroll to the new chart
        chartContent.scrollTop = chartContent.scrollHeight;

        // Initialize Mermaid if not already loaded
        if (typeof mermaid === 'undefined') {
            // Load Mermaid library dynamically
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js';
            script.onload = () => {
                mermaid.initialize({ 
                    startOnLoad: false,
                    theme: 'default',
                    themeVariables: {
                        primaryColor: '#ff6b6b',
                        primaryTextColor: '#fff',
                        primaryBorderColor: '#ff4757',
                        lineColor: '#5f27cd'
                    }
                });
                mermaid.run({ querySelector: `#${chartId}` });
            };
            document.head.appendChild(script);
        } else {
            // Mermaid is already loaded, just render the new chart
            mermaid.run({ querySelector: `#${chartId}` });
        }

        return `Successfully created ${args.chartType || 'Mermaid'} chart: "${args.title || 'Generated Chart'}". The chart is now displayed in the chart panel to the right of the video.`;
        
    } catch (error) {
        console.error("Error creating Mermaid chart:", error);
        return `Error creating Mermaid chart: ${error.message}`;
    }
}

// Function definitions for Azure OpenAI function calling
const functionDefinitions = [
    {
        type: "function",
        function: {
            name: "createMermaidChart",
            description: "Create and display Mermaid diagrams and charts. Supports flowcharts, sequence diagrams, Gantt charts, class diagrams, pie charts, mindmaps, and timelines.",
            parameters: {
                type: "object",
                properties: {
                    chartType: {
                        type: "string",
                        description: "Type of chart to create",
                        enum: ["flowchart", "sequence", "gantt", "class", "pie", "mindmap", "timeline"]
                    },
                    title: {
                        type: "string", 
                        description: "Title for the chart"
                    },
                    content: {
                        type: "string",
                        description: "Mermaid syntax content for the chart body (without the chart type declaration)"
                    }
                },
                required: ["chartType", "content"]
            }
        }
    }
];

// Function to execute function calls
async function executeFunctionCall(functionCall) {
    console.log("Executing function call:", functionCall);
    
    try {
        // Validate that arguments exist and are not empty
        if (!functionCall.arguments || functionCall.arguments.trim() === '') {
            throw new Error("Function arguments are empty or undefined")
        }
        
        // Try to parse arguments, with better error handling
        let args
        try {
            args = JSON.parse(functionCall.arguments);
        } catch (parseError) {
            console.error("Failed to parse function arguments:", functionCall.arguments)
            throw new Error(`Invalid JSON in function arguments: ${parseError.message}`)
        }
        
        switch (functionCall.name) {
            case 'createMermaidChart':
                return await createMermaidChart(args);
            default:
                return `Unknown function: ${functionCall.name}`;
        }
    } catch (error) {
        console.error("Error executing function call:", error);
        return `Error executing function: ${error.message}`;
    }
}

// PDF Context Management
var pdfExtractedText = ""
var pdfFileName = ""

// Initialize PDF.js
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// PDF Upload and Text Extraction Functions
async function handlePdfUpload(event) {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
        updatePdfStatus('Please select a valid PDF file', 'error');
        return;
    }

    pdfFileName = file.name;
    updatePdfStatus('Processing PDF...', 'processing');

    try {
        const extractedText = await extractTextFromPdf(file);
        pdfExtractedText = extractedText;
        
        updatePdfStatus(`PDF loaded: ${pdfFileName} (${extractedText.length} characters)`, 'success');
        showPdfPreview(extractedText);
        document.getElementById('clearPdfContext').disabled = false;
        
        // If conversation is already started, reinitialize messages with new PDF context
        if (conversationStarted) {
            initMessages();
        }
    } catch (error) {
        console.error('Error processing PDF:', error);
        updatePdfStatus('Error processing PDF file', 'error');
        clearPdfContext();
    }
}

async function extractTextFromPdf(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        
        fileReader.onload = async function() {
            try {
                const typedArray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                let fullText = '';
                
                // Extract text from all pages
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n\n';
                }
                
                resolve(fullText.trim());
            } catch (error) {
                reject(error);
            }
        };
        
        fileReader.onerror = () => reject(new Error('Failed to read PDF file'));
        fileReader.readAsArrayBuffer(file);
    });
}

function updatePdfStatus(message, type = 'info') {
    const statusElement = document.getElementById('pdfStatus');
    statusElement.textContent = message;
    
    // Update styling based on status type
    switch (type) {
        case 'success':
            statusElement.style.color = '#28a745';
            break;
        case 'error':
            statusElement.style.color = '#dc3545';
            break;
        case 'processing':
            statusElement.style.color = '#007bff';
            break;
        default:
            statusElement.style.color = '#666';
    }
}

function showPdfPreview(text) {
    const previewElement = document.getElementById('pdfPreview');
    const textPreviewElement = document.getElementById('pdfTextPreview');
    
    // Show first 500 characters as preview
    const previewText = text.length > 500 ? text.substring(0, 500) + '...' : text;
    textPreviewElement.textContent = previewText;
    previewElement.style.display = 'block';
}

function clearPdfContext() {
    pdfExtractedText = "";
    pdfFileName = "";
    
    // Reset UI elements
    document.getElementById('pdfFileInput').value = '';
    document.getElementById('pdfPreview').style.display = 'none';
    document.getElementById('clearPdfContext').disabled = true;
    updatePdfStatus('No PDF uploaded', 'info');
    
    // If conversation is active, reinitialize messages without PDF context
    if (conversationStarted) {
        initMessages();
    }
}