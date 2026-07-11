// Global Variables
let uploadedImageBase64 = '';
const GEMINI_API_KEY = 'AQ.Ab8RN6JoE86bEYywI7udWAa2z52kdOCSytJ3z7Hzxe7XrcTwxg';
let isFaceApiLoaded = false;

document.addEventListener('DOMContentLoaded', async () => {
    const dropZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('image-upload');
    const previewContainer = document.getElementById('preview-container');
    const imagePreview = document.getElementById('image-preview');
    const errorMessage = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    const actionButtons = document.getElementById('action-buttons');
    const startAnalysisBtn = document.getElementById('start-analysis-btn');
    const reuploadBtn = document.getElementById('reupload-btn');
    const progressContainer = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const progressPercentage = document.getElementById('progress-percentage');
    const resultsSection = document.getElementById('results-section');
    const scanLine = document.getElementById('scan-line');

    // 1. Load Face-API Models genuinely
    try {
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        isFaceApiLoaded = true;
    } catch (e) {
        console.warn("Could not load face-api models. Bypassing detection.");
    }

    // 2. Drag & Drop Logic
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) { e.preventDefault(); e.stopPropagation(); }

    ['dragenter', 'dragover'].forEach(eventName => dropZone.classList.add('dragover'));
    ['dragleave', 'drop'].forEach(eventName => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', e => handleFiles(e.dataTransfer.files));
    fileInput.addEventListener('change', e => handleFiles(e.target.files));

    function handleFiles(files) {
        if (files.length === 0) return;
        const file = files[0];
        
        if (!file.type.startsWith('image/')) {
            showError('Invalid file. Please upload an image.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            const result = e.target.result;
            uploadedImageBase64 = result.split(',')[1];
            
            imagePreview.src = result;
            dropZone.classList.add('hidden');
            previewContainer.classList.remove('hidden');
            errorMessage.classList.add('hidden');
            actionButtons.classList.add('hidden');
            startAnalysisBtn.classList.add('hidden');
            
            imagePreview.onload = () => performGenuineFaceDetection();
        };
        reader.readAsDataURL(file);
    }

    function showError(msg) {
        errorText.innerText = msg;
        errorMessage.classList.remove('hidden');
        actionButtons.classList.remove('hidden');
        startAnalysisBtn.classList.add('hidden');
    }

    // 3. Genuine Face Detection
    async function performGenuineFaceDetection() {
        if (!isFaceApiLoaded) {
            actionButtons.classList.remove('hidden');
            startAnalysisBtn.classList.remove('hidden');
            return;
        }

        try {
            const detection = await faceapi.detectSingleFace(imagePreview, new faceapi.TinyFaceDetectorOptions());
            actionButtons.classList.remove('hidden');
            
            if (detection) {
                startAnalysisBtn.classList.remove('hidden');
                errorMessage.classList.add('hidden');
            } else {
                showError('Tensor Error: No human face detected. Ensure face is clearly visible.');
            }
        } catch (e) {
            actionButtons.classList.remove('hidden');
            startAnalysisBtn.classList.remove('hidden');
        }
    }

    reuploadBtn.addEventListener('click', () => {
        dropZone.classList.remove('hidden');
        previewContainer.classList.add('hidden');
        resultsSection.classList.add('hidden');
        fileInput.value = '';
        document.getElementById('spots-container').innerHTML = '';
        scanLine.classList.add('hidden');
    });

    // 4. Start Analysis & Progress Bar
    startAnalysisBtn.addEventListener('click', () => {
        actionButtons.classList.add('hidden');
        progressContainer.classList.remove('hidden');
        scanLine.classList.remove('hidden');
        resultsSection.classList.add('hidden');
        document.getElementById('spots-container').innerHTML = ''; 

        let progress = 0;
        const progressStates = [
            "Initializing microscopic tensors...",
            "Mapping minute facial topography...",
            "Detecting all deformities & spots...",
            "Analyzing root causes & spread...",
            "Formulating Ayurvedic protocol..."
        ];

        const interval = setInterval(() => {
            if (progress < 90) progress += Math.random() * 5 + 2; 
            
            const displayProgress = Math.min(Math.floor(progress), 90);
            progressBar.style.width = `${displayProgress}%`;
            progressPercentage.innerText = `${displayProgress}%`;
            
            const stateIndex = Math.min(Math.floor(displayProgress / 20), progressStates.length - 1);
            progressText.innerText = progressStates[stateIndex];
            
        }, 150);

        fetchGeminiAnalysis().then((success) => {
            clearInterval(interval);
            if(success) {
                progressBar.style.width = `100%`;
                progressPercentage.innerText = `100%`;
                progressText.innerText = "Audit Complete.";
                setTimeout(() => scanLine.classList.add('hidden'), 500);
            } else {
                scanLine.classList.add('hidden');
                progressContainer.classList.add('hidden');
            }
        });
    });

    // 5. Elite Gemini API Call (Exhaustive Microscopic Scanning)
    async function fetchGeminiAnalysis() {
        const prompt = `Perform an EXHAUSTIVE microscopic clinical Ayurvedic skin audit on this facial image.
        DO NOT summarize. You MUST find and target EVERY SINGLE minute dark spot, depression, acne bump, and deformity on the face.
        Provide a strictly valid JSON response containing EXACTLY these keys:
        1. "spots": Array of objects detailing EVERY specific minute spot on the face.
           - "type": string (e.g. "Acne", "Pigmentation", "Pore")
           - "x": number (percentage 0-100 for X coordinate)
           - "y": number (percentage 0-100 for Y coordinate)
           - "radius": number (Size of the circle required to cover the spot. 1-3 for minute dots, 4-10 for larger areas)
        2. "analysis": An object containing the holistic breakdown:
           - "overallDiseaseType": string (Primary classification of the skin's state)
           - "causes": array of strings (e.g. factors, lifestyle, infections causing this)
           - "spreadPercentage": number (Percentage of the overall face affected by these deformities)
           - "symptoms": string (Detailed explanation of what is happening on the skin)
        3. "treatments": Array of objects for the BEST Ayurvedic remedies to recover this specific face.
           - "title": string (Remedy Name)
           - "instructions": string (How to apply/use for best results)
        Do not wrap in markdown \`\`\`json. Return pure JSON only.`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            { inline_data: { mime_type: "image/jpeg", data: uploadedImageBase64 } }
                        ]
                    }],
                    generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(()=>({}));
                throw new Error(errData.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            const aiText = data.candidates[0].content.parts[0].text;
            const cleanedText = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedData = JSON.parse(cleanedText);
            
            displayResults(parsedData);
            return true;

        } catch (error) {
            console.error("Genuine API Error:", error);
            showError(`API Error: ${error.message}. Please verify your Gemini API key format is correct.`);
            return false;
        }
    }

    // 6. Elite Results Dashboard UI with Dynamic Spot Mapping
    function displayResults(data) {
        progressContainer.classList.add('hidden');
        resultsSection.classList.remove('hidden');
        resultsSection.scrollIntoView({ behavior: 'smooth' });

        const resultsGrid = document.getElementById('results-grid');
        const spotsContainer = document.getElementById('spots-container');
        
        // 6A: Dynamic Spot Mapping
        data.spots.forEach((spot) => {
            if(spot.x && spot.y && spot.radius) {
                const circle = document.createElement('div');
                circle.className = 'spot-circle';
                circle.style.left = `${spot.x}%`;
                circle.style.top = `${spot.y}%`;
                // Dynamic width and height based on AI's radius assessment
                circle.style.width = `${spot.radius}%`;
                circle.style.paddingBottom = `${spot.radius}%`; // keeps it a perfect circle using aspect ratio trick
                spotsContainer.appendChild(circle);
            }
        });

        // 6B: Build Detailed Dashboard
        let causesHtml = data.analysis.causes.map(c => `<li class="flex gap-2 text-sm text-slate-300"><i class="fa-solid fa-virus text-amber-500 mt-1"></i> ${c}</li>`).join('');
        let treatmentsHtml = data.treatments.map(t => `
            <div class="bg-black/20 p-4 rounded-xl border border-white/5">
                <h5 class="text-emerald-400 font-bold mb-1 flex items-center gap-2"><i class="fa-solid fa-mortar-pestle"></i> ${t.title}</h5>
                <p class="text-sm text-slate-400">${t.instructions}</p>
            </div>
        `).join('');

        // Calculate severity color for the spread
        const spread = data.analysis.spreadPercentage;
        const severityColor = spread > 50 ? 'bg-red-500' : (spread > 20 ? 'bg-amber-500' : 'bg-emerald-500');
        const severityText = spread > 50 ? 'text-red-400' : (spread > 20 ? 'text-amber-400' : 'text-emerald-400');

        resultsGrid.innerHTML = `
            <!-- Left Column: Disease Profile -->
            <div class="lg:col-span-5 space-y-6">
                <div class="glass-card p-8 rounded-3xl border border-white/10 relative overflow-hidden">
                    <div class="absolute -right-10 -top-10 text-white/5 text-[150px]"><i class="fa-solid fa-microscope"></i></div>
                    <h3 class="font-heading text-slate-400 uppercase tracking-widest text-xs font-bold mb-2">Primary Diagnosis</h3>
                    <h4 class="text-2xl font-bold text-white mb-4">${data.analysis.overallDiseaseType}</h4>
                    
                    <div class="mb-6">
                        <div class="flex justify-between items-center mb-2">
                            <span class="text-sm text-slate-400">Total Face Infection Spread</span>
                            <span class="font-bold ${severityText} text-lg">${spread}%</span>
                        </div>
                        <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div class="${severityColor} h-2 rounded-full percent-bar-fill" style="width: 0%" data-width="${spread}%"></div>
                        </div>
                    </div>

                    <h3 class="font-heading text-slate-400 uppercase tracking-widest text-xs font-bold mb-3">Identified Root Causes</h3>
                    <ul class="space-y-3 mb-6">
                        ${causesHtml}
                    </ul>

                    <h3 class="font-heading text-slate-400 uppercase tracking-widest text-xs font-bold mb-3">Clinical Symptoms</h3>
                    <p class="text-sm text-slate-300 leading-relaxed">${data.analysis.symptoms}</p>
                </div>
            </div>

            <!-- Right Column: Ayurvedic Protocol -->
            <div class="lg:col-span-7">
                <div class="glass-card p-8 rounded-3xl border border-emerald-500/20 h-full relative overflow-hidden">
                    <div class="absolute -right-10 -bottom-10 text-emerald-500/5 text-[200px]"><i class="fa-solid fa-leaf"></i></div>
                    <div class="flex items-center gap-4 mb-8 border-b border-white/10 pb-6">
                        <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl border border-emerald-500/30">
                            <i class="fa-solid fa-star-of-life"></i>
                        </div>
                        <div>
                            <h3 class="font-heading text-2xl font-bold text-white">Ayurvedic Recovery Protocol</h3>
                            <p class="text-emerald-400 text-sm">Best-in-class natural treatments mapped to your specific deformities.</p>
                        </div>
                    </div>
                    
                    <div class="space-y-4 relative z-10">
                        ${treatmentsHtml}
                    </div>
                </div>
            </div>
        `;

        // Animate percentage bars
        setTimeout(() => {
            document.querySelectorAll('.percent-bar-fill').forEach(bar => {
                bar.style.width = bar.getAttribute('data-width');
            });
        }, 100);
    }

    // 7. PDF Download
    document.getElementById('download-pdf-btn').addEventListener('click', () => {
        const element = document.getElementById('pdf-content');
        element.style.background = '#ffffff';
        element.style.color = '#000000';
        
        const opt = {
            margin:       0.5,
            filename:     'AyurSkin-Pro-Audit.pdf',
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
            jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        
        html2pdf().set(opt).from(element).save().then(()=>{
            element.style.background = '';
            element.style.color = '';
        });
    });
});
