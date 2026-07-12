// Global Variables
let uploadedImageBase64 = '';
let isFaceApiLoaded = false;
let stream = null;
let currentChart = null; // Store chart instance to destroy if re-running
let lastAnalysisData = null; // Memory binding for PDF accuracy
let patientDetails = { name: '', age: '', gender: '', phone: '' };

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
        inputSelection.classList.remove('hidden');
        
        // Update subtitle
        const subtitle = document.querySelector('#analyze-section p');
        if(subtitle) subtitle.innerText = "System ready. Capture or upload a frontal, well-lit photograph for microscopic tensor analysis.";
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

    // 1. Load Face-API Models genuinely
    try {
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        isFaceApiLoaded = true;
    } catch (e) {
        console.warn("Could not load face-api models. Bypassing detection.");
    }

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

    captureBtn.addEventListener('click', () => {
        cameraCanvas.width = cameraVideo.videoWidth;
        cameraCanvas.height = cameraVideo.videoHeight;
        const ctx = cameraCanvas.getContext('2d');
        ctx.translate(cameraCanvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);
        
        const dataUrl = cameraCanvas.toDataURL('image/jpeg', 0.9);
        uploadedImageBase64 = dataUrl.split(',')[1];
        
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
            uploadedImageBase64 = event.target.result.split(',')[1];
            inputSelection.classList.add('hidden');
            displayPreview(event.target.result);
        };
        reader.readAsDataURL(file);
    });

    function displayPreview(dataUrl) {
        imagePreview.src = dataUrl;
        previewContainer.classList.remove('hidden');
        errorMessage.classList.add('hidden');
        actionButtons.classList.add('hidden');
        startAnalysisBtn.classList.add('hidden');
        
        imagePreview.onload = () => performGenuineFaceDetection();
    }

    function showError(msg) {
        errorText.innerText = msg;
        errorMessage.classList.remove('hidden');
        actionButtons.classList.remove('hidden');
        startAnalysisBtn.classList.add('hidden');
    }

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
        inputSelection.classList.remove('hidden');
        previewContainer.classList.add('hidden');
        resultsSection.classList.add('hidden');
        fileInput.value = '';
        document.getElementById('spots-container').innerHTML = '';
        scanLine.classList.add('hidden');
    });

    // 4. Advanced Progress Engine
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
                    scanLine.classList.add('hidden');
                    progressContainer.classList.add('hidden');
                }, 800);
            } else {
                scanLine.classList.add('hidden');
                progressContainer.classList.add('hidden');
            }
        });
    });

    // 5. Elite Gemini API Call (Chart Data included)
    async function fetchGeminiAnalysis() {
        const prompt = `Perform an EXHAUSTIVE microscopic clinical Ayurvedic skin audit on this facial image.
        Crucially, DO NOT limit your analysis to just acne. You MUST accurately diagnose and identify a wide spectrum of skin diseases and abnormalities if they are present on the user's skin. 
        Look closely for:
        - Acne & Eruptions: Pimples (Yauvana Pidaka), Blackheads/Whiteheads (Mukhadushika), Papules/Pustules (Pidaka), Nodules, Boils (Vidradhi).
        - Pigmentation & Color: Hyperpigmentation/Melasma/Sun Spots (Vyanga), Freckles (Neelika), Dark Circles (Shyawata), Vitiligo (Shwitra), Redness (Raktadushti), Pallor.
        - Inflammation & Rashes: Eczema/Dermatitis (Vicharchika), Psoriasis (Ekakushtha), Rosacea (Mukharunata), Urticaria (Sheetapitta), Fungal/Ringworm (Dadru).
        - Texture & Aging: Enlarged Pores (Romakupa Vistara), Wrinkles (Vali), Fine Lines, Sagging (Twacha Shaithilya), Scars (Vrana Chihna), Roughness.
        - Other: Warts (Charmakeela), Moles (Tilakalaka), Cysts (Granthi), Swelling/Edema (Shotha), Dryness (Ruksha Twacha), Excess Oil (Snigdha Twacha).
        
        ONLY report conditions you GENUINELY detect in the image based on proper clinical analysis. Do not invent conditions.

        Provide a strictly valid JSON response containing EXACTLY these keys:
        1. "spots": Array of ALL detected lesions, rashes, patches, spots, and deformities. You must return a massive array (up to 50 items) mapping EVERY single affected area.
           - "type": string (Name the condition, e.g., "Acne", "Melasma", "Eczema Patch", "Wrinkle", "Large Pore", "Redness", "Fungal Lesion")
           - "x": number (percentage 0-100 for X coordinate)
           - "y": number (percentage 0-100 for Y coordinate)
           - "radius": number (Size of the circle. 1-2 for tiny dots, 3-6 for medium spots, 7-15 for large rashes/patches)
        2. "analysis": An object containing:
           - "overallDiseaseType": string (The primary Ayurvedic diagnosis, e.g., "Severe Mukhadushika", "Vicharchika (Eczema)", "Vyanga (Melasma)")
           - "causes": array of 3-5 strings (Keep these SHORT, punchy, like "High Pitta Dosha", "UV Damage", "Fungal Overgrowth")
           - "spreadPercentage": number (Integer 1-100 representing total facial area affected)
           - "symptoms": array of 3-5 short strings (e.g. "Inflamed pores", "Flaky red patches", "Severe hyperpigmentation")
        3. "chartData": An object mapping deformity/condition types to their percentages (Must add up to 100).
           - e.g. {"Eczema": 40, "Pigmentation": 30, "Wrinkles": 20, "Pores": 10}
        4. "treatments": Array of objects for specific Ayurvedic remedies tailored to the EXACT diagnosis.
           - "title": string (Remedy Name)
           - "instructions": string (Exact steps, short and punchy)
           - "icon": string (A font-awesome class name, e.g. "fa-solid fa-leaf", "fa-solid fa-droplet", "fa-solid fa-mortar-pestle", "fa-solid fa-spa")
        Do not wrap in markdown \`\`\`json. Return pure JSON only.`;

        try {
            // Automatically switch between local development and production URLs
            const apiUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') 
                ? 'http://localhost:3000/api/analyze' 
                : '/api/analyze';
                
            const response = await fetch(apiUrl, {
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
                        userImgData: uploadedImageBase64.startsWith('data:image') ? uploadedImageBase64 : 'data:image/jpeg;base64,' + uploadedImageBase64
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
        const spotsContainer = document.getElementById('spots-container');
        
        // 6A: Dynamic Spot Mapping
        data.spots.forEach((spot) => {
            if(spot.x && spot.y && spot.radius) {
                const circle = document.createElement('div');
                circle.className = 'spot-circle';
                circle.style.left = `${spot.x}%`;
                circle.style.top = `${spot.y}%`;
                circle.style.width = `${spot.radius}%`;
                circle.style.paddingBottom = `${spot.radius}%`; 
                circle.style.animationDelay = `${(Math.random() * 2).toFixed(2)}s`;
                spotsContainer.appendChild(circle);
            }
        });

        // 6B: BENTO BOX HTML Generation
        let causesBentoHtml = data.analysis.causes.map(c => `
            <div class="glass p-4 rounded-2xl border border-white/5 hover:border-amber-500/50 hover:bg-amber-500/10 transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 shadow-lg group cursor-default">
                <div class="text-amber-500 text-xl mb-2 group-hover:scale-110 transition-transform"><i class="fa-solid fa-triangle-exclamation"></i></div>
                <p class="text-sm font-medium text-slate-200">${c}</p>
            </div>
        `).join('');

        let symptomsBentoHtml = data.analysis.symptoms.map(s => `
            <div class="bg-white/5 p-3 rounded-xl border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all duration-300 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-start gap-3 cursor-default">
                <i class="fa-solid fa-check text-emerald-500 mt-0.5"></i>
                <p class="text-xs text-slate-300 font-medium">${s}</p>
            </div>
        `).join('');

        let treatmentsBentoHtml = data.treatments.map(t => `
            <div class="glass-card p-6 rounded-3xl border border-emerald-500/20 hover:border-emerald-400 hover:shadow-[0_20px_40px_rgba(16,185,129,0.2)] transition-all duration-300 transform hover:-translate-y-2 group">
                <div class="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl mb-4 group-hover:scale-110 group-hover:bg-emerald-400 group-hover:text-white transition-all">
                    <i class="${t.icon || 'fa-solid fa-leaf'}"></i>
                </div>
                <h5 class="text-white font-bold mb-2 text-lg group-hover:text-emerald-400 transition-colors">${t.title}</h5>
                <p class="text-sm text-slate-400 leading-relaxed">${t.instructions}</p>
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
                    <h3 class="font-heading text-slate-400 uppercase tracking-widest text-[10px] font-bold mb-1">Primary Diagnosis</h3>
                    <h4 class="text-3xl font-bold text-white bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover:from-emerald-400 group-hover:to-cyan-400 transition-all">${data.analysis.overallDiseaseType}</h4>
                </div>

                <!-- Bento Grid: Causes & Symptoms -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <h3 class="font-heading text-slate-400 uppercase tracking-widest text-[10px] font-bold pl-2">Root Causes</h3>
                        <div class="grid grid-cols-1 gap-3">
                            ${causesBentoHtml}
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

            <!-- Right Column: Ayurvedic Protocol (Bento Grid) -->
            <div class="lg:col-span-6 flex flex-col gap-6">
                <div class="glass p-8 rounded-3xl border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.05)] flex items-center justify-between">
                    <div>
                        <h3 class="font-heading text-2xl font-bold text-white mb-1">Ayurvedic Protocol</h3>
                        <p class="text-emerald-400 text-xs font-medium uppercase tracking-widest">Prescribed Regimen</p>
                    </div>
                    <div class="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                        <i class="fa-solid fa-star-of-life"></i>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    ${treatmentsBentoHtml}
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
            const causes = lastAnalysisData.analysis.causes;
            const symptoms = lastAnalysisData.analysis.symptoms;
            const treatments = lastAnalysisData.treatments;
            
            // Capture the Chart.js canvas as an image so the PDF engine renders it perfectly
            const chartCanvas = document.getElementById('deformity-pie-chart');
            const chartImgData = chartCanvas ? chartCanvas.toDataURL('image/png') : '';

            // Generate Bounding SVG Ring for Spread Percentage
            const severityColorCode = spread > 50 ? '#ef4444' : (spread > 20 ? '#f59e0b' : '#10b981');
            const circleCircumference = 2 * Math.PI * 15.9155; 
            const strokeDashOffset = circleCircumference - (spread / 100) * circleCircumference;

            // Condense Ayurvedic Treatments to top 3 max to perfectly fit on a single page
            const topTreatments = treatments.slice(0, 3);
            let treatmentsHtml = '';
            topTreatments.forEach((t) => {
                treatmentsHtml += `
                <div style="background-color: #0f172a; border-left: 4px solid #10b981; border-radius: 0 8px 8px 0; padding: 15px; margin-bottom: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 5px;">
                        <h4 style="margin: 0; color: #34d399; font-size: 14px; font-weight: bold;">${t.title}</h4>
                    </div>
                    <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.4;">${t.instructions}</p>
                </div>`;
            });

            // Compact lists
            const causesList = causes.map(c => `<li style="margin-bottom: 4px; padding-left: 8px; border-left: 2px solid #ef4444;">${c}</li>`).join('');
            const symptomsList = symptoms.map(s => `<li style="margin-bottom: 4px; padding-left: 8px; border-left: 2px solid #f59e0b;">${s}</li>`).join('');

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
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 25px;">
                        <div style="display: flex; gap: 15px; align-items: center;">
                            <div style="width: 60px; height: 60px; border-radius: 12px; overflow: hidden; border: 2px solid #10b981; background-color: #0f172a;">
                                <img src="${uploadedImageBase64.startsWith('data:image') ? uploadedImageBase64 : 'data:image/jpeg;base64,' + uploadedImageBase64}" style="width: 100%; height: 100%; object-fit: cover;" />
                            </div>
                            <div>
                                <h1 style="margin: 0; color: #34d399; font-size: 28px; font-weight: 800; letter-spacing: -1px;">AyurSkin PRO</h1>
                                <p style="margin: 3px 0 0 0; color: #10b981; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px;">Clinical Microscopic Skin Audit</p>
                            </div>
                        </div>
                        <div style="text-align: right; background: #0f172a; padding: 12px 20px; border-radius: 12px; border: 1px solid #1e293b;">
                            <div style="display: flex; gap: 20px;">
                                <div style="text-align: left;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 9px; text-transform: uppercase; letter-spacing: 1px;">Patient Name</p>
                                    <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 13px; font-weight: bold;">${patientDetails.name || 'N/A'}</p>
                                </div>
                                <div style="width: 1px; background: #1e293b;"></div>
                                <div style="text-align: left;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 9px; text-transform: uppercase; letter-spacing: 1px;">Age / Gender</p>
                                    <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 13px; font-weight: bold;">${patientDetails.age || 'N/A'} / ${patientDetails.gender || 'N/A'}</p>
                                </div>
                                <div style="width: 1px; background: #1e293b;"></div>
                                <div style="text-align: left;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 9px; text-transform: uppercase; letter-spacing: 1px;">Contact</p>
                                    <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 13px; font-weight: bold;">${patientDetails.phone || 'N/A'}</p>
                                </div>
                            </div>
                            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #1e293b; display: flex; justify-content: space-between;">
                                <p style="margin: 0; color: #64748b; font-size: 9px;">Date: ${new Date().toLocaleDateString()}</p>
                                <p style="margin: 0; color: #64748b; font-size: 9px;">Report ID: ASN-${Math.floor(Math.random()*100000)}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Diagnosis & Charts Row (Compact 3 columns) -->
                    <div style="display: flex; gap: 15px; margin-bottom: 25px; height: 140px;">
                        <!-- Primary Diagnosis Box -->
                        <div style="flex: 2; background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); border: 1px solid #059669; border-radius: 12px; padding: 20px; display: flex; flex-direction: column; justify-content: center;">
                            <h2 style="margin: 0 0 8px 0; color: #6ee7b7; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Primary Diagnosis</h2>
                            <h3 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold; line-height: 1.1;">${diseaseType}</h3>
                        </div>

                        <!-- Infection Spread Ring SVG -->
                        <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 15px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <h2 style="margin: 0 0 10px 0; color: #94a3b8; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Spread</h2>
                            <div style="width: 70px; height: 70px; position: relative;">
                                <svg viewBox="0 0 36 36" style="width: 100%; height: 100%;">
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1e293b" stroke-width="3"/>
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${severityColorCode}" stroke-width="3" stroke-dasharray="${circleCircumference}, ${circleCircumference}" stroke-dashoffset="${strokeDashOffset}"/>
                                </svg>
                                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold; color: ${severityColorCode};">${spread}%</div>
                            </div>
                        </div>

                        <!-- Pie Chart Image -->
                        <div style="flex: 1.5; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 15px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <h2 style="margin: 0 0 10px 0; color: #94a3b8; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Deformities</h2>
                            <img src="${chartImgData}" style="width: 100%; max-height: 80px; object-fit: contain;" />
                        </div>
                    </div>
                    
                    <!-- Causes & Symptoms Row -->
                    <div style="display: flex; gap: 15px; margin-bottom: 25px;">
                        <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; border-bottom: 2px solid #ef4444; padding-bottom: 8px;">
                                <h2 style="margin: 0; color: #f8fafc; font-size: 14px; font-weight: bold;">Root Causes</h2>
                            </div>
                            <ul style="color: #cbd5e1; font-size: 11px; list-style-type: none; padding: 0; margin: 0;">${causesList}</ul>
                        </div>
                        <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 20px;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px; border-bottom: 2px solid #f59e0b; padding-bottom: 8px;">
                                <h2 style="margin: 0; color: #f8fafc; font-size: 14px; font-weight: bold;">Clinical Symptoms</h2>
                            </div>
                            <ul style="color: #cbd5e1; font-size: 11px; list-style-type: none; padding: 0; margin: 0;">${symptomsList}</ul>
                        </div>
                    </div>
                    
                    <!-- Treatments Section -->
                    <div style="background: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 25px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #1e293b; padding-bottom: 10px;">
                            <h2 style="color: #f8fafc; font-size: 16px; font-weight: bold; margin: 0;">Ayurvedic Recovery Protocol</h2>
                            <span style="background: #064e3b; color: #34d399; padding: 4px 12px; border-radius: 12px; font-size: 9px; font-weight: bold;">AI Prescribed</span>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr; gap: 0;">
                            ${treatmentsHtml}
                        </div>
                    </div>
                    
                    <!-- Footer -->
                    <div style="position: absolute; bottom: 40px; left: 40px; right: 40px; text-align: center; color: #475569; font-size: 9px; border-top: 1px solid #1e293b; padding-top: 15px;">
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
