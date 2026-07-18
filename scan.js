// Global Variables
let uploadedImages = [];
let stream = null;
let currentChart = null; // Store chart instance to destroy if re-running
let lastAnalysisData = null; // Memory binding for PDF accuracy
let patientDetails = { name: '', age: '', gender: '', phone: '' };
let questionnaireData = {};

document.addEventListener('DOMContentLoaded', async () => {
    const inputSelection = document.getElementById('input-selection');
    const userInfoForm = document.getElementById('user-info-form');
    const patientForm = document.getElementById('patient-form');
    
    // Handle Patient Form Submission
    patientForm.addEventListener('submit', (e) => {
        e.preventDefault();
        patientDetails.name = document.getElementById('user-name').value;
        patientDetails.age = document.getElementById('user-age').value;
        patientDetails.gender = document.getElementById('user-gender').value;
        patientDetails.phone = document.getElementById('user-phone').value;
        
        userInfoForm.classList.add('hidden');
        document.getElementById('questionnaire-section').classList.remove('hidden');
        
        // Update progress bar
        document.getElementById('step-progress-bar').style.width = '50%';
        document.getElementById('step-1-indicator').classList.add('opacity-50');
        document.getElementById('step-2-indicator').classList.remove('opacity-50');
        document.getElementById('step-2-indicator').querySelector('.step-icon').classList.replace('bg-slate-800', 'bg-emerald-500');
        document.getElementById('step-2-indicator').querySelector('.step-icon').classList.replace('text-slate-400', 'text-white');
        document.getElementById('step-2-indicator').querySelector('.step-icon').classList.add('shadow-[0_0_20px_rgba(16,185,129,0.4)]');
        document.getElementById('step-2-indicator').querySelector('span').classList.replace('text-slate-400', 'text-emerald-400');
    });

    // Handle Questionnaire Submission
    document.getElementById('questionnaire-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        questionnaireData = {
            skinArea: formData.get('skin-area'),
            specificBodyPart: formData.get('specific-body-part'),
            bodyParts: formData.getAll('q1_body_parts'),
            concerns: formData.getAll('q2_concerns'),
            duration: formData.get('q3_duration'),
            progression: formData.get('q4_progression'),
            symptoms: formData.getAll('q5_symptoms'),
            triggers: formData.getAll('q6_triggers'),
            treatments: formData.getAll('q7_treatments'),
            history: formData.get('q8_history'),
            conditions: formData.getAll('q9_conditions'),
            familyHistory: formData.get('q10_family'),
            skinType: formData.get('q11_skin_type'),
            diet: formData.getAll('q12_diet'),
            digestion: formData.get('q13_digestion'),
            lifestyle: formData.getAll('q14_lifestyle'),
            circumstances: formData.getAll('q15_circumstances')
        };

        targetImageCount = questionnaireData.skinArea === 'Face' ? 3 : 2;

        document.getElementById('questionnaire-section').classList.add('hidden');
        inputSelection.classList.remove('hidden');
        
        updateImagePromptUI();

        // Update progress bar
        document.getElementById('step-progress-bar').style.width = '100%';
        document.getElementById('step-2-indicator').classList.add('opacity-50');
        document.getElementById('step-3-indicator').classList.remove('opacity-50');
        document.getElementById('step-3-indicator').querySelector('.step-icon').classList.replace('bg-slate-800', 'bg-emerald-500');
        document.getElementById('step-3-indicator').querySelector('.step-icon').classList.replace('text-slate-400', 'text-white');
        document.getElementById('step-3-indicator').querySelector('.step-icon').classList.add('shadow-[0_0_20px_rgba(16,185,129,0.4)]');
        document.getElementById('step-3-indicator').querySelector('span').classList.replace('text-slate-400', 'text-emerald-400');
    });
    const openCameraBtn = document.getElementById('open-camera-btn');
    const cameraContainer = document.getElementById('camera-container');
    const cameraVideo = document.getElementById('camera-video');
    const cameraCanvas = document.getElementById('camera-canvas');
    const captureBtn = document.getElementById('capture-btn');
    const closeCameraBtn = document.getElementById('close-camera-btn');
    
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

    // 2. Camera Integration
    openCameraBtn.addEventListener('click', async () => {
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            cameraVideo.srcObject = stream;
            inputSelection.classList.add('hidden');
            cameraContainer.classList.remove('hidden');
        } catch (err) {
            console.error("Camera access denied or unavailable", err);
            alert("Unable to access camera. Please check permissions or use Upload Photo instead.");
        }
    });

    closeCameraBtn.addEventListener('click', () => {
        if (stream) stream.getTracks().forEach(track => track.stop());
        cameraContainer.classList.add('hidden');
        inputSelection.classList.remove('hidden');
    });

    function updateImagePromptUI() {
        const current = uploadedImages.length + 1;
        let label = '';
        if (questionnaireData.skinArea === 'Face') {
            if (current === 1) label = 'front face image';
            else if (current === 2) label = 'right face image';
            else if (current === 3) label = 'left face image';
        } else {
            if (current === 1) label = 'first image of the affected skin';
            else if (current === 2) label = 'second image of the affected skin';
        }
        
        const subtitle = document.querySelector('#analyze-section p');
        if(subtitle) {
            subtitle.innerHTML = `System ready. Please provide <strong>Image ${current} of ${targetImageCount} (${label})</strong> for microscopic tensor analysis.`;
        }

        const camTitle = document.querySelector('#open-camera-btn h3');
        const upTitle = document.querySelector('#image-upload').nextElementSibling.nextElementSibling;
        if (camTitle) camTitle.innerText = `Camera (${label})`;
        if (upTitle) upTitle.innerText = `Upload (${label})`;
    }

    captureBtn.addEventListener('click', () => {
        cameraCanvas.width = cameraVideo.videoWidth;
        cameraCanvas.height = cameraVideo.videoHeight;
        const ctx = cameraCanvas.getContext('2d');
        ctx.translate(cameraCanvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
        
        const dataUrl = cameraCanvas.toDataURL('image/jpeg', 0.9);
        uploadedImages.push(dataUrl.split(',')[1]);
        
        if (stream) stream.getTracks().forEach(track => track.stop());
        cameraContainer.classList.add('hidden');
        
        displayPreview(dataUrl);
    });

    // 3. Upload Integration
    fileInput.addEventListener('change', e => {
        if (e.target.files.length === 0) return;
        const file = e.target.files[0];
        if (!file.type.startsWith('image/')) {
            alert('Invalid file. Please upload an image.');
            return;
        }
        const reader = new FileReader();
        reader.onload = async (event) => {
            uploadedImages.push(event.target.result.split(',')[1]);
            inputSelection.classList.add('hidden');
            displayPreview(event.target.result);
        };
        reader.readAsDataURL(file);
    });

    function displayPreview(dataUrl) {
        const grid = document.getElementById('multi-image-preview-grid');
        grid.innerHTML = `
            <div class="relative inline-block rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.2)] border border-emerald-500/30 max-w-md w-full">
                <img src="${dataUrl}" class="block w-full opacity-80" style="filter: contrast(1.05);">
                <div id="scan-line" class="scan-line hidden"></div>
            </div>
        `;

        previewContainer.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        actionButtons.classList.remove('hidden');
        
        if (uploadedImages.length < targetImageCount) {
            startAnalysisBtn.innerHTML = `Next Image <i class="fa-solid fa-arrow-right"></i>`;
            startAnalysisBtn.classList.remove('hidden');
            startAnalysisBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                previewContainer.classList.add('hidden');
                inputSelection.classList.remove('hidden');
                fileInput.value = '';
                updateImagePromptUI();
                startAnalysisBtn.onclick = null;
            };
        } else {
            startAnalysisBtn.innerHTML = `Start Neural Scan <i class="fa-solid fa-microchip"></i>`;
            startAnalysisBtn.classList.remove('hidden');
            startAnalysisBtn.onclick = null;
        }
    }

    function showError(msg) {
        errorText.innerText = msg;
        errorMessage.classList.remove('hidden');
        actionButtons.classList.remove('hidden');
        startAnalysisBtn.classList.add('hidden');
    }

    reuploadBtn.addEventListener('click', () => {
        uploadedImages.pop(); // Remove the last uploaded image
        inputSelection.classList.remove('hidden');
        previewContainer.classList.add('hidden');
        resultsSection.classList.add('hidden');
        fileInput.value = '';
        const grid = document.getElementById('multi-image-preview-grid');
        if (grid) grid.innerHTML = '';
        updateImagePromptUI();
    });

    // 4. Advanced Progress Engine
    startAnalysisBtn.addEventListener('click', () => {
        if (uploadedImages.length < targetImageCount) return; // Prevent early scan
        
        actionButtons.classList.add('hidden');
        progressContainer.classList.remove('hidden');
        const scanLine = document.getElementById('scan-line');
        if (scanLine) scanLine.classList.remove('hidden');
        resultsSection.classList.add('hidden');

        let progress = 0;
        const progressStates = [
            "Initializing microscopic tensors...",
            "Mapping minute facial topography...",
            "Detecting all deformities & spots...",
            "Generating clinical chart data...",
            "Analyzing root causes & spread...",
            "Formulating Ayurvedic Bento Protocol...",
            "Finalizing UI Blueprint..."
        ];

        const interval = setInterval(() => {
            if (progress < 70) progress += Math.random() * 8 + 3;
            else if (progress < 90) progress += Math.random() * 3 + 1;
            else if (progress < 98) progress += Math.random() * 0.5 + 0.1;
            
            const displayProgress = Math.min(Math.floor(progress), 98);
            progressBar.style.width = `${displayProgress}%`;
            progressPercentage.innerText = `${displayProgress}%`;
            
            const stateIndex = Math.min(Math.floor(displayProgress / 15), progressStates.length - 1);
            progressText.innerText = progressStates[stateIndex];
            
        }, 300);

        fetchGeminiAnalysis().then((success) => {
            clearInterval(interval);
            if(success) {
                progressBar.style.width = `100%`;
                progressPercentage.innerText = `100%`;
                progressText.innerText = "Audit Complete.";
                setTimeout(() => {
                    const scanLine = document.getElementById('scan-line');
                    if (scanLine) scanLine.classList.add('hidden');
                    progressContainer.classList.add('hidden');
                }, 800);
            } else {
                const scanLine = document.getElementById('scan-line');
                if (scanLine) scanLine.classList.add('hidden');
                progressContainer.classList.add('hidden');
            }
        });
    });

    // 5. Elite Gemini API Call (Chart Data included)
    async function fetchGeminiAnalysis() {
        const prompt = `Perform an EXHAUSTIVE microscopic clinical Ayurvedic and Modern medical skin audit on this set of clinical images.
        Crucially, DO NOT limit your analysis to just acne. You MUST accurately diagnose and identify a wide spectrum of skin diseases and abnormalities if they are present on the user's skin. 
        
        IMPORTANT RULES: 
        1. ONLY report conditions you GENUINELY detect in the images. Do not invent conditions. If the skin is almost normal with no major diseases, explicitly state that it is normal (or "X% normal") and only list minor flaws.
        2. SPOTS (10X PRECISION REQUIRED): You are a high-precision medical imaging tensor. The "spots" array coordinates (x, y) represent percentage values (0-100) where X=0 is absolute left edge, X=100 is absolute right edge, Y=0 is absolute top edge. You MUST exhaustively map every single pimple, dark spot, blackhead, and deformity. None should be missed! However, do not hallucinate spots that are not there. For every spot you see, you MUST map x and y EXACTLY to the true center pixel of the lesion. The "radius" MUST strictly bound the spot with zero excess space. DO NOT guess; identify exact locations.
        3. DARK CIRCLES: CRITICAL: Do NOT report Dark Circles (shape="half-moon") unless they are extremely prominent and visibly exist under the eyes. If the patient is healthy and well-rested, do not hallucinate dark circles!
        
        Use the following patient details and clinical questionnaire data to contextualize your diagnosis:
        Patient Details: ${JSON.stringify(patientDetails)}
        Questionnaire Data: ${JSON.stringify(questionnaireData)}
        
        Provide a strictly valid JSON response containing EXACTLY these keys:
        1. "spots": Array of ALL genuinely detected lesions, rashes, patches, spots, and deformities across all provided images.
           - "imageIndex": number (0 for the first image, 1 for the second image, 2 for the third image, indicating which image this spot is found on)
           - "type": string (Name the condition)
           - "x": number (percentage 0-100 for exact X coordinate of the center)
           - "y": number (percentage 0-100 for exact Y coordinate of the center)
           - "radius": number (Size of the circle tightly bounding the spot. 1-2 for tiny dots, 3-6 for medium spots, 7-15 for large rashes/patches)
           - "shape": string (Only use "half-moon" for genuinely detected prominent under-eye dark circles. Use "circle" for everything else.)
        2. "analysis": An object containing a condensed, easily understandable 9-point report for a layman:
           - "overallDiseaseType": string (The primary diagnosis. MUST include the Ayurvedic name in brackets, e.g., "Acne Vulgaris [Yauvanapidaka]". If normal, state "Normal / Healthy")
           - "modernInfo": string (Modern medical explanation of the condition, easy to understand)
           - "ayurvedicInfo": string (Ayurvedic explanation of the condition, doshas involved)
           - "diagnosisPercentage": string (e.g., "85% Normal" or "Moderate to Severe (45% impacted)")
           - "spreadPercentage": number (Integer 1-100 representing total facial area affected)
           - "detailedRootCause": object containing two keys: "modern" (string) and "ayurvedic" (string) for detailed explanations of the root cause in layman terms.
           - "symptoms": array of 3-5 strings (Symptoms associated with the diagnosis. MUST include the Ayurvedic term in brackets for each symptom, e.g., "Excess Sebum [Ati Snigdha]")
        3. "chartData": An object mapping deformity/condition types to their percentages (Must add up to 100).
        4. "ayurvedicRemedies": Array of objects for specific Ayurvedic remedies tailored to the diagnosis.
           - "title": string (Remedy Name)
           - "instructions": string (Exact steps)
           - "icon": string (A font-awesome class name, e.g. "fa-solid fa-leaf")
        5. "modernRemedies": Array of objects for specific Modern science dermatological remedies (e.g. Salicylic acid).
           - "title": string (Remedy Name)
           - "instructions": string (Exact steps)
           - "icon": string (A font-awesome class name, e.g. "fa-solid fa-flask")
        Do not wrap in markdown \`\`\`json. Return pure JSON only.`;

        try {
            // Automatically switch between local development and production URLs
            const apiUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') 
                ? 'http://localhost:3000/api/analyze' 
                : '/api/analyze';
                
            const imageParts = uploadedImages.map(img => ({ inline_data: { mime_type: "image/jpeg", data: img } }));

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            ...imageParts
                        ]
                    }],
                    generationConfig: { temperature: 0.1, response_mime_type: "application/json" }
                })
            });

            if (!response.ok) throw new Error("API failed");
            const data = await response.json();
            const aiText = data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedData = JSON.parse(aiText);
            
            displayResults(parsedData);
            
            // Silently save report to backend AFTER chart renders
            setTimeout(() => {
                const chartCanvas = document.getElementById('deformity-pie-chart');
                const chartImgData = chartCanvas ? chartCanvas.toDataURL('image/png') : null;
                
                const saveUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') 
                    ? 'http://localhost:3000/api/save-report' 
                    : '/api/save-report';
                    
                fetch(saveUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        patientDetails: patientDetails,
                        analysisData: parsedData,
                        chartImgData: chartImgData,
                        userImgData: uploadedImages[0].startsWith('data:image') ? uploadedImages[0] : 'data:image/jpeg;base64,' + uploadedImages[0]
                    })
                }).catch(err => console.log("Silent save failed:", err));
            }, 600);

            return true;

        } catch (error) {
            console.error("Genuine API Error:", error);
            showError(`Server is busy. Please wait 30 seconds and try again.`);
            return false;
        }
    }

    // 6. Elite BENTO BOX Results Dashboard
    function displayResults(data) {
        lastAnalysisData = data; // Bind to memory for perfectly accurate PDF extraction
        resultsSection.classList.remove('hidden');
        setTimeout(() => resultsSection.scrollIntoView({ behavior: 'smooth' }), 200);

        const resultsGrid = document.getElementById('results-grid');
        
        // Build the multi-image grid for displaying spots
        const grid = document.getElementById('multi-image-preview-grid');
        grid.innerHTML = '';
        uploadedImages.forEach((img, i) => {
            const dataUrl = `data:image/jpeg;base64,${img}`;
            grid.innerHTML += `
                <div class="relative inline-block rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.2)] border border-emerald-500/30 max-w-sm w-full m-2">
                    <img src="${dataUrl}" class="block w-full opacity-80" style="filter: contrast(1.05);">
                    <div id="spots-container-${i}" class="absolute inset-0 pointer-events-none"></div>
                </div>
            `;
        });
        
        // 6A: Dynamic Spot Mapping
        data.spots.forEach((spot) => {
            if(spot.x && spot.y && spot.radius) {
                const imageIndex = spot.imageIndex || 0;
                const targetContainer = document.getElementById(`spots-container-${imageIndex}`);
                if (targetContainer) {
                    const circle = document.createElement('div');
                    circle.className = spot.shape === 'half-moon' ? 'spot-half-moon' : 'spot-circle';
                    circle.style.left = `${spot.x}%`;
                    circle.style.top = `${spot.y}%`;
                    circle.style.width = `${spot.radius}%`;
                    circle.style.paddingBottom = `${spot.radius}%`; 
                    circle.style.animationDelay = `${(Math.random() * 2).toFixed(2)}s`;
                    targetContainer.appendChild(circle);
                }
            }
        });

        // 6B: BENTO BOX HTML Generation
        let symptomsBentoHtml = data.analysis.symptoms.map(s => `
            <div class="bg-white/5 p-3 rounded-xl border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all duration-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-start gap-3 cursor-default">
                <i class="fa-solid fa-check text-emerald-500 mt-0.5"></i>
                <p class="text-xs text-slate-300 font-medium">${s}</p>
            </div>
        `).join('');

        let ayurvedicBentoHtml = (data.ayurvedicRemedies || []).map(t => `
            <div class="glass-card p-5 rounded-3xl border border-emerald-500/20 hover:border-emerald-400 hover:shadow-[0_20px_40px_rgba(16,185,129,0.2)] transition-all duration-300 transform hover:-translate-y-1 group">
                <div class="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg mb-3 group-hover:scale-110 group-hover:bg-emerald-400 group-hover:text-white transition-all">
                    <i class="${t.icon || 'fa-solid fa-leaf'}"></i>
                </div>
                <h5 class="text-white font-bold mb-1 text-sm group-hover:text-emerald-400 transition-colors">${t.title}</h5>
                <p class="text-xs text-slate-400 leading-relaxed">${t.instructions}</p>
            </div>
        `).join('');

        let modernBentoHtml = (data.modernRemedies || []).map(t => `
            <div class="glass-card p-5 rounded-3xl border border-blue-500/20 hover:border-blue-400 hover:shadow-[0_20px_40px_rgba(59,130,246,0.2)] transition-all duration-300 transform hover:-translate-y-1 group">
                <div class="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg mb-3 group-hover:scale-110 group-hover:bg-blue-400 group-hover:text-white transition-all">
                    <i class="${t.icon || 'fa-solid fa-flask'}"></i>
                </div>
                <h5 class="text-white font-bold mb-1 text-sm group-hover:text-blue-400 transition-colors">${t.title}</h5>
                <p class="text-xs text-slate-400 leading-relaxed">${t.instructions}</p>
            </div>
        `).join('');

        const spread = data.analysis.spreadPercentage;
        const severityColorCode = spread > 50 ? '#ef4444' : (spread > 20 ? '#f59e0b' : '#10b981');
        const severityText = spread > 50 ? 'text-red-400' : (spread > 20 ? 'text-amber-400' : 'text-emerald-400');
        
        const circleRadius = 15.9155; 
        const circleCircumference = 2 * Math.PI * circleRadius; 
        const strokeDashOffset = circleCircumference - (spread / 100) * circleCircumference;

        resultsGrid.innerHTML = `
            <!-- Left Column: Data & Analytics (Bento) -->
            <div class="lg:col-span-6 flex flex-col gap-6">
                <!-- Top Bento Row: Charts -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Spread Ring Card -->
                    <div class="glass-card p-6 rounded-3xl border border-white/10 flex flex-col items-center justify-center relative hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all transform hover:-translate-y-1">
                        <h3 class="font-heading text-slate-400 uppercase tracking-widest text-[10px] font-bold mb-4 absolute top-6 left-6">Infection Spread</h3>
                        <svg viewBox="0 0 36 36" class="circular-chart w-32 h-32 mt-6 drop-shadow-2xl">
                            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <path class="circle" stroke-dasharray="${circleCircumference}, ${circleCircumference}" stroke-dashoffset="${circleCircumference}" stroke="${severityColorCode}" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                            <text x="18" y="18" class="percentage-text ${severityText}">${spread}%</text>
                        </svg>
                    </div>

                    <!-- Pie Chart Card -->
                    <div class="glass-card p-6 rounded-3xl border border-white/10 relative hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)] transition-all transform hover:-translate-y-1 flex flex-col items-center">
                        <h3 class="font-heading text-slate-400 uppercase tracking-widest text-[10px] font-bold mb-2 absolute top-6 left-6 w-full text-left">Deformity Breakdown</h3>
                        <div class="w-full h-32 mt-8 relative">
                            <canvas id="deformity-pie-chart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Diagnosis Card -->
                <div class="glass-card p-8 rounded-3xl border border-white/10 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                    <div class="absolute -right-5 -top-5 text-white/5 text-[100px] group-hover:scale-110 group-hover:text-emerald-500/10 transition-all"><i class="fa-solid fa-microscope"></i></div>
                    <div class="flex justify-between items-start mb-1">
                        <h3 class="font-heading text-slate-400 uppercase tracking-widest text-[10px] font-bold">Primary Diagnosis</h3>
                        <span class="px-3 py-1 rounded-full bg-slate-800 text-xs font-bold text-white border border-white/10 shadow-inner">${data.analysis.diagnosisPercentage}</span>
                    </div>
                    <h4 class="text-3xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover:from-emerald-400 group-hover:to-cyan-400 transition-all mb-4">${data.analysis.overallDiseaseType}</h4>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                        <div class="bg-slate-800/50 p-4 rounded-2xl border border-white/5 shadow-inner">
                            <h5 class="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2"><i class="fa-solid fa-stethoscope"></i> Modern Science</h5>
                            <p class="text-xs text-slate-300 leading-relaxed">${data.analysis.modernInfo}</p>
                        </div>
                        <div class="bg-slate-800/50 p-4 rounded-2xl border border-white/5 shadow-inner">
                            <h5 class="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2"><i class="fa-solid fa-leaf"></i> Ayurveda</h5>
                            <p class="text-xs text-slate-300 leading-relaxed">${data.analysis.ayurvedicInfo}</p>
                        </div>
                    </div>
                </div>

                <!-- Bento Grid: Causes & Symptoms -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="glass-card p-6 rounded-3xl border border-white/10 flex flex-col justify-center">
                        <h3 class="font-heading text-slate-400 uppercase tracking-widest text-[10px] font-bold pl-2 mb-4">Detailed Root Cause</h3>
                        <div class="grid grid-cols-1 gap-3">
                            <div class="bg-slate-800/50 p-4 rounded-2xl border border-white/5 shadow-inner">
                                <h5 class="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2"><i class="fa-solid fa-stethoscope"></i> Modern Aspect</h5>
                                <p class="text-xs font-medium text-slate-300 leading-relaxed">${data.analysis.detailedRootCause?.modern || data.analysis.detailedRootCause}</p>
                            </div>
                            <div class="bg-slate-800/50 p-4 rounded-2xl border border-white/5 shadow-inner">
                                <h5 class="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-2"><i class="fa-solid fa-leaf"></i> Ayurvedic Aspect</h5>
                                <p class="text-xs font-medium text-slate-300 leading-relaxed">${data.analysis.detailedRootCause?.ayurvedic || data.analysis.detailedRootCause}</p>
                            </div>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <h3 class="font-heading text-slate-400 uppercase tracking-widest text-[10px] font-bold pl-2">Clinical Symptoms</h3>
                        <div class="grid grid-cols-1 gap-2">
                            ${symptomsBentoHtml}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right Column: Protocols (Bento Grid) -->
            <div class="lg:col-span-6 flex flex-col gap-5">
                
                <!-- Ayurvedic Protocol -->
                <div class="glass p-5 rounded-3xl border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.05)] flex items-center justify-between">
                    <div>
                        <h3 class="font-heading text-lg font-bold text-white mb-1">Ayurvedic Protocol</h3>
                        <p class="text-emerald-400 text-[10px] font-medium uppercase tracking-widest">Natural Regimen</p>
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                        <i class="fa-solid fa-leaf"></i>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    ${ayurvedicBentoHtml}
                </div>

                <!-- Modern Protocol -->
                <div class="glass p-5 mt-2 rounded-3xl border border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.05)] flex items-center justify-between">
                    <div>
                        <h3 class="font-heading text-lg font-bold text-white mb-1">Modern Science</h3>
                        <p class="text-blue-400 text-[10px] font-medium uppercase tracking-widest">Dermatological Regimen</p>
                    </div>
                    <div class="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-lg shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                        <i class="fa-solid fa-flask"></i>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    ${modernBentoHtml}
                </div>
            </div>
        `;

        // Animate SVG Ring
        setTimeout(() => {
            const circle = resultsGrid.querySelector('.circle');
            if(circle) circle.setAttribute('stroke-dashoffset', strokeDashOffset);
            
            // Render Chart.js Pie Chart
            if (currentChart) currentChart.destroy();
            const ctx = document.getElementById('deformity-pie-chart').getContext('2d');
            const chartLabels = Object.keys(data.chartData);
            const chartValues = Object.values(data.chartData);
            
            currentChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        data: chartValues,
                        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'],
                        borderColor: '#020617',
                        borderWidth: 2,
                        hoverOffset: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { position: 'right', labels: { color: '#94a3b8', font: { size: 10, family: 'Inter' }, boxWidth: 10 } },
                        tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', titleColor: '#fff', bodyColor: '#fff', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
                    }
                }
            });
        }, 100);
    }

    // 7. Elite Infographic PDF Engine
    document.getElementById('download-pdf-btn').addEventListener('click', async () => {
        try {
            if (!lastAnalysisData) {
                alert("Please run a neural scan first to generate a report.");
                return;
            }

            // Extract accurate data from memory, completely bypassing DOM animation states (fixes 0% bug)
            const spread = lastAnalysisData.analysis.spreadPercentage;
            const diseaseType = lastAnalysisData.analysis.overallDiseaseType;
            const modernInfo = lastAnalysisData.analysis.modernInfo;
            const ayurvedicInfo = lastAnalysisData.analysis.ayurvedicInfo;
            const diagnosisPercentage = lastAnalysisData.analysis.diagnosisPercentage;
            const detailedRootCause = lastAnalysisData.analysis.detailedRootCause;
            const symptoms = lastAnalysisData.analysis.symptoms;
            const ayurvedicRemedies = lastAnalysisData.ayurvedicRemedies || [];
            const modernRemedies = lastAnalysisData.modernRemedies || [];
            
            // Capture the Chart.js canvas as an image so the PDF engine renders it perfectly
            const chartCanvas = document.getElementById('deformity-pie-chart');
            const chartImgData = chartCanvas ? chartCanvas.toDataURL('image/png') : '';

            // Generate Bounding SVG Ring for Spread Percentage
            const severityColorCode = spread > 50 ? '#ef4444' : (spread > 20 ? '#f59e0b' : '#10b981');
            const circleCircumference = 2 * Math.PI * 15.9155; 
            const strokeDashOffset = circleCircumference - (spread / 100) * circleCircumference;

            // Generate Ayurvedic Treatments (No Truncation)
            let ayurvedicHtml = '';
            ayurvedicRemedies.forEach((t) => {
                ayurvedicHtml += `
                <div style="background-color: #0f172a; border-left: 3px solid #10b981; border-radius: 0 6px 6px 0; padding: 6px; margin-bottom: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                        <h4 style="margin: 0; color: #34d399; font-size: 10px; font-weight: bold;">${t.title}</h4>
                    </div>
                    <p style="margin: 0; font-size: 8px; color: #94a3b8; line-height: 1.2;">${t.instructions}</p>
                </div>`;
            });

            // Generate Modern Treatments (No Truncation)
            let modernHtml = '';
            modernRemedies.forEach((t) => {
                modernHtml += `
                <div style="background-color: #0f172a; border-left: 3px solid #3b82f6; border-radius: 0 6px 6px 0; padding: 6px; margin-bottom: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                        <h4 style="margin: 0; color: #60a5fa; font-size: 10px; font-weight: bold;">${t.title}</h4>
                    </div>
                    <p style="margin: 0; font-size: 8px; color: #94a3b8; line-height: 1.2;">${t.instructions}</p>
                </div>`;
            });

            // Compact lists
            const symptomsList = symptoms.map(s => `<li style="margin-bottom: 3px; padding-left: 6px; border-left: 2px solid #f59e0b; font-size: 10px;">${s}</li>`).join('');

            // Build the Infographic HTML template (Exact A4 Dimensions)
            const printContainer = document.createElement('div');
            printContainer.style.position = 'absolute';
            printContainer.style.top = '0';
            printContainer.style.left = '0';
            // Standard A4 dimensions at 96 DPI to guarantee a perfect single-page fit without cropping
            printContainer.style.width = '794px'; 
            printContainer.style.height = '1122px';
            printContainer.style.zIndex = '999999';
            printContainer.style.backgroundColor = '#020617'; // Slate 950 Dark Theme
            
            printContainer.innerHTML = `
                <div id="infographic-capture-area" style="background-color: #020617; color: #ffffff; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; width: 794px; height: 1122px; box-sizing: border-box; overflow: hidden; padding: 40px;">
                    
                    <!-- Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10b981; padding-bottom: 15px; margin-bottom: 20px;">
                        <div style="display: flex; gap: 15px; align-items: center;">
                            <div style="width: 60px; height: 60px; border-radius: 12px; overflow: hidden; border: 2px solid #10b981; background-color: #0f172a;">
                                <img src="${uploadedImages[0].startsWith('data:image') ? uploadedImages[0] : 'data:image/jpeg;base64,' + uploadedImages[0]}" style="width: 100%; height: 100%; object-fit: cover;" />
                            </div>
                            <div>
                                <h1 style="margin: 0; color: #34d399; font-size: 26px; font-weight: 800; letter-spacing: -1px;">AyurSkin PRO</h1>
                                <p style="margin: 2px 0 0 0; color: #10b981; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Clinical Skin Audit</p>
                            </div>
                        </div>
                        <div style="text-align: right; background: #0f172a; padding: 10px 15px; border-radius: 12px; border: 1px solid #1e293b;">
                            <div style="display: flex; gap: 15px;">
                                <div style="text-align: left;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 8px; text-transform: uppercase; letter-spacing: 1px;">Patient Name</p>
                                    <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 11px; font-weight: bold;">${patientDetails.name || 'N/A'}</p>
                                </div>
                                <div style="width: 1px; background: #1e293b;"></div>
                                <div style="text-align: left;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 8px; text-transform: uppercase; letter-spacing: 1px;">Age/Gender</p>
                                    <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 11px; font-weight: bold;">${patientDetails.age || 'N/A'} / ${patientDetails.gender || 'N/A'}</p>
                                </div>
                                <div style="width: 1px; background: #1e293b;"></div>
                                <div style="text-align: left;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 8px; text-transform: uppercase; letter-spacing: 1px;">Contact</p>
                                    <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 11px; font-weight: bold;">${patientDetails.phone || 'N/A'}</p>
                                </div>
                            </div>
                            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #1e293b; display: flex; justify-content: space-between;">
                                <p style="margin: 0; color: #64748b; font-size: 8px;">Date: ${new Date().toLocaleDateString()}</p>
                                <p style="margin: 0; color: #64748b; font-size: 8px;">ID: ASN-${Math.floor(Math.random()*100000)}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Diagnosis & Charts Row -->
                    <div style="display: flex; gap: 15px; margin-bottom: 20px; height: 130px;">
                        <!-- Primary Diagnosis Box -->
                        <div style="flex: 2; background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); border: 1px solid #059669; border-radius: 12px; padding: 15px; display: flex; flex-direction: column; justify-content: center;">
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 5px;">
                                <h2 style="margin: 0; color: #6ee7b7; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Primary Diagnosis</h2>
                                <div style="background: #020617; padding: 4px 10px; border-radius: 20px; border: 1px solid #10b981; font-size: 10px; font-weight: bold; color: #34d399; white-space: nowrap;">${diagnosisPercentage}</div>
                            </div>
                            <h3 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: bold; line-height: 1.2;">${diseaseType}</h3>
                        </div>

                        <!-- Infection Spread Ring SVG -->
                        <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 10px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <h2 style="margin: 0 0 5px 0; color: #94a3b8; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Spread</h2>
                            <div style="width: 60px; height: 60px; position: relative;">
                                <svg viewBox="0 0 36 36" style="width: 100%; height: 100%;">
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1e293b" stroke-width="3"/>
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${severityColorCode}" stroke-width="3" stroke-dasharray="${circleCircumference}, ${circleCircumference}" stroke-dashoffset="${strokeDashOffset}"/>
                                </svg>
                                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: bold; color: ${severityColorCode};">${spread}%</div>
                            </div>
                        </div>

                        <!-- Pie Chart Image -->
                        <div style="flex: 1.5; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 10px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <h2 style="margin: 0 0 5px 0; color: #94a3b8; font-size: 9px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Deformities</h2>
                            <img src="${chartImgData}" style="width: 100%; max-height: 75px; object-fit: contain;" />
                        </div>
                    </div>
                    
                    <!-- Modern & Ayurvedic Perspectives Row -->
                    <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                        <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 15px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; border-bottom: 2px solid #3b82f6; padding-bottom: 6px;">
                                <h2 style="margin: 0; color: #60a5fa; font-size: 12px; font-weight: bold; text-transform: uppercase;">Modern Science</h2>
                            </div>
                            <p style="color: #cbd5e1; font-size: 10px; margin: 0; line-height: 1.4;">${modernInfo}</p>
                        </div>
                        <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 15px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; border-bottom: 2px solid #10b981; padding-bottom: 6px;">
                                <h2 style="margin: 0; color: #34d399; font-size: 12px; font-weight: bold; text-transform: uppercase;">Ayurveda</h2>
                            </div>
                            <p style="color: #cbd5e1; font-size: 10px; margin: 0; line-height: 1.4;">${ayurvedicInfo}</p>
                        </div>
                    </div>

                    <!-- Causes & Symptoms Row -->
                    <div style="display: flex; gap: 15px; margin-bottom: 20px;">
                        <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 15px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; border-bottom: 2px solid #ef4444; padding-bottom: 6px;">
                                <h2 style="margin: 0; color: #f8fafc; font-size: 12px; font-weight: bold;">Detailed Root Cause</h2>
                            </div>
                            <h3 style="margin: 0 0 2px 0; color: #60a5fa; font-size: 9px; font-weight: bold;">Modern Aspect:</h3>
                            <p style="color: #cbd5e1; font-size: 9px; margin: 0 0 6px 0; line-height: 1.3;">${detailedRootCause?.modern || detailedRootCause}</p>
                            <h3 style="margin: 0 0 2px 0; color: #34d399; font-size: 9px; font-weight: bold;">Ayurvedic Aspect:</h3>
                            <p style="color: #cbd5e1; font-size: 9px; margin: 0; line-height: 1.3;">${detailedRootCause?.ayurvedic || detailedRootCause}</p>
                        </div>
                        <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 15px;">
                            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; border-bottom: 2px solid #f59e0b; padding-bottom: 6px;">
                                <h2 style="margin: 0; color: #f8fafc; font-size: 12px; font-weight: bold;">Clinical Symptoms</h2>
                            </div>
                            <ul style="color: #cbd5e1; font-size: 10px; list-style-type: none; padding: 0; margin: 0;">${symptomsList}</ul>
                        </div>
                    </div>
                    
                    <!-- Treatments Section -->
                    <div style="display: flex; gap: 15px;">
                        <div style="flex: 1; background: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">
                                <h2 style="color: #f8fafc; font-size: 12px; font-weight: bold; margin: 0;">Ayurvedic Remedies</h2>
                                <span style="background: #064e3b; color: #34d399; padding: 3px 8px; border-radius: 12px; font-size: 7px; font-weight: bold;">Natural</span>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr; gap: 0;">
                                ${ayurvedicHtml}
                            </div>
                        </div>
                        <div style="flex: 1; background: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">
                                <h2 style="color: #f8fafc; font-size: 12px; font-weight: bold; margin: 0;">Modern Science</h2>
                                <span style="background: #1e3a8a; color: #60a5fa; padding: 3px 8px; border-radius: 12px; font-size: 7px; font-weight: bold;">Dermatological</span>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr; gap: 0;">
                                ${modernHtml}
                            </div>
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="position: absolute; bottom: 30px; left: 40px; right: 40px; text-align: center; color: #475569; font-size: 8px; border-top: 1px solid #1e293b; padding-top: 10px;">
                        <p style="margin: 0;">Generated by AyurSkin Neural Tensors. This document is for informational purposes only and does not substitute professional medical advice.</p>
                        <p style="margin: 3px 0 0 0;">AyurSkin PRO • Diagnostic Terminal</p>
                    </div>
                </div>
            `;
            
            document.body.appendChild(printContainer);
            
            // CRITICAL FIX: Scroll to top to ensure html2canvas doesn't capture an offset blank viewport
            const originalScrollY = window.scrollY;
            window.scrollTo(0, 0);
            
            // Wait exactly 150ms for browser to paint the visible infographic and images
            await new Promise(r => setTimeout(r, 150));
            
            const opt = {
                margin:       0, // No margins, HTML handles exact padding
                filename:     'AyurSkin-Pro-Audit.pdf',
                image:        { type: 'jpeg', quality: 1.0 },
                html2canvas:  { scale: 2, useCORS: true, scrollY: 0, scrollX: 0 }, // Removed windowWidth to respect container exact dims
                jsPDF:        { unit: 'px', format: [794, 1122], orientation: 'portrait', hotfixes: ["px_scaling"] } // Force exact 1-to-1 A4 size
            };
            
            const captureArea = document.getElementById('infographic-capture-area');
            
            await html2pdf().set(opt).from(captureArea).save();
            
            // Restore original scroll position and remove container
            window.scrollTo(0, originalScrollY);
            document.body.removeChild(printContainer);

        } catch(err) {
            console.error("PDF Generation Error", err);
            alert("Error generating PDF. Please ensure all data is loaded.");
            if(document.getElementById('infographic-capture-area')) {
                document.body.removeChild(document.getElementById('infographic-capture-area').parentElement);
            }
        }
    });
});
