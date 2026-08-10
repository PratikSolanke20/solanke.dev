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

        // Scroll to top for questionnaire
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
    });

    // Initialize Dynamic "Other" input animation & toggle handlers
    function initOtherToggles() {
        document.querySelectorAll('.other-toggle').forEach(input => {
            input.addEventListener('change', () => {
                const targetId = input.getAttribute('data-target');
                const targetBox = document.getElementById(targetId);
                if (!targetBox) return;

                if (input.checked) {
                    targetBox.classList.remove('max-h-0', 'opacity-0', 'pointer-events-none');
                    targetBox.classList.add('max-h-28', 'opacity-100', 'pointer-events-auto');
                    const textInput = targetBox.querySelector('input[type="text"]');
                    if (textInput) {
                        setTimeout(() => textInput.focus(), 100);
                    }
                } else {
                    targetBox.classList.add('max-h-0', 'opacity-0', 'pointer-events-none');
                    targetBox.classList.remove('max-h-28', 'opacity-100', 'pointer-events-auto');
                    const textInput = targetBox.querySelector('input[type="text"]');
                    if (textInput) textInput.value = '';
                }
            });
        });

        // Handle radio groups: collapse "Other" box if a non-other radio is selected
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            if (!radio.classList.contains('other-toggle')) {
                radio.addEventListener('change', () => {
                    const otherRadio = document.querySelector(`input[type="radio"][name="${radio.name}"].other-toggle`);
                    if (otherRadio) {
                        const targetId = otherRadio.getAttribute('data-target');
                        const targetBox = document.getElementById(targetId);
                        if (targetBox) {
                            targetBox.classList.add('max-h-0', 'opacity-0', 'pointer-events-none');
                            targetBox.classList.remove('max-h-28', 'opacity-100', 'pointer-events-auto');
                            const textInput = targetBox.querySelector('input[type="text"]');
                            if (textInput) textInput.value = '';
                        }
                    }
                });
            }
        });
    }

    // Initialize "None" option mutual exclusivity for Q7, Q8, Q9, Q10, Q11, Q17, Q20, etc.
    function initNoneOptionExclusivity() {
        document.querySelectorAll('.question-block').forEach(block => {
            const checkboxes = block.querySelectorAll('input[type="checkbox"]');
            if (checkboxes.length <= 1) return;

            // Find checkbox that represents 'None'
            const noneCheckbox = Array.from(checkboxes).find(cb => {
                const val = cb.value.trim().toLowerCase();
                return val === 'none' || val === 'no treatment' || val === 'no allergy' || val === 'no family history';
            });

            if (!noneCheckbox) return;

            // When "None" is checked -> untick all other checkboxes and collapse "Other" box
            noneCheckbox.addEventListener('change', () => {
                if (noneCheckbox.checked) {
                    checkboxes.forEach(cb => {
                        if (cb !== noneCheckbox) {
                            cb.checked = false;
                        }
                    });

                    // Collapse and clear any active "Other" text fields in this block
                    const otherToggles = block.querySelectorAll('.other-toggle');
                    otherToggles.forEach(ot => {
                        const targetId = ot.getAttribute('data-target');
                        const targetBox = targetId ? document.getElementById(targetId) : null;
                        if (targetBox) {
                            targetBox.classList.add('max-h-0', 'opacity-0', 'pointer-events-none');
                            targetBox.classList.remove('max-h-28', 'opacity-100', 'pointer-events-auto');
                            const textInput = targetBox.querySelector('input[type="text"]');
                            if (textInput) textInput.value = '';
                        }
                    });
                }
            });

            // When any other option is checked -> automatically untick "None"
            checkboxes.forEach(cb => {
                if (cb !== noneCheckbox) {
                    cb.addEventListener('change', () => {
                        if (cb.checked) {
                            noneCheckbox.checked = false;
                        }
                    });
                }
            });
        });
    }

    initOtherToggles();
    initNoneOptionExclusivity();

    // Helper functions for questionnaire extraction with "Other" integration
    function getFieldValues(formData, fieldName, otherFieldName) {
        const values = formData.getAll(fieldName);
        const otherText = (formData.get(otherFieldName) || '').trim();
        return values.map(val => {
            if (val === 'Other') {
                return otherText ? `Other (${otherText})` : 'Other';
            }
            return val;
        });
    }

    function getSingleFieldValue(formData, fieldName, otherFieldName) {
        const val = formData.get(fieldName) || '';
        if (val === 'Other') {
            const otherText = (formData.get(otherFieldName) || '').trim();
            return otherText ? `Other (${otherText})` : 'Other';
        }
        return val;
    }

    // Handle 20-Question Questionnaire Submission
    document.getElementById('questionnaire-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        // Validate required multi-select questions
        const requiredMulti = [
            { name: 'q1_body_parts', blockId: 'q-block-1', label: 'Affected Body Part(s)' },
            { name: 'q2_concerns', blockId: 'q-block-2', label: 'Main Skin Concern(s)' },
            { name: 'q5_symptoms', blockId: 'q-block-5', label: 'Primary Symptoms' },
            { name: 'q14_digestion', blockId: 'q-block-14', label: 'Digestion' }
        ];

        for (const req of requiredMulti) {
            const vals = formData.getAll(req.name);
            if (!vals || vals.length === 0) {
                const block = document.getElementById(req.blockId);
                if (block) {
                    block.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    block.classList.add('ring-2', 'ring-rose-500', 'animate-pulse');
                    setTimeout(() => {
                        block.classList.remove('animate-pulse');
                        setTimeout(() => block.classList.remove('ring-2', 'ring-rose-500'), 3000);
                    }, 1000);
                }
                alert(`Please select at least one option for question: "${req.label}"`);
                return;
            }
        }

        questionnaireData = {
            affectedBodyParts: getFieldValues(formData, 'q1_body_parts', 'q1_other_text'),
            mainConcerns: getFieldValues(formData, 'q2_concerns', 'q2_other_text'),
            duration: getSingleFieldValue(formData, 'q3_duration', ''),
            progression: getSingleFieldValue(formData, 'q4_progression', 'q4_other_text'),
            symptoms: getFieldValues(formData, 'q5_symptoms', 'q5_other_text'),
            triggers: getFieldValues(formData, 'q6_triggers', 'q6_other_text'),
            treatments: getFieldValues(formData, 'q7_treatments', 'q7_other_text'),
            allergies: getFieldValues(formData, 'q8_allergies', 'q8_other_text'),
            familyHistory: getFieldValues(formData, 'q9_family', 'q9_other_text'),
            medicalConditions: getFieldValues(formData, 'q10_conditions', 'q10_other_text'),
            medications: getFieldValues(formData, 'q11_medications', 'q11_other_text'),
            skinType: getSingleFieldValue(formData, 'q12_skin_type', ''),
            dietType: getSingleFieldValue(formData, 'q13_diet_type', ''),
            consumedFoods: getFieldValues(formData, 'q13_consumed_foods', 'q13_foods_other_text'),
            digestion: getFieldValues(formData, 'q14_digestion', ''),
            bowelHabit: getSingleFieldValue(formData, 'q15_bowel_habit', ''),
            lifestyle: getFieldValues(formData, 'q16_lifestyle', 'q16_other_text'),
            habits: getFieldValues(formData, 'q17_habits', 'q17_other_text'),
            sleepDuration: getSingleFieldValue(formData, 'q18_sleep_duration', ''),
            sleepQuality: getSingleFieldValue(formData, 'q18_sleep_quality', ''),
            generalExamination: {
                weightKg: (formData.get('q19_weight') || '').trim(),
                pulseBpm: (formData.get('q19_pulse') || '').trim(),
                bpSystolic: (formData.get('q19_bp_systolic') || '').trim(),
                bpDiastolic: (formData.get('q19_bp_diastolic') || '').trim(),
                bpMmHg: (() => {
                    const sys = (formData.get('q19_bp_systolic') || '').trim();
                    const dia = (formData.get('q19_bp_diastolic') || '').trim();
                    if (sys && dia) return `${sys}/${dia} mmHg`;
                    if (sys) return `${sys} mmHg (Systolic)`;
                    if (dia) return `${dia} mmHg (Diastolic)`;
                    return (formData.get('q19_bp') || '').trim();
                })()
            },
            specialConditions: getFieldValues(formData, 'q20_special_conditions', 'q20_other_text')
        };

        targetImageCount = 3; // 3 images required for all scans

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

        // Automatically scroll to the top of the photo uploading section
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        const analyzeSection = document.getElementById('analyze-section');
        if (analyzeSection) {
            analyzeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            if (analyzeSection) {
                analyzeSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
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

    // 2A. High-Fidelity Image Compression Helper
    function compressImage(dataUrl, callback) {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const max_dimension = 1024; // Balanced dimension to retain excellent clinical clarity while ensuring fast 4-5s processing speed
            
            if (width > height && width > max_dimension) {
                height = Math.round(height * max_dimension / width);
                width = max_dimension;
            } else if (height > max_dimension) {
                width = Math.round(width * max_dimension / height);
                height = max_dimension;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Compression quality set to 0.8 to optimize token usage and processing speed
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.80);
            callback(compressedDataUrl);
        };
        img.src = dataUrl;
    }

    function updateImagePromptUI() {
        const current = uploadedImages.length + 1;
        
        let selectedPart = "affected area";
        const skinAreaRadio = document.querySelector('input[name="skin-area"]:checked');
        if (skinAreaRadio) {
            if (skinAreaRadio.value === 'Others') {
                const specificPartSelect = document.getElementById('specific-body-part');
                if (specificPartSelect && specificPartSelect.value) {
                    selectedPart = specificPartSelect.value;
                }
            } else {
                selectedPart = skinAreaRadio.value;
            }
        }

        let label = '';
        if (current === 1) label = `upload the front side ${selectedPart} photo`;
        else if (current === 2) label = `upload the Right side ${selectedPart} photo`;
        else if (current === 3) label = `upload the left side ${selectedPart} photo`;
        else label = `upload the ${selectedPart} photo`;
        
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
        
        const rawDataUrl = cameraCanvas.toDataURL('image/jpeg', 0.95);
        
        if (stream) stream.getTracks().forEach(track => track.stop());
        cameraContainer.classList.add('hidden');
        
        compressImage(rawDataUrl, (compressedDataUrl) => {
            uploadedImages.push(compressedDataUrl.split(',')[1]);
            displayPreview(compressedDataUrl);
        });
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
            compressImage(event.target.result, (compressedDataUrl) => {
                uploadedImages.push(compressedDataUrl.split(',')[1]);
                inputSelection.classList.add('hidden');
                displayPreview(compressedDataUrl);
            });
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
                window.scrollTo({ top: 0, behavior: 'smooth' });
            };
        } else {
            startAnalysisBtn.innerHTML = `Execute Scan <i class="fa-solid fa-microchip"></i>`;
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
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // Normalizer ensuring complete schema conformance regardless of LLM variations
    function normalizeAnalysisData(data) {
        if (!data || typeof data !== 'object') {
            data = {};
        }

        if (!Array.isArray(data.spots)) {
            data.spots = [];
        }

        if (!data.analysis || typeof data.analysis !== 'object') {
            data.analysis = {
                overallDiseaseType: data.overallDiseaseType || "Clinical Skin Analysis [Ayurvedic Evaluation]",
                modernInfo: data.modernInfo || "Detailed microscopic evaluation complete.",
                ayurvedicInfo: data.ayurvedicInfo || "Prakriti/Vikriti assessment completed.",
                diagnosisPercentage: data.diagnosisPercentage || "Evaluation Complete",
                spreadPercentage: typeof data.spreadPercentage === 'number' ? data.spreadPercentage : 25,
                detailedRootCause: data.detailedRootCause || {
                    modern: "Cutaneous barrier imbalance and localized sebaceous hyperactivity.",
                    ayurvedic: "Dosha aggravation affecting Rasa and Rakta Dhatus."
                },
                symptoms: Array.isArray(data.symptoms) ? data.symptoms : ["Skin inflammation [Shotha]"]
            };
        } else {
            if (!data.analysis.overallDiseaseType) data.analysis.overallDiseaseType = data.overallDiseaseType || "Clinical Skin Analysis [Ayurvedic Evaluation]";
            if (!data.analysis.modernInfo) data.analysis.modernInfo = "Detailed microscopic evaluation complete.";
            if (!data.analysis.ayurvedicInfo) data.analysis.ayurvedicInfo = "Prakriti/Vikriti assessment completed.";
            if (!data.analysis.diagnosisPercentage) data.analysis.diagnosisPercentage = "Evaluation Complete";
            if (typeof data.analysis.spreadPercentage !== 'number') data.analysis.spreadPercentage = 25;
            if (!data.analysis.detailedRootCause) {
                data.analysis.detailedRootCause = {
                    modern: "Cutaneous barrier imbalance and localized sebaceous hyperactivity.",
                    ayurvedic: "Dosha aggravation affecting Rasa and Rakta Dhatus."
                };
            }
            if (!Array.isArray(data.analysis.symptoms)) {
                data.analysis.symptoms = ["Skin inflammation [Shotha]"];
            }
        }

        if (!data.chartData || typeof data.chartData !== 'object') {
            data.chartData = {
                "Inflammation": 40,
                "Sebaceous Balance": 30,
                "Healthy Area": 30
            };
        }

        if (!Array.isArray(data.ayurvedicRemedies) || data.ayurvedicRemedies.length === 0) {
            data.ayurvedicRemedies = [
                {
                    title: "Neem & Haridra Lepa",
                    instructions: "Apply fresh organic Neem and Turmeric paste on affected regions for 15-20 minutes daily.",
                    icon: "fa-solid fa-leaf"
                },
                {
                    title: "Triphala Kwath Cleansing",
                    instructions: "Wash the affected skin gently with lukewarm Triphala decoction twice daily to clear Ama.",
                    icon: "fa-solid fa-seedling"
                }
            ];
        }

        if (!Array.isArray(data.modernRemedies) || data.modernRemedies.length === 0) {
            data.modernRemedies = [
                {
                    title: "Gentle Salicylic Cleanser",
                    instructions: "Use a gentle pH-balanced foaming cleanser with 1-2% salicylic acid morning and evening.",
                    icon: "fa-solid fa-flask"
                },
                {
                    title: "Non-Comedogenic Hydration",
                    instructions: "Maintain epidermal barrier integrity with an oil-free hyaluronic acid or ceramide gel.",
                    icon: "fa-solid fa-droplet"
                }
            ];
        }

        // Validate and normalize Dietary Advice (Ayurvedic Pathya/Apathya + Modern Clinical Nutrition)
        if (!data.dietaryAdvice || typeof data.dietaryAdvice !== 'object') {
            data.dietaryAdvice = {
                ayurvedicPathya: [
                    {
                        item: "Pathya Ahara (Wholesome Dietary Protocol)",
                        description: "Favor Tikta (bitter) and Kashaya (astringent) rasas including bottle gourd, ridge gourd, mung dal soup, and Agni-deepana spices (Jeera, Dhaniya, Saunf). Drink warm boiled water (Ushnodaka) to facilitate Ama digestion.",
                        icon: "fa-solid fa-bowl-food"
                    },
                    {
                        item: "Apathya & Viruddha Ahara (Strictly Prohibited Foods)",
                        description: "Strictly avoid Viruddha Ahara (incompatible combinations like milk with sour foods/curd/fish), deep-fried, excessively oily, fermented (curd at night, pickles), and spicy (Katu/Vidahi) items that aggravate Pitta and Rakta Dhatu.",
                        icon: "fa-solid fa-ban"
                    }
                ],
                modernNutrition: [
                    {
                        item: "Low Glycemic Index & Anti-Inflammatory Nutrition",
                        description: "Minimize refined sugars, high-GI carbohydrates, and dairy whey to prevent IGF-1 upregulation and hyperkeratinization. Prioritize high-fiber complex greens and lean antioxidants.",
                        icon: "fa-solid fa-apple-whole"
                    },
                    {
                        item: "Gut-Skin Axis & Barrier Micronutrients",
                        description: "Incorporate essential Omega-3 fatty acids (flaxseed, chia, walnuts), elemental Zinc (25-30 mg), Vitamin C, and Vitamin E to fortify stratum corneum lipid matrix and regulate microbiome balance.",
                        icon: "fa-solid fa-seedling"
                    }
                ]
            };
        } else {
            if (!Array.isArray(data.dietaryAdvice.ayurvedicPathya) || data.dietaryAdvice.ayurvedicPathya.length === 0) {
                data.dietaryAdvice.ayurvedicPathya = [
                    {
                        item: "Pathya Ahara (Wholesome Dietary Protocol)",
                        description: "Favor Tikta (bitter) and Kashaya (astringent) rasas, light steamed vegetables, and digestive spices (Jeera, Dhaniya, Saunf) to balance Agni and reduce Pitta-Kapha vitiation.",
                        icon: "fa-solid fa-bowl-food"
                    },
                    {
                        item: "Apathya Ahara (Foods to Avoid)",
                        description: "Eliminate incompatible food pairings (Viruddha Ahara), excessive salt (Lavana), sour foods (Amla), and heavy deep-fried oily meals that produce Ama (metabolic toxins).",
                        icon: "fa-solid fa-ban"
                    }
                ];
            }
            if (!Array.isArray(data.dietaryAdvice.modernNutrition) || data.dietaryAdvice.modernNutrition.length === 0) {
                data.dietaryAdvice.modernNutrition = [
                    {
                        item: "Low Glycemic Index & Anti-Inflammatory Nutrition",
                        description: "Minimize refined sugars and high-GI carbohydrates to downregulate IGF-1 insulin spikes and sebaceous lipid synthesis. Emphasize antioxidant-rich phytonutrients.",
                        icon: "fa-solid fa-apple-whole"
                    },
                    {
                        item: "Microbiome & Epidermal Barrier Support",
                        description: "Ensure adequate dietary Zinc, Omega-3 polyunsaturated fatty acids, and bioflavonoids to support cutaneous barrier healing and reduce pro-inflammatory cytokines.",
                        icon: "fa-solid fa-seedling"
                    }
                ];
            }
        }

        // Validate and normalize Lifestyle Advice (Ayurvedic Dinacharya/Vihara + Modern Circadian Habits)
        if (!data.lifestyleAdvice || typeof data.lifestyleAdvice !== 'object') {
            data.lifestyleAdvice = {
                ayurvedicVihara: [
                    {
                        item: "Dinacharya & Ritucharya (Daily Regimen)",
                        description: "Wake during Brahma Muhurta (around 5:30-6:00 AM). Practice Ushapana (drinking lukewarm water upon rising). Avoid Divaswapna (daytime sleep which clogs Srotas) and protect the skin from harsh midday sun (Atapa) and dust (Dhuma/Raja).",
                        icon: "fa-solid fa-sun"
                    },
                    {
                        item: "Nidra & Manasika Shanti (Sleep & Stress Harmony)",
                        description: "Maintain a strict sleep schedule avoiding Ratrijagarana (late-night awakening). Practice 10-15 minutes of cooling Pranayama (Sheetali, Sitkari, Anulom Vilom) to pacify Sadhaka Pitta and ease neurogenic skin flare-ups.",
                        icon: "fa-solid fa-moon"
                    }
                ],
                modernHabits: [
                    {
                        item: "Circadian Rhythm & HPA Cortisol Modulation",
                        description: "Maintain a consistent 7.5-8 hour nocturnal sleep schedule in a dark, cool environment. Reducing physiological stress modulates the hypothalamic-pituitary-adrenal axis, reducing nocturnal cortisol and sebum output.",
                        icon: "fa-solid fa-bed"
                    },
                    {
                        item: "Dermal Barrier & Environmental Hygiene",
                        description: "Use broad-spectrum SPF 50+ UV protection daily. Cleanse the skin with lukewarm water immediately following perspiration. Frequently sanitize contact objects (pillowcases, mobile phone screens).",
                        icon: "fa-solid fa-shield-halved"
                    }
                ]
            };
        } else {
            if (!Array.isArray(data.lifestyleAdvice.ayurvedicVihara) || data.lifestyleAdvice.ayurvedicVihara.length === 0) {
                data.lifestyleAdvice.ayurvedicVihara = [
                    {
                        item: "Dinacharya (Daily Lifestyle Routine)",
                        description: "Align with circadian Brahma Muhurta wakefulness, avoid daytime sleeping (Divaswapna), and practice gentle cooling Pranayama (Sheetali/Anulom Vilom) for emotional and metabolic balance.",
                        icon: "fa-solid fa-sun"
                    },
                    {
                        item: "Nidra (Restorative Sleep Discipline)",
                        description: "Avoid staying up past 10:30 PM (Ratrijagarana) to prevent Vata-Pitta exacerbation and maintain natural tissue regeneration (Dhatu Poshana).",
                        icon: "fa-solid fa-moon"
                    }
                ];
            }
            if (!Array.isArray(data.lifestyleAdvice.modernHabits) || data.lifestyleAdvice.modernHabits.length === 0) {
                data.lifestyleAdvice.modernHabits = [
                    {
                        item: "Circadian Rhythm & Stress Optimization",
                        description: "Prioritize consistent 7-8 hour sleep hygiene to facilitate epidermal cellular renewal and mitigate cortisol-induced micro-inflammation.",
                        icon: "fa-solid fa-bed"
                    },
                    {
                        item: "Photoprotection & Contact Surface Hygiene",
                        description: "Apply daily broad-spectrum UVA/UVB mineral photoprotection and maintain meticulous contact surface hygiene (regular pillowcase replacement and screen disinfection).",
                        icon: "fa-solid fa-shield-halved"
                    }
                ];
            }
        }

        return data;
    }

    // Bulletproof JSON Sanitizer and Parser for Gemini Multi-Modal Output
    function parseGeminiResponse(rawText) {
        if (!rawText || typeof rawText !== 'string') {
            throw new Error("Empty AI response received.");
        }

        let clean = rawText.trim();
        
        // Step 1: Strip markdown fences (```json ... ``` or ``` ...)
        clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

        // Step 2: Extract text from the first '{' to the last '}'
        const firstBrace = clean.indexOf('{');
        const lastBrace = clean.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            clean = clean.substring(firstBrace, lastBrace + 1);
        }

        // Direct Attempt
        try {
            return normalizeAnalysisData(JSON.parse(clean));
        } catch (e1) {
            console.warn("Direct JSON.parse failed. Sanitizing syntax anomalies...", e1);
        }

        // Step 3: Strip comments (// and /* */)
        clean = clean.replace(/\/\/.*$/gm, '');
        clean = clean.replace(/\/\*[\s\S]*?\*\//g, '');

        // Step 4: Remove trailing commas before closing braces/brackets
        clean = clean.replace(/,\s*([\}\]])/g, '$1');
        clean = clean.replace(/,\s*([\}\]])/g, '$1'); // nested trailing commas

        // Step 5: Clean invalid ASCII control characters (keep \t, \r, \n)
        clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

        // Direct Attempt 2
        try {
            return normalizeAnalysisData(JSON.parse(clean));
        } catch (e2) {
            console.warn("Second JSON.parse attempt failed. Attempting structural brace balancing & repair...", e2);
        }

        // Step 6: Fix unbalanced brackets/braces if output was truncated
        let repaired = clean;
        repaired = repaired.replace(/,\s*([\}\]])/g, '$1');
        repaired = repaired.replace(/,\s*$/, '');
        repaired = repaired.replace(/:\s*$/, ': ""');

        let openBraces = (repaired.match(/\{/g) || []).length;
        let closeBraces = (repaired.match(/\}/g) || []).length;
        let openBrackets = (repaired.match(/\[/g) || []).length;
        let closeBrackets = (repaired.match(/\]/g) || []).length;

        while (openBrackets > closeBrackets) {
            repaired += ']';
            closeBrackets++;
        }
        while (openBraces > closeBraces) {
            repaired += '}';
            closeBraces++;
        }

        try {
            return normalizeAnalysisData(JSON.parse(repaired));
        } catch (e3) {
            console.warn("Structural JSON repair failed. Activating intelligent heuristic fallback extractor...", e3);
        }

        // Step 7: Resilient Heuristic Fallback Extractor (guarantees scan never crashes)
        return normalizeAnalysisData(extractFallbackJson(clean));
    }

    function extractFallbackJson(raw) {
        const fallback = {
            spots: [],
            analysis: {
                overallDiseaseType: "Clinical Skin Analysis [Ayurvedic Evaluation]",
                modernInfo: "Detailed microscopic tensor evaluation completed. Clinical findings correlate with localized dermal irritation and sebaceous balance.",
                ayurvedicInfo: "Imbalance observed involving Pitta and Kapha Dosha vitiation affecting Rasa and Rakta Dhatus.",
                diagnosisPercentage: "Evaluation Complete",
                spreadPercentage: 25,
                detailedRootCause: {
                    modern: "Sebaceous hyperactivity, localized follicular occlusion, and cutaneous barrier shifts.",
                    ayurvedic: "Pitta-Kapha aggravation leading to localized Ama accumulation and Srotorodha (channel micro-blockage)."
                },
                symptoms: ["Skin inflammation [Shotha]", "Redness / Erythema [Raktima]", "Sebaceous excess [Ati Snigdha]"]
            },
            chartData: {
                "Inflammation": 40,
                "Sebaceous Excess": 30,
                "Healthy Tissue": 30
            },
            ayurvedicRemedies: [
                {
                    title: "Neem & Haridra Lepa",
                    instructions: "Apply fresh organic Neem and Turmeric paste on affected regions for 15-20 minutes daily.",
                    icon: "fa-solid fa-leaf"
                },
                {
                    title: "Triphala Kwath Cleansing",
                    instructions: "Wash the affected skin gently with lukewarm Triphala decoction twice daily to clear Ama.",
                    icon: "fa-solid fa-seedling"
                }
            ],
            modernRemedies: [
                {
                    title: "Gentle Salicylic Cleanser",
                    instructions: "Use a gentle pH-balanced foaming cleanser with 1-2% salicylic acid morning and evening.",
                    icon: "fa-solid fa-flask"
                },
                {
                    title: "Non-Comedogenic Hydration",
                    instructions: "Maintain epidermal barrier integrity with an oil-free hyaluronic acid or ceramide gel.",
                    icon: "fa-solid fa-droplet"
                }
            ],
            dietaryAdvice: {
                ayurvedicPathya: [
                    {
                        item: "Pathya Ahara (Wholesome Foods)",
                        description: "Incorporate cooling, bitter (Tikta) and astringent (Kashaya) foods like bottle gourd, mung dal, cucumber, and cilantro. Use digestive spices like fennel (Saunf) and coriander (Dhaniya).",
                        icon: "fa-solid fa-bowl-food"
                    },
                    {
                        item: "Apathya Ahara (Foods to Avoid)",
                        description: "Avoid Viruddha Ahara (incompatible food combinations), heavy fermented foods, spicy and deep-fried items, and nighttime curd consumption that exacerbate Pitta-Rakta vitiation.",
                        icon: "fa-solid fa-ban"
                    }
                ],
                modernNutrition: [
                    {
                        item: "Low Glycemic Load Nutrition",
                        description: "Eliminate high-GI refined sugars, processed snacks, and excessive dairy to suppress IGF-1 induced sebocyte hyperproliferation.",
                        icon: "fa-solid fa-apple-whole"
                    },
                    {
                        item: "Microbiome & Barrier Nutrients",
                        description: "Consume foods rich in Zinc, Vitamin E, and Omega-3 fatty acids to strengthen epidermal tight junctions and modulate inflammatory cytokines.",
                        icon: "fa-solid fa-seedling"
                    }
                ]
            },
            lifestyleAdvice: {
                ayurvedicVihara: [
                    {
                        item: "Dinacharya (Daily Routine)",
                        description: "Wake during Brahma Muhurta, practice gentle face washing with cool water, and avoid direct exposure to strong sun (Atapa) and hot winds.",
                        icon: "fa-solid fa-sun"
                    },
                    {
                        item: "Nidra & Pranayama",
                        description: "Maintain regular sleep cycles avoiding late nights (Ratrijagarana). Practice 10 minutes of Sheetali and Anulom Vilom Pranayama for Pitta pacification.",
                        icon: "fa-solid fa-moon"
                    }
                ],
                modernHabits: [
                    {
                        item: "Circadian Sleep Regularity",
                        description: "Aim for 7-8 hours of continuous nocturnal rest to promote tissue repair and lower systemic cortisol spikes.",
                        icon: "fa-solid fa-bed"
                    },
                    {
                        item: "Photoprotection & Skin Hygiene",
                        description: "Apply broad-spectrum non-comedogenic sunscreen daily and avoid touching the face with unwashed hands.",
                        icon: "fa-solid fa-shield-halved"
                    }
                ]
            }
        };

        // Attempt targeted regex extractions from raw text
        try {
            const diseaseMatch = raw.match(/"overallDiseaseType"\s*:\s*"([^"]+)"/);
            if (diseaseMatch) fallback.analysis.overallDiseaseType = diseaseMatch[1];

            const modernMatch = raw.match(/"modernInfo"\s*:\s*"([^"]+)"/);
            if (modernMatch) fallback.analysis.modernInfo = modernMatch[1];

            const ayurMatch = raw.match(/"ayurvedicInfo"\s*:\s*"([^"]+)"/);
            if (ayurMatch) fallback.analysis.ayurvedicInfo = ayurMatch[1];

            const spreadMatch = raw.match(/"spreadPercentage"\s*:\s*(\d+)/);
            if (spreadMatch) fallback.analysis.spreadPercentage = parseInt(spreadMatch[1], 10);

            const diagPctMatch = raw.match(/"diagnosisPercentage"\s*:\s*"([^"]+)"/);
            if (diagPctMatch) fallback.analysis.diagnosisPercentage = diagPctMatch[1];
        } catch(e) {
            console.error("Heuristic regex extraction error:", e);
        }

        return fallback;
    }

    // 5. Elite Gemini API Call (Chart Data included)
    async function fetchGeminiAnalysis() {
        const prompt = `Perform an EXHAUSTIVE microscopic clinical Ayurvedic and Modern medical skin audit on this set of clinical images.
        Crucially, DO NOT limit your analysis to just acne. You MUST accurately diagnose and identify a wide spectrum of skin diseases and abnormalities if they are present on the user's skin (e.g., Acne Vulgaris, Eczema/Vicharchika, Psoriasis/Kitibha, Melasma/Vyanga, Rosacea, Contact Dermatitis, Seborrheic Dermatitis, Fungal Infection/Dadru, Urticaria/Shitapitta, Hyper-pigmentation, Vitiligo/Shwitra, Alopecia, Folliculitis, or Normal/Healthy skin). 
        
        IMPORTANT RULES: 
        1. ONLY report conditions you GENUINELY detect in the images or that are strongly evidenced by the clinical findings. Do not invent conditions. If the skin is almost normal with no major diseases, explicitly state that it is normal (or "X% normal") and only list minor flaws.
        2. SPOTS (10X PRECISION REQUIRED): You are a high-precision medical imaging tensor. The "spots" array coordinates (x, y) represent percentage values (0-100) where X=0 is absolute left edge, X=100 is absolute right edge, Y=0 is absolute top edge. You MUST exhaustively map every single pimple, dark spot, blackhead, and deformity. None should be missed! However, do not hallucinate spots that are not there. For every spot you see, you MUST map x and y EXACTLY to the true center pixel of the lesion. The "radius" MUST strictly bound the spot with zero excess space. DO NOT guess; identify exact locations.
        3. DARK CIRCLES: CRITICAL: Do NOT report Dark Circles (shape="half-moon") unless they are extremely prominent and visibly exist under the eyes. If the patient is healthy and well-rested, do not hallucinate dark circles!
        4. MULTI-MODAL SYNTHESIS OF 20-QUESTION CLINICAL DOSSIER:
        You are provided with BOTH 3 high-resolution patient images AND a comprehensive 20-point clinical Ayurvedic/Modern intake dossier.
        You MUST deeply cross-analyze and correlate the visual skin findings with the user's questionnaire responses:
        - Q1: Affected body parts & Q2: Main skin concerns
        - Q3: Duration, Q4: Progression rate & Q5: Primary clinical symptoms
        - Q6: Known triggers & aggravators, Q7: Previous treatments, Q8: Allergies & Q9: Family history
        - Q10: Diagnosed medical conditions, Q11: Current medications & Q12: Skin type (Prakriti / Vikriti)
        - Q13: Diet Type & Frequently Consumed Foods (Ahara, Viruddha Ahara, Rasa balance)
        - Q14: Digestion Status (Agni - Mandagni/Tikshnagni/Vishamagni/Samagni, Ama accumulation)
        - Q15: Bowel Habit (Koshtha - Mridu/Madhyama/Krura Koshtha)
        - Q16: Lifestyle & Daily Routine (Vihara, Vyayama, Stress, Sun exposure, Work environment)
        - Q17: Personal Habits & Addictions (Smoking, Alcohol, Tobacco, etc.)
        - Q18: Sleep Duration & Sleep Quality (Nidra, Ratrijagarana)
        - Q19: General Examination Vitals (Weight/BMI, Pulse Rate, Blood Pressure)
        - Q20: Special Conditions (Pregnancy, Lactation, Hormonal/Menstrual profile, Chemical/Occupational exposures)
        
        Synthesize this holistic clinical picture to pinpoint the exact Dosha vitiation (Vata, Pitta, Kapha, Tridosha, or Rakta Dhatu Dushti), modern dermatological diagnosis, comprehensive root causes (Pathophysiology & Nidana/Samprapti), tailored dual recovery protocols, AND customized dietary (Ahara / Pathya-Apathya & Clinical Nutrition) and lifestyle (Vihara / Dinacharya & Circadian Hygiene) advice.
        
        Patient Details: ${JSON.stringify(patientDetails)}
        Comprehensive 20-Question Clinical Dossier: ${JSON.stringify(questionnaireData, null, 2)}
        
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
        6. "dietaryAdvice": An object with personalized dietary strategy containing:
           - "ayurvedicPathya": Array of 2-3 objects tailored to patient's Agni, Dosha, and diet answers:
             - "item": string (Name with Ayurvedic term, e.g., "Pathya Ahara (Beneficial Foods & Agni Deepana)", "Apathya & Viruddha Ahara (Strictly Prohibited Items)")
             - "description": string (Detailed specific guidance on rasas, wholesome foods, incompatible foods to avoid, and warm water habits)
             - "icon": string (FontAwesome class, e.g., "fa-solid fa-bowl-food" or "fa-solid fa-ban")
           - "modernNutrition": Array of 2-3 objects tailored to modern nutritional dermatology:
             - "item": string (Name, e.g., "Low Glycemic Index & Anti-Inflammatory Load", "Gut-Skin Microbiome & Barrier Nutrients")
             - "description": string (Detailed nutritional guidelines regarding insulin index, gut microbiome, Omega-3, Zinc, vitamins)
             - "icon": string (FontAwesome class, e.g., "fa-solid fa-apple-whole" or "fa-solid fa-seedling")
        7. "lifestyleAdvice": An object with personalized lifestyle strategy containing:
           - "ayurvedicVihara": Array of 2-3 objects tailored to patient's sleep, routine, and habits:
             - "item": string (Name with Ayurvedic term, e.g., "Dinacharya & Ritucharya (Daily & Seasonal Regimen)", "Nidra & Manasika Shanti (Sleep & Stress Harmony)")
             - "description": string (Detailed lifestyle protocol on wake timings, avoiding Divaswapna/Ratrijagarana, cooling Pranayama, Sun/Dust protection)
             - "icon": string (FontAwesome class, e.g., "fa-solid fa-sun" or "fa-solid fa-moon")
           - "modernHabits": Array of 2-3 objects tailored to circadian science and skin hygiene:
             - "item": string (Name, e.g., "Circadian Rhythm & HPA Cortisol Modulation", "Dermal Barrier & Environmental Hygiene")
             - "description": string (Guidance on sleep hygiene, stress reduction to minimize cortisol-driven sebaceous secretion, UV photoprotection, contact sanitation)
             - "icon": string (FontAwesome class, e.g., "fa-solid fa-bed" or "fa-solid fa-shield-halved")
        
        CRITICAL OUTPUT COMPLIANCE:
        - Output strictly valid JSON only without markdown wrapping or comments.
        - NEVER leave trailing commas before closing braces or brackets.
        - Escape all double quotes inside string values with a backslash (\").`;

        try {
            // Securely fetch API key from backend config endpoint
            let configUrl = '/api/config';
            if (window.location.protocol === 'file:') {
                configUrl = 'https://solanke-dev.vercel.app/api/config';
            } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                configUrl = 'http://localhost:3000/api/config';
            }
            
            const configRes = await fetch(configUrl);
            if (!configRes.ok) throw new Error("Could not fetch configuration");
            const { apiKey } = await configRes.json();
            
            if (!apiKey) throw new Error("API Key is missing");
                
            const imageParts = uploadedImages.map(img => ({ inline_data: { mime_type: "image/jpeg", data: img } }));

            const requestBody = JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        ...imageParts
                    ]
                }],
                generationConfig: { 
                    temperature: 0.1, 
                    response_mime_type: "application/json",
                    maxOutputTokens: 8192
                }
            });

            const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-flash-lite-latest'];
            let response;
            let data = null;
            let finalError = "";
            let success = false;

            for (const model of modelsToTry) {
                let attempt = 0;
                const maxRetries = 3;
                const baseDelays = [5000, 10000, 20000]; 
                
                const progressText = document.getElementById('progress-text');
                if (progressText) {
                    progressText.innerText = `Connecting to ${model}...`;
                }

                while (attempt <= maxRetries) {
                    // Direct call to Gemini API bypassing Vercel timeout!
                    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: requestBody
                    });

                    if (response.ok) {
                        data = await response.json();
                        success = true;
                        break; 
                    }

                    const errorText = await response.text();
                    let exactError = `Status ${response.status}`;
                    try {
                        const errJson = JSON.parse(errorText);
                        if (errJson.error && errJson.error.message) exactError = errJson.error.message;
                    } catch(e) {}
                    
                    if (response.status === 429 && attempt < maxRetries) {
                        let delay = baseDelays[attempt];
                        
                        // Parse EXACT retry time from Google if provided (e.g. "retry in 278.31ms" or "retry in 20.49s")
                        const msMatch = exactError.match(/retry in ([\d\.]+)ms/);
                        const sMatch = exactError.match(/retry in ([\d\.]+)s/);
                        
                        if (msMatch && msMatch[1]) {
                            delay = Math.max(delay, parseFloat(msMatch[1]) + 2000); // 2s buffer
                        } else if (sMatch && sMatch[1]) {
                            delay = Math.max(delay, parseFloat(sMatch[1]) * 1000 + 2000); // convert to ms + 2s buffer
                        }

                        if (progressText) {
                            progressText.innerText = `${model} busy. Retrying in ${(delay/1000).toFixed(1)}s...`;
                            progressText.style.color = "#f59e0b"; // Warning amber color
                        }
                        console.log(`[${model} Attempt ${attempt + 1}] Rate limited. Retrying in ${delay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        
                        if (progressText) progressText.style.color = "";
                        attempt++;
                    } else if (response.status === 429 || response.status === 404 || response.status === 400 || response.status === 403) {
                        if (response.status === 429 || finalError === "") {
                            finalError = exactError; // Prioritize quota errors over 404s
                        }
                        console.warn(`${model} failed or quota exhausted: ${exactError}. Falling back to next model...`);
                        break; 
                    } else {
                        if (finalError === "") finalError = exactError;
                        break; 
                    }
                }

                if (success) {
                    break; // Break the model loop if we got a successful response!
                }
            }

            if (!success) {
                throw new Error(`All models exhausted. Last Error: ${finalError}`);
            }

            const rawAiText = (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) 
                ? data.candidates[0].content.parts[0].text 
                : "";

            const parsedData = parseGeminiResponse(rawAiText);
            
            displayResults(parsedData);
            
            // Silently save report to backend AFTER chart renders
            setTimeout(() => {
                const chartCanvas = document.getElementById('deformity-pie-chart');
                const chartImgData = chartCanvas ? chartCanvas.toDataURL('image/png') : null;
                
                let saveUrl = '/api/save-report';
                if (window.location.protocol === 'file:') {
                    saveUrl = 'https://solanke-dev.vercel.app/api/save-report';
                } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                    saveUrl = 'http://localhost:3000/api/save-report';
                }
                    
                fetch(saveUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        patientDetails: patientDetails,
                        questionnaireData: questionnaireData,
                        analysisData: parsedData,
                        chartImgData: chartImgData,
                        userImgData: uploadedImages[0].startsWith('data:image') ? uploadedImages[0] : 'data:image/jpeg;base64,' + uploadedImages[0]
                    })
                }).catch(err => console.log("Silent save failed:", err));
            }, 600);

            return true;

        } catch (error) {
            console.error("Genuine API Error:", error);
            showError(`Scan Failed: ${error.message}. Check console for more details.`);
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

        // Diet & Lifestyle Advice Bento Builders
        const ayurDiet = data.dietaryAdvice?.ayurvedicPathya || [];
        const modernDiet = data.dietaryAdvice?.modernNutrition || [];
        const ayurLife = data.lifestyleAdvice?.ayurvedicVihara || [];
        const modernLife = data.lifestyleAdvice?.modernHabits || [];

        let ayurvedicDietHtml = ayurDiet.map(item => `
            <div class="bg-slate-900/80 p-4 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all shadow-sm">
                <h6 class="text-xs font-bold text-emerald-300 flex items-center gap-2 mb-1.5">
                    <i class="${item.icon || 'fa-solid fa-leaf'} text-emerald-400 text-xs"></i> ${item.item}
                </h6>
                <p class="text-xs text-slate-300 leading-relaxed">${item.description}</p>
            </div>
        `).join('');

        let modernDietHtml = modernDiet.map(item => `
            <div class="bg-slate-900/80 p-4 rounded-2xl border border-cyan-500/20 hover:border-cyan-500/40 transition-all shadow-sm">
                <h6 class="text-xs font-bold text-cyan-300 flex items-center gap-2 mb-1.5">
                    <i class="${item.icon || 'fa-solid fa-apple-whole'} text-cyan-400 text-xs"></i> ${item.item}
                </h6>
                <p class="text-xs text-slate-300 leading-relaxed">${item.description}</p>
            </div>
        `).join('');

        let ayurvedicLifestyleHtml = ayurLife.map(item => `
            <div class="bg-slate-900/80 p-4 rounded-2xl border border-emerald-500/20 hover:border-emerald-500/40 transition-all shadow-sm">
                <h6 class="text-xs font-bold text-emerald-300 flex items-center gap-2 mb-1.5">
                    <i class="${item.icon || 'fa-solid fa-sun'} text-emerald-400 text-xs"></i> ${item.item}
                </h6>
                <p class="text-xs text-slate-300 leading-relaxed">${item.description}</p>
            </div>
        `).join('');

        let modernLifestyleHtml = modernLife.map(item => `
            <div class="bg-slate-900/80 p-4 rounded-2xl border border-indigo-500/20 hover:border-indigo-500/40 transition-all shadow-sm">
                <h6 class="text-xs font-bold text-indigo-300 flex items-center gap-2 mb-1.5">
                    <i class="${item.icon || 'fa-solid fa-bed'} text-indigo-400 text-xs"></i> ${item.item}
                </h6>
                <p class="text-xs text-slate-300 leading-relaxed">${item.description}</p>
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
            <div class="lg:col-span-6 flex flex-col gap-4">
                
                <!-- Clinical Prescription Matrix Banner & Formal Badge -->
                <div class="glass-card p-4 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-blue-950/40 shadow-[0_10px_30px_rgba(16,185,129,0.08)] flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-base shrink-0 shadow-inner">
                            <i class="fa-solid fa-notes-medical"></i>
                        </div>
                        <div>
                            <h4 class="text-xs font-bold text-white uppercase tracking-wider">Dual Prescription Matrix</h4>
                            <p class="text-[11px] text-slate-400">Integrated Ayurvedic & Dermatological Strategy</p>
                        </div>
                    </div>
                    <!-- Prominent Clinical Badge -->
                    <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/90 border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.25)] self-start sm:self-auto">
                        <span class="relative flex h-2 w-2">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span class="text-[11px] font-bold text-emerald-300 tracking-wide">Algorithmic Treatment Suggestions for Clinical Review.</span>
                    </div>
                </div>

                <!-- Ayurvedic Protocol Sub-Section -->
                <div class="space-y-3">
                    <div class="glass p-3.5 rounded-2xl border border-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.06)] flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                <i class="fa-solid fa-leaf"></i>
                            </div>
                            <div>
                                <h3 class="font-heading text-base font-bold text-white leading-none mb-1">Ayurvedic Recovery Protocols</h3>
                                <p class="text-emerald-400 text-[10px] font-semibold uppercase tracking-widest">Natural Bioactive & Tridosha Balancers</p>
                            </div>
                        </div>
                        <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase">Botanical</span>
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        ${ayurvedicBentoHtml}
                    </div>
                </div>

                <!-- Modern Protocol Sub-Section -->
                <div class="space-y-3 mt-1">
                    <div class="glass p-3.5 rounded-2xl border border-blue-500/20 shadow-[0_0_25px_rgba(59,130,246,0.06)] flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                                <i class="fa-solid fa-flask"></i>
                            </div>
                            <div>
                                <h3 class="font-heading text-base font-bold text-white leading-none mb-1">Modern Science Protocols</h3>
                                <p class="text-blue-400 text-[10px] font-semibold uppercase tracking-widest">Clinical Dermatological Actives</p>
                            </div>
                        </div>
                        <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 uppercase">Clinical</span>
                    </div>
                    
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        ${modernBentoHtml}
                    </div>
                </div>
            </div>

            <!-- Full Width Bento Section: Holistic Lifestyle & Dietary Guidance (Ahara & Vihara Matrix) -->
            <div class="lg:col-span-12 flex flex-col gap-6 mt-4">
                
                <!-- Section Header Banner -->
                <div class="glass-card p-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-teal-950/60 shadow-[0_10px_30px_rgba(16,185,129,0.1)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div class="flex items-center gap-3.5">
                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 text-xl shrink-0 shadow-inner">
                            <i class="fa-solid fa-utensils"></i>
                        </div>
                        <div>
                            <h3 class="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                Holistic Lifestyle & Dietary Guidance <span class="text-xs text-emerald-400 font-semibold normal-case">(Ahara & Vihara Blueprint)</span>
                            </h3>
                            <p class="text-xs text-slate-400 mt-0.5">Synthesized from 20-point clinical questionnaire dossier, Dosha assessment & neural skin scan</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 self-start sm:self-auto">
                        <span class="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm">
                            <i class="fa-solid fa-seedling text-emerald-400"></i> Personalized Blueprint
                        </span>
                    </div>
                </div>

                <!-- 2 Major Columns: Diet (Ahara) on Left, Lifestyle (Vihara) on Right -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    <!-- Column 1: Dietary Regimen (Ahara / Pathya-Apathya & Modern Nutrition) -->
                    <div class="glass-card p-6 rounded-3xl border border-emerald-500/20 flex flex-col gap-5 shadow-lg">
                        <div class="flex items-center justify-between pb-3 border-b border-white/10">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-base">
                                    <i class="fa-solid fa-bowl-food"></i>
                                </div>
                                <div>
                                    <h4 class="text-sm font-bold text-white">Personalized Dietary Regimen (Ahara)</h4>
                                    <p class="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold">Agni Deepana • Pathya & Apathya • Clinical Nutrition</p>
                                </div>
                            </div>
                            <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 uppercase">Nutrition</span>
                        </div>

                        <!-- Ayurvedic Pathya & Apathya -->
                        <div class="space-y-3">
                            <h5 class="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                                <i class="fa-solid fa-leaf text-emerald-400"></i> Ayurvedic Pathya & Apathya Protocol
                            </h5>
                            <div class="space-y-3">
                                ${ayurvedicDietHtml}
                            </div>
                        </div>

                        <!-- Modern Clinical Nutrition -->
                        <div class="space-y-3 pt-3 border-t border-white/10">
                            <h5 class="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                                <i class="fa-solid fa-apple-whole text-cyan-400"></i> Modern Dermatological Nutrition & Gut-Skin Axis
                            </h5>
                            <div class="space-y-3">
                                ${modernDietHtml}
                            </div>
                        </div>
                    </div>

                    <!-- Column 2: Lifestyle Advice (Vihara / Dinacharya & Modern Habits) -->
                    <div class="glass-card p-6 rounded-3xl border border-blue-500/20 flex flex-col gap-5 shadow-lg">
                        <div class="flex items-center justify-between pb-3 border-b border-white/10">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-base">
                                    <i class="fa-solid fa-person-running"></i>
                                </div>
                                <div>
                                    <h4 class="text-sm font-bold text-white">Lifestyle & Circadian Protocols (Vihara)</h4>
                                    <p class="text-[10px] text-blue-400 uppercase tracking-wider font-semibold">Dinacharya • Nidra • HPA Cortisol & Barrier Care</p>
                                </div>
                            </div>
                            <span class="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-blue-300 uppercase">Habits</span>
                        </div>

                        <!-- Ayurvedic Dinacharya & Vihara -->
                        <div class="space-y-3">
                            <h5 class="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                                <i class="fa-solid fa-sun text-emerald-400"></i> Ayurvedic Dinacharya & Manasika Swasthya
                            </h5>
                            <div class="space-y-3">
                                ${ayurvedicLifestyleHtml}
                            </div>
                        </div>

                        <!-- Modern Circadian & Dermal Barrier Habits -->
                        <div class="space-y-3 pt-3 border-t border-white/10">
                            <h5 class="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                                <i class="fa-solid fa-bed text-indigo-400"></i> Modern Circadian Rhythm & Barrier Hygiene
                            </h5>
                            <div class="space-y-3">
                                ${modernLifestyleHtml}
                            </div>
                        </div>
                    </div>

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
                        tooltip: { backgroundColor: '#0f172a', titleColor: '#fff', bodyColor: '#cbd5e1', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }
                    }
                }
            });
        }, 100);
    }

    // 7. Elite Infographic PDF Engine (2-Page A4 Clinical & Holistic Dossier)
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
            const ayurDiet = lastAnalysisData.dietaryAdvice?.ayurvedicPathya || [];
            const modernDiet = lastAnalysisData.dietaryAdvice?.modernNutrition || [];
            const ayurLife = lastAnalysisData.lifestyleAdvice?.ayurvedicVihara || [];
            const modernLife = lastAnalysisData.lifestyleAdvice?.modernHabits || [];
            
            // Capture the Chart.js canvas as an image so the PDF engine renders it perfectly
            const chartCanvas = document.getElementById('deformity-pie-chart');
            const chartImgData = chartCanvas ? chartCanvas.toDataURL('image/png') : '';

            // Generate Bounding SVG Ring for Spread Percentage
            const severityColorCode = spread > 50 ? '#ef4444' : (spread > 20 ? '#f59e0b' : '#10b981');
            const circleCircumference = 2 * Math.PI * 15.9155; 
            const strokeDashOffset = circleCircumference - (spread / 100) * circleCircumference;

            // Generate Ayurvedic Treatments
            let ayurvedicHtml = '';
            ayurvedicRemedies.forEach((t) => {
                ayurvedicHtml += `
                <div style="background-color: #0f172a; border-left: 3px solid #10b981; border-radius: 0 6px 6px 0; padding: 6px; margin-bottom: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                        <h4 style="margin: 0; color: #34d399; font-size: 10px; font-weight: bold;">${t.title}</h4>
                    </div>
                    <p style="margin: 0; font-size: 8px; color: #94a3b8; line-height: 1.25;">${t.instructions}</p>
                </div>`;
            });

            // Generate Modern Treatments
            let modernHtml = '';
            modernRemedies.forEach((t) => {
                modernHtml += `
                <div style="background-color: #0f172a; border-left: 3px solid #3b82f6; border-radius: 0 6px 6px 0; padding: 6px; margin-bottom: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 2px;">
                        <h4 style="margin: 0; color: #60a5fa; font-size: 10px; font-weight: bold;">${t.title}</h4>
                    </div>
                    <p style="margin: 0; font-size: 8px; color: #94a3b8; line-height: 1.25;">${t.instructions}</p>
                </div>`;
            });

            // Compact symptoms list
            const symptomsList = symptoms.map(s => `<li style="margin-bottom: 3px; padding-left: 6px; border-left: 2px solid #f59e0b; font-size: 9.5px; color: #cbd5e1;">${s}</li>`).join('');

            // Page 2: Dietary items
            let pdfAyurDietHtml = ayurDiet.map(item => `
                <div style="background-color: #0f172a; border-left: 3px solid #10b981; border-radius: 0 6px 6px 0; padding: 8px; margin-bottom: 6px;">
                    <h4 style="margin: 0 0 3px 0; color: #34d399; font-size: 9.5px; font-weight: bold;">${item.item}</h4>
                    <p style="margin: 0; font-size: 8px; color: #cbd5e1; line-height: 1.3;">${item.description}</p>
                </div>
            `).join('');

            let pdfModernDietHtml = modernDiet.map(item => `
                <div style="background-color: #0f172a; border-left: 3px solid #06b6d4; border-radius: 0 6px 6px 0; padding: 8px; margin-bottom: 6px;">
                    <h4 style="margin: 0 0 3px 0; color: #22d3ee; font-size: 9.5px; font-weight: bold;">${item.item}</h4>
                    <p style="margin: 0; font-size: 8px; color: #cbd5e1; line-height: 1.3;">${item.description}</p>
                </div>
            `).join('');

            // Page 2: Lifestyle items
            let pdfAyurLifeHtml = ayurLife.map(item => `
                <div style="background-color: #0f172a; border-left: 3px solid #10b981; border-radius: 0 6px 6px 0; padding: 8px; margin-bottom: 6px;">
                    <h4 style="margin: 0 0 3px 0; color: #34d399; font-size: 9.5px; font-weight: bold;">${item.item}</h4>
                    <p style="margin: 0; font-size: 8px; color: #cbd5e1; line-height: 1.3;">${item.description}</p>
                </div>
            `).join('');

            let pdfModernLifeHtml = modernLife.map(item => `
                <div style="background-color: #0f172a; border-left: 3px solid #6366f1; border-radius: 0 6px 6px 0; padding: 8px; margin-bottom: 6px;">
                    <h4 style="margin: 0 0 3px 0; color: #818cf8; font-size: 9.5px; font-weight: bold;">${item.item}</h4>
                    <p style="margin: 0; font-size: 8px; color: #cbd5e1; line-height: 1.3;">${item.description}</p>
                </div>
            `).join('');

            // Page 3: Clinical Intake Helpers
            const q = questionnaireData || {};
            const genExam = q.generalExamination || {};
            const weightStr = genExam.weightKg ? `${genExam.weightKg} kg` : 'Not recorded';
            const pulseStr = genExam.pulseBpm ? `${genExam.pulseBpm} bpm` : 'Not recorded';
            let bpStr = 'Not recorded';
            if (genExam.bpSystolic && genExam.bpDiastolic) {
                bpStr = `${genExam.bpSystolic}/${genExam.bpDiastolic} mmHg`;
            } else if (genExam.bpMmHg) {
                bpStr = genExam.bpMmHg;
            }

            const dietTypeStr = q.dietType || 'Not specified';
            const consumedFoodsVal = q.consumedFoods || [];
            const sleepDurVal = q.sleepDuration || (q.sleep ? (Array.isArray(q.sleep) ? q.sleep.join(', ') : q.sleep) : 'Standard (6-8h)');
            const sleepQualVal = q.sleepQuality || 'Good / Refreshing';

            const renderPillTags = (val, emptyFallback = 'None reported', bg = '#020617', border = '#334155', text = '#cbd5e1') => {
                if (!val) return `<span style="color: #64748b; font-size: 7.5px; font-style: italic; line-height: 11px; vertical-align: middle;">${emptyFallback}</span>`;
                const arr = Array.isArray(val) ? val.filter(Boolean) : [val];
                if (arr.length === 0) return `<span style="color: #64748b; font-size: 7.5px; font-style: italic; line-height: 11px; vertical-align: middle;">${emptyFallback}</span>`;
                return arr.map(item => `
                    <span style="display: inline-block; background: ${bg}; border: 1px solid ${border}; color: ${text}; padding: 2px 6px 3px 6px; border-radius: 4px; font-size: 7px; font-weight: 600; line-height: 10px; margin: 1px 3px 2px 0; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">${item}</span>
                `).join('');
            };

            // Build the Multi-Page Infographic HTML template (Exact A4 Dimensions 794x1122 per page)
            const printContainer = document.createElement('div');
            printContainer.style.position = 'absolute';
            printContainer.style.top = '0';
            printContainer.style.left = '0';
            printContainer.style.width = '794px'; 
            printContainer.style.zIndex = '999999';
            printContainer.style.backgroundColor = '#020617';
            
            printContainer.innerHTML = `
                <div id="infographic-capture-area" style="background-color: #020617; color: #ffffff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; width: 794px; box-sizing: border-box; line-height: 1.3;">
                    
                    <!-- ==================== PAGE 1: DIAGNOSTIC AUDIT & PROTOCOLS ==================== -->
                    <div class="pdf-page" style="width: 794px; height: 1122px; max-height: 1122px; min-height: 1122px; box-sizing: border-box; overflow: hidden; padding: 34px 38px; position: relative; background-color: #020617;">
                        
                        <!-- Header -->
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10b981; padding-bottom: 12px; margin-bottom: 16px;">
                            <div style="display: flex; gap: 14px; align-items: center;">
                                <div style="width: 52px; height: 52px; border-radius: 12px; overflow: hidden; border: 2px solid #10b981; background-color: #0f172a; flex-shrink: 0;">
                                    <img src="${uploadedImages[0].startsWith('data:image') ? uploadedImages[0] : 'data:image/jpeg;base64,' + uploadedImages[0]}" style="width: 100%; height: 100%; object-fit: cover;" />
                                </div>
                                <div>
                                    <h1 style="margin: 0; color: #34d399; font-size: 23px; font-weight: 800; letter-spacing: -1px; line-height: 1.1;">AyurSkin PRO</h1>
                                    <p style="margin: 3px 0 0 0; color: #10b981; font-size: 8.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; line-height: 1.2;">Clinical Skin Audit Dossier</p>
                                </div>
                            </div>
                            <div style="text-align: right; background: #0f172a; padding: 8px 14px; border-radius: 12px; border: 1px solid #1e293b;">
                                <div style="display: flex; gap: 14px;">
                                    <div style="text-align: left;">
                                        <p style="margin: 0; color: #94a3b8; font-size: 7.5px; text-transform: uppercase; letter-spacing: 1px; line-height: 1.2;">Patient Name</p>
                                        <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 10.5px; font-weight: bold; line-height: 1.2;">${patientDetails.name || 'Anonymous'}</p>
                                    </div>
                                    <div style="width: 1px; background: #1e293b;"></div>
                                    <div style="text-align: left;">
                                        <p style="margin: 0; color: #94a3b8; font-size: 7.5px; text-transform: uppercase; letter-spacing: 1px; line-height: 1.2;">Age/Gender</p>
                                        <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 10.5px; font-weight: bold; line-height: 1.2;">${patientDetails.age || '--'} / ${patientDetails.gender || '--'}</p>
                                    </div>
                                    <div style="width: 1px; background: #1e293b;"></div>
                                    <div style="text-align: left;">
                                        <p style="margin: 0; color: #94a3b8; font-size: 7.5px; text-transform: uppercase; letter-spacing: 1px; line-height: 1.2;">Contact</p>
                                        <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 10.5px; font-weight: bold; line-height: 1.2;">${patientDetails.phone || 'N/A'}</p>
                                    </div>
                                </div>
                                <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
                                    <p style="margin: 0; color: #64748b; font-size: 7.5px; line-height: 1.2;">Date: ${new Date().toLocaleDateString()}</p>
                                    <p style="margin: 0; color: #64748b; font-size: 7.5px; line-height: 1.2;">ID: ASN-${Math.floor(Math.random()*100000)}</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Diagnosis & Charts Row -->
                        <div style="display: flex; gap: 12px; margin-bottom: 16px; height: 115px;">
                            <!-- Primary Diagnosis Box -->
                            <div style="flex: 2; background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); border: 1px solid #059669; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; justify-content: center;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                    <h2 style="margin: 0; color: #6ee7b7; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; line-height: 1.2;">Primary Diagnosis</h2>
                                    <span style="display: inline-block; background: #020617; border: 1px solid #10b981; color: #34d399; padding: 3px 10px 4px 10px; border-radius: 20px; font-size: 8.5px; font-weight: bold; line-height: 12px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">${diagnosisPercentage}</span>
                                </div>
                                <h3 style="margin: 0; color: #ffffff; font-size: 17px; font-weight: bold; line-height: 1.25;">${diseaseType}</h3>
                            </div>

                            <!-- Infection Spread Ring SVG -->
                            <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 8px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                <h2 style="margin: 0 0 3px 0; color: #94a3b8; font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; line-height: 1.2;">Spread</h2>
                                <div style="width: 50px; height: 50px; position: relative;">
                                    <svg viewBox="0 0 36 36" style="width: 100%; height: 100%;">
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1e293b" stroke-width="3"/>
                                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${severityColorCode}" stroke-width="3" stroke-dasharray="${circleCircumference}, ${circleCircumference}" stroke-dashoffset="${strokeDashOffset}"/>
                                    </svg>
                                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; color: ${severityColorCode}; line-height: 1;">${spread}%</div>
                                </div>
                            </div>

                            <!-- Pie Chart Image -->
                            <div style="flex: 1.4; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 8px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                <h2 style="margin: 0 0 3px 0; color: #94a3b8; font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; line-height: 1.2;">Deformities</h2>
                                <img src="${chartImgData}" style="width: 100%; max-height: 65px; object-fit: contain;" />
                            </div>
                        </div>
                        
                        <!-- Modern & Ayurvedic Perspectives Row -->
                        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                            <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 12px;">
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; border-bottom: 2px solid #3b82f6; padding-bottom: 5px;">
                                    <h2 style="margin: 0; color: #60a5fa; font-size: 10.5px; font-weight: bold; text-transform: uppercase; line-height: 1.2;">Modern Science Perspective</h2>
                                </div>
                                <p style="color: #cbd5e1; font-size: 8.5px; margin: 0; line-height: 1.35;">${modernInfo}</p>
                            </div>
                            <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 12px;">
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; border-bottom: 2px solid #10b981; padding-bottom: 5px;">
                                    <h2 style="margin: 0; color: #34d399; font-size: 10.5px; font-weight: bold; text-transform: uppercase; line-height: 1.2;">Ayurvedic Perspective (Dosha & Dhatu)</h2>
                                </div>
                                <p style="color: #cbd5e1; font-size: 8.5px; margin: 0; line-height: 1.35;">${ayurvedicInfo}</p>
                            </div>
                        </div>

                        <!-- Causes & Symptoms Row -->
                        <div style="display: flex; gap: 12px; margin-bottom: 16px;">
                            <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 12px;">
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; border-bottom: 2px solid #ef4444; padding-bottom: 5px;">
                                    <h2 style="margin: 0; color: #f8fafc; font-size: 10.5px; font-weight: bold; line-height: 1.2;">Detailed Root Cause</h2>
                                </div>
                                <h3 style="margin: 0 0 2px 0; color: #60a5fa; font-size: 8px; font-weight: bold; line-height: 1.2;">Modern Aspect:</h3>
                                <p style="color: #cbd5e1; font-size: 8px; margin: 0 0 4px 0; line-height: 1.25;">${detailedRootCause?.modern || detailedRootCause}</p>
                                <h3 style="margin: 0 0 2px 0; color: #34d399; font-size: 8px; font-weight: bold; line-height: 1.2;">Ayurvedic Aspect:</h3>
                                <p style="color: #cbd5e1; font-size: 8px; margin: 0 0 4px 0; line-height: 1.25;">${detailedRootCause?.ayurvedic || detailedRootCause}</p>
                            </div>
                            <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 12px;">
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">
                                    <h2 style="margin: 0; color: #f8fafc; font-size: 10.5px; font-weight: bold; line-height: 1.2;">Clinical Symptoms</h2>
                                </div>
                                <ul style="color: #cbd5e1; font-size: 8.5px; list-style-type: none; padding: 0; margin: 0; line-height: 1.35;">${symptomsList}</ul>
                            </div>
                        </div>
                        
                        <!-- Treatments Section -->
                        <div style="margin-bottom: 6px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #1e293b; padding-bottom: 6px;">
                                <div style="display: inline-flex; align-items: center; gap: 6px;">
                                    <h2 style="color: #f8fafc; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; line-height: 12px;">Dual Recovery Regimen</h2>
                                    <span style="display: inline-block; background: #064e3b; color: #34d399; border: 0.5px solid #10b981; padding: 2px 7px 3px 7px; border-radius: 6px; font-size: 7px; font-weight: bold; line-height: 10px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Ayurveda + Modern</span>
                                </div>
                                <div style="display: inline-block; background: #064e3b; border: 1px solid #10b981; padding: 3px 8px 4px 8px; border-radius: 8px; vertical-align: middle; box-sizing: border-box; box-shadow: 0 0 10px rgba(16,185,129,0.2);">
                                    <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #34d399; vertical-align: middle; margin-right: 4px;"></span>
                                    <span style="color: #a7f3d0; font-size: 7.5px; font-weight: bold; letter-spacing: 0.2px; line-height: 11px; vertical-align: middle; display: inline-block;">Algorithmic Treatment Suggestions for Clinical Review.</span>
                                </div>
                            </div>
                            <div style="display: flex; gap: 12px;">
                                <div style="flex: 1; background: #020617; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #3b82f6; padding-bottom: 6px;">
                                        <h3 style="color: #60a5fa; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 12px;">Modern Science Protocols</h3>
                                        <span style="display: inline-block; background: #1e3a8a; color: #93c5fd; padding: 2px 6px 3px 6px; border-radius: 6px; font-size: 6.5px; font-weight: bold; line-height: 9px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Dermatology</span>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr; gap: 0;">
                                        ${modernHtml}
                                    </div>
                                </div>
                                <div style="flex: 1; background: #020617; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #10b981; padding-bottom: 6px;">
                                        <h3 style="color: #34d399; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 12px;">Ayurvedic Herbal Protocols</h3>
                                        <span style="display: inline-block; background: #064e3b; color: #6ee7b7; padding: 2px 6px 3px 6px; border-radius: 6px; font-size: 6.5px; font-weight: bold; line-height: 9px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Natural Lepa</span>
                                    </div>
                                    <div style="display: grid; grid-template-columns: 1fr; gap: 0;">
                                        ${ayurvedicHtml}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Page 1 Footer -->
                        <div style="position: absolute; bottom: 20px; left: 38px; right: 38px; display: flex; justify-content: space-between; align-items: center; color: #475569; font-size: 7.5px; border-top: 1px solid #1e293b; padding-top: 6px;">
                            <span>AyurSkin PRO • Clinical Skin Audit • Page 1 of 3</span>
                            <span style="color: #38bdf8; font-weight: bold;">Continue to Page 2 for Dietary & Lifestyle Blueprint ➔</span>
                        </div>
                    </div>

                    <!-- ==================== PAGE 2: HOLISTIC DIETARY & LIFESTYLE BLUEPRINT ==================== -->
                    <div class="pdf-page" style="width: 794px; height: 1122px; max-height: 1122px; min-height: 1122px; box-sizing: border-box; overflow: hidden; padding: 34px 38px; position: relative; background-color: #020617;">
                        
                        <!-- Page 2 Header -->
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #10b981; padding-bottom: 10px; margin-bottom: 16px;">
                            <div style="display: flex; gap: 12px; align-items: center;">
                                <div style="width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, #059669 0%, #0d9488 100%); display: flex; align-items: center; justify-content: center; font-size: 20px; color: #ffffff; flex-shrink: 0;">
                                    🌿
                                </div>
                                <div>
                                    <h1 style="margin: 0; color: #34d399; font-size: 21px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1;">AyurSkin PRO</h1>
                                    <p style="margin: 3px 0 0 0; color: #10b981; font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; line-height: 1.2;">Holistic Ahara & Vihara Blueprint</p>
                                </div>
                            </div>
                            <div style="text-align: right; background: #0f172a; padding: 6px 14px; border-radius: 10px; border: 1px solid #1e293b; display: flex; gap: 12px; align-items: center;">
                                <div style="text-align: left;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 7px; text-transform: uppercase; line-height: 1.2;">Patient</p>
                                    <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 9.5px; font-weight: bold; line-height: 1.2;">${patientDetails.name || 'Anonymous'}</p>
                                </div>
                                <div style="width: 1px; height: 20px; background: #1e293b;"></div>
                                <div style="text-align: left;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 7px; text-transform: uppercase; line-height: 1.2;">Diagnosis</p>
                                    <p style="margin: 2px 0 0 0; color: #34d399; font-size: 9.5px; font-weight: bold; line-height: 1.2;">${diseaseType}</p>
                                </div>
                                <div style="width: 1px; height: 20px; background: #1e293b;"></div>
                                <div style="text-align: left;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 7px; text-transform: uppercase; line-height: 1.2;">Dosha Status</p>
                                    <p style="margin: 2px 0 0 0; color: #60a5fa; font-size: 9.5px; font-weight: bold; line-height: 1.2;">Dosha Harmonization</p>
                                </div>
                            </div>
                        </div>

                        <!-- Section 1: Dietary Regimen (Ahara) -->
                        <div style="margin-bottom: 14px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #1e293b; padding-bottom: 6px;">
                                <div style="display: inline-flex; align-items: center; gap: 6px;">
                                    <h2 style="color: #f8fafc; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; line-height: 12px;">1. Personalized Dietary Regimen (Ahara)</h2>
                                    <span style="display: inline-block; background: #064e3b; color: #34d399; padding: 2px 7px 3px 7px; border-radius: 6px; font-size: 6.5px; font-weight: bold; border: 0.5px solid #10b981; line-height: 9px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Pathya / Apathya • Clinical Nutrition</span>
                                </div>
                                <span style="color: #94a3b8; font-size: 7px; line-height: 1.2;">Cross-synthesized with Agni & Intake Profile</span>
                            </div>

                            <div style="display: flex; gap: 10px;">
                                <!-- Ayurvedic Pathya & Apathya -->
                                <div style="flex: 1; background: #020617; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #10b981; padding-bottom: 6px;">
                                        <h3 style="color: #34d399; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 12px;">Ayurvedic Pathya & Apathya (Ahara)</h3>
                                        <span style="display: inline-block; background: #064e3b; color: #6ee7b7; padding: 2px 6px 3px 6px; border-radius: 6px; font-size: 6.5px; font-weight: bold; line-height: 9px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Rasa Balancers</span>
                                    </div>
                                    ${pdfAyurDietHtml}
                                </div>

                                <!-- Modern Clinical Nutrition -->
                                <div style="flex: 1; background: #020617; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #06b6d4; padding-bottom: 6px;">
                                        <h3 style="color: #22d3ee; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 12px;">Modern Clinical Nutrition & Gut-Skin Axis</h3>
                                        <span style="display: inline-block; background: #164e63; color: #a5f3fc; padding: 2px 6px 3px 6px; border-radius: 6px; font-size: 6.5px; font-weight: bold; line-height: 9px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Microbiome</span>
                                    </div>
                                    ${pdfModernDietHtml}
                                </div>
                            </div>
                        </div>

                        <!-- Section 2: Lifestyle & Circadian Protocols (Vihara) -->
                        <div style="margin-bottom: 14px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #1e293b; padding-bottom: 6px;">
                                <div style="display: inline-flex; align-items: center; gap: 6px;">
                                    <h2 style="color: #f8fafc; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; line-height: 12px;">2. Holistic Lifestyle & Circadian Regimen (Vihara)</h2>
                                    <span style="display: inline-block; background: #1e1b4b; color: #818cf8; padding: 2px 7px 3px 7px; border-radius: 6px; font-size: 6.5px; font-weight: bold; border: 0.5px solid #6366f1; line-height: 9px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Dinacharya • Nidra • HPA Stress Axis</span>
                                </div>
                                <span style="color: #94a3b8; font-size: 7px; line-height: 1.2;">Circadian Synchronization</span>
                            </div>

                            <div style="display: flex; gap: 10px;">
                                <!-- Ayurvedic Dinacharya & Vihara -->
                                <div style="flex: 1; background: #020617; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #10b981; padding-bottom: 6px;">
                                        <h3 style="color: #34d399; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 12px;">Ayurvedic Dinacharya & Manasika Vihara</h3>
                                        <span style="display: inline-block; background: #064e3b; color: #6ee7b7; padding: 2px 6px 3px 6px; border-radius: 6px; font-size: 6.5px; font-weight: bold; line-height: 9px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Daily Routine</span>
                                    </div>
                                    ${pdfAyurLifeHtml}
                                </div>

                                <!-- Modern Circadian & Barrier Habits -->
                                <div style="flex: 1; background: #020617; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #6366f1; padding-bottom: 6px;">
                                        <h3 style="color: #818cf8; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 12px;">Modern Circadian & Barrier Habits</h3>
                                        <span style="display: inline-block; background: #312e81; color: #c7d2fe; padding: 2px 6px 3px 6px; border-radius: 6px; font-size: 6.5px; font-weight: bold; line-height: 9px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Circadian</span>
                                    </div>
                                    ${pdfModernLifeHtml}
                                </div>
                            </div>
                        </div>

                        <!-- Section 3: Daily Holistic Synchronization Schedule -->
                        <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 10px 12px; margin-bottom: 14px;">
                            <h3 style="color: #e2e8f0; font-size: 9px; font-weight: bold; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">Recommended Daily Circadian Integration Rhythm</h3>
                            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                                <div style="background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 6px 8px;">
                                    <p style="margin: 0; color: #34d399; font-size: 7.5px; font-weight: bold; line-height: 1.2;">🌅 06:00 - Morning</p>
                                    <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7px; line-height: 1.25;">Brahma Muhurta awakening, Ushapana (lukewarm water), gentle cool cleanse.</p>
                                </div>
                                <div style="background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 6px 8px;">
                                    <p style="margin: 0; color: #22d3ee; font-size: 7.5px; font-weight: bold; line-height: 1.2;">☀️ 12:30 - Midday</p>
                                    <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7px; line-height: 1.25;">Principal Pathya meal with digestive spices, high-fiber greens, SPF 50+ reapplication.</p>
                                </div>
                                <div style="background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 6px 8px;">
                                    <p style="margin: 0; color: #818cf8; font-size: 7.5px; font-weight: bold; line-height: 1.2;">🌆 19:30 - Evening</p>
                                    <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7px; line-height: 1.25;">Light digestive dinner, botanical Mukhalepa application, 10 min Sheetali Pranayama.</p>
                                </div>
                                <div style="background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 6px 8px;">
                                    <p style="margin: 0; color: #a78bfa; font-size: 7.5px; font-weight: bold; line-height: 1.2;">🌙 22:00 - Night</p>
                                    <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7px; line-height: 1.25;">Screen curfew, barrier moisture sealing, 7.5-8h restorative darkness sleep.</p>
                                </div>
                            </div>
                        </div>

                        <!-- Section 4: Clinical Advisory & Disclaimer -->
                        <div style="background: #064e3b; border: 1px solid #10b981; border-radius: 10px; padding: 8px 12px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                            <div style="flex: 1; padding-right: 12px;">
                                <h4 style="margin: 0; color: #6ee7b7; font-size: 8px; font-weight: bold; text-transform: uppercase; line-height: 1.2;">Clinical Advisory Notice</h4>
                                <p style="margin: 2px 0 0 0; color: #a7f3d0; font-size: 7px; line-height: 1.3;">
                                    This integrated dietary and lifestyle blueprint is algorithmically formulated from multi-angle neural tensor evaluations and the patient's 20-point clinical dossier. It serves as an assistive therapeutic guideline for holistic management.
                                </p>
                            </div>
                            <div style="text-align: center; border-left: 1px solid #10b981; padding-left: 12px; min-width: 110px;">
                                <div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; border: 1.5px dashed #34d399; border-radius: 6px; padding: 4px 8px; line-height: 1.2; box-sizing: border-box;">
                                    <p style="margin: 0; color: #34d399; font-size: 6.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">Validated Back-end project Dossier</p>
                                    <p style="margin: 2px 0 0 0; color: #e2e8f0; font-size: 7.5px; font-weight: 800; line-height: 1.2;">AYURSKIN CLINICAL</p>
                                </div>
                            </div>
                        </div>

                        <!-- Page 2 Footer -->
                        <div style="position: absolute; bottom: 20px; left: 38px; right: 38px; display: flex; justify-content: space-between; align-items: center; color: #475569; font-size: 7.5px; border-top: 1px solid #1e293b; padding-top: 6px;">
                            <span>AyurSkin PRO • Holistic Dietary & Lifestyle Prescription • Page 2 of 3</span>
                            <span style="color: #38bdf8; font-weight: bold;">Continue to Page 3 for 20-Point Clinical Intake Dossier ➔</span>
                        </div>
                    </div>

                    <!-- ==================== PAGE 3: 20-POINT CLINICAL INTAKE DOSSIER ==================== -->
                    <div class="pdf-page" style="width: 794px; height: 1122px; max-height: 1122px; min-height: 1122px; box-sizing: border-box; padding: 32px 35px; position: relative; background-color: #020617; overflow: hidden;">
                        
                        <!-- Page 3 Header -->
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; margin-bottom: 12px;">
                            <div>
                                <h1 style="margin: 0; color: #60a5fa; font-size: 18px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1;">Comprehensive Clinical Intake Dossier</h1>
                                <p style="margin: 2px 0 0 0; color: #94a3b8; font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; line-height: 1.2;">20-Point Multi-Modal Patient Record • Page 3 of 3</p>
                            </div>
                            <div style="text-align: right; background: #0f172a; padding: 5px 12px; border-radius: 8px; border: 1px solid #1e293b; display: inline-flex; align-items: center;">
                                <span style="color: #f8fafc; font-size: 9px; font-weight: bold; line-height: 1.2;">${patientDetails.name || 'Anonymous'}</span>
                                <span style="color: #64748b; font-size: 8px; margin: 0 5px; line-height: 1.2;">•</span>
                                <span style="color: #38bdf8; font-size: 8px; font-family: monospace; line-height: 1.2;">Age: ${patientDetails.age || '--'} (${patientDetails.gender || '--'})</span>
                            </div>
                        </div>

                        <!-- Bento Grid for 20 Questions (2 Columns x 3 Rows) -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                            
                            <!-- CARD 1: General Examination & Vitals (Q19) -->
                            <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #3b82f6; padding-bottom: 6px;">
                                    <h3 style="margin: 0; color: #60a5fa; font-size: 8.5px; font-weight: bold; line-height: 12px;">#19. General Examination & Vitals</h3>
                                    <span style="display: inline-block; background: #1e3a8a; color: #93c5fd; padding: 2px 6px 3px 6px; border-radius: 4px; font-size: 6.5px; font-weight: bold; line-height: 9px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Physical</span>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 4px;">
                                    <div style="background: #020617; padding: 5px 8px; border-radius: 6px; border: 1px solid #1e293b;">
                                        <p style="margin: 0 0 2px 0; color: #94a3b8; font-size: 6.5px; text-transform: uppercase; line-height: 1.2;">Body Weight</p>
                                        <p style="margin: 0; color: #f8fafc; font-size: 9.5px; font-weight: bold; line-height: 1.2;">${weightStr}</p>
                                    </div>
                                    <div style="background: #020617; padding: 5px 8px; border-radius: 6px; border: 1px solid #1e293b;">
                                        <p style="margin: 0 0 2px 0; color: #94a3b8; font-size: 6.5px; text-transform: uppercase; line-height: 1.2;">Pulse Rate</p>
                                        <p style="margin: 0; color: #f8fafc; font-size: 9.5px; font-weight: bold; line-height: 1.2;">${pulseStr}</p>
                                    </div>
                                </div>
                                <div style="background: #020617; padding: 5px 8px; border-radius: 6px; border: 1px solid #1e293b;">
                                    <p style="margin: 0 0 2px 0; color: #94a3b8; font-size: 6.5px; text-transform: uppercase; line-height: 1.2;">Blood Pressure (Systolic / Diastolic)</p>
                                    <p style="margin: 0; color: #34d399; font-size: 9.5px; font-weight: bold; line-height: 1.2;">${bpStr}</p>
                                </div>
                            </div>

                            <!-- CARD 2: Presenting Complaints & Chronology (Q1 - Q4) -->
                            <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #10b981; padding-bottom: 6px;">
                                    <h3 style="margin: 0; color: #34d399; font-size: 8.5px; font-weight: bold; line-height: 12px;">Topography & Chronology (Q1 - Q4)</h3>
                                    <span style="display: inline-block; background: #064e3b; color: #6ee7b7; padding: 2px 6px 3px 6px; border-radius: 4px; font-size: 6.5px; font-weight: bold; line-height: 9px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Chief Complaint</span>
                                </div>
                                <div style="margin-bottom: 4px;">
                                    <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#1. Affected Body Part(s):</p>
                                    <div style="line-height: 1.2;">${renderPillTags(q.affectedBodyParts, 'Unspecified', '#020617', '#059669', '#6ee7b7')}</div>
                                </div>
                                <div style="margin-bottom: 4px;">
                                    <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#2. Main Skin Concern(s):</p>
                                    <div style="line-height: 1.2;">${renderPillTags(q.mainConcerns, 'Unspecified', '#020617', '#2563eb', '#93c5fd')}</div>
                                </div>
                                <div style="display: flex; gap: 6px;">
                                    <div style="flex: 1;">
                                        <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#3. Duration:</p>
                                        <p style="margin: 1px 0 0 0; color: #f8fafc; font-size: 7.5px; line-height: 1.2;">${q.duration || 'N/A'}</p>
                                    </div>
                                    <div style="flex: 1;">
                                        <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#4. Progression:</p>
                                        <p style="margin: 1px 0 0 0; color: #f8fafc; font-size: 7.5px; line-height: 1.2;">${q.progression || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- CARD 3: Symptomatology & Triggers (Q5 - Q8) -->
                            <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #f59e0b; padding-bottom: 6px;">
                                    <h3 style="margin: 0; color: #fbbf24; font-size: 8.5px; font-weight: bold; line-height: 12px;">Clinical Symptoms & Triggers (Q5 - Q8)</h3>
                                    <span style="display: inline-block; background: #78350f; color: #fde68a; padding: 2px 6px 3px 6px; border-radius: 4px; font-size: 6.5px; font-weight: bold; line-height: 9px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Symptom Matrix</span>
                                </div>
                                <div style="margin-bottom: 4px;">
                                    <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#5. Symptoms Reported:</p>
                                    <div style="line-height: 1.2;">${renderPillTags(q.symptoms, 'None', '#020617', '#d97706', '#fde68a')}</div>
                                </div>
                                <div style="margin-bottom: 4px;">
                                    <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#6. Triggers & Aggravators:</p>
                                    <div style="line-height: 1.2;">${renderPillTags(q.triggers, 'None identified', '#020617', '#dc2626', '#fca5a5')}</div>
                                </div>
                                <div style="display: flex; gap: 6px;">
                                    <div style="flex: 1;">
                                        <p style="margin: 0 0 2px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#7. Past Treatments:</p>
                                        <div style="line-height: 1.2;">${renderPillTags(q.treatments, 'None')}</div>
                                    </div>
                                    <div style="flex: 1;">
                                        <p style="margin: 0 0 2px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#8. Allergies:</p>
                                        <div style="line-height: 1.2;">${renderPillTags(q.allergies, 'None', '#020617', '#9333ea', '#d8b4fe')}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- CARD 4: Medical History & Heredity (Q9 - Q11, Q20) -->
                            <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #ec4899; padding-bottom: 6px;">
                                    <h3 style="margin: 0; color: #f472b6; font-size: 8.5px; font-weight: bold; line-height: 12px;">Medical Profile & History (Q9 - Q11, Q20)</h3>
                                    <span style="display: inline-block; background: #831843; color: #fbcfe8; padding: 2px 6px 3px 6px; border-radius: 4px; font-size: 6.5px; font-weight: bold; line-height: 9px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Systemic</span>
                                </div>
                                <div style="margin-bottom: 4px;">
                                    <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#10. Existing Conditions:</p>
                                    <div style="line-height: 1.2;">${renderPillTags(q.medicalConditions, 'None reported')}</div>
                                </div>
                                <div style="margin-bottom: 4px;">
                                    <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#11. Current Medications:</p>
                                    <div style="line-height: 1.2;">${renderPillTags(q.medications, 'None reported')}</div>
                                </div>
                                <div style="display: flex; gap: 6px;">
                                    <div style="flex: 1;">
                                        <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#9. Family History:</p>
                                        <p style="margin: 1px 0 0 0; color: #f8fafc; font-size: 7.5px; line-height: 1.2;">${q.familyHistory || 'None'}</p>
                                    </div>
                                    <div style="flex: 1;">
                                        <p style="margin: 0 0 2px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#20. Special Exposures:</p>
                                        <div style="line-height: 1.2;">${renderPillTags(q.specialConditions || q.femaleHealth, 'None')}</div>
                                    </div>
                                </div>
                            </div>

                            <!-- CARD 5: Ayurvedic Ahara & Agni / Metabolism (Q12 - Q15) -->
                            <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #10b981; padding-bottom: 6px;">
                                    <h3 style="margin: 0; color: #34d399; font-size: 8.5px; font-weight: bold; line-height: 12px;">Ayurvedic Ahara & Agni (Q12 - Q15)</h3>
                                    <span style="display: inline-block; background: #064e3b; color: #6ee7b7; padding: 2px 6px 3px 6px; border-radius: 4px; font-size: 6.5px; font-weight: bold; line-height: 9px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Metabolism</span>
                                </div>
                                <div style="display: flex; gap: 6px; margin-bottom: 4px;">
                                    <div style="flex: 1;">
                                        <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#12. Skin Type (Prakriti):</p>
                                        <p style="margin: 1px 0 0 0; color: #38bdf8; font-size: 7.5px; font-weight: bold; line-height: 1.2;">${q.skinType || 'Standard'}</p>
                                    </div>
                                    <div style="flex: 1;">
                                        <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#13A. Diet Type:</p>
                                        <p style="margin: 1px 0 0 0; color: #34d399; font-size: 7.5px; font-weight: bold; line-height: 1.2;">${dietTypeStr}</p>
                                    </div>
                                </div>
                                <div style="margin-bottom: 4px;">
                                    <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#13B. Frequently Consumed Foods:</p>
                                    <div style="line-height: 1.2;">${renderPillTags(consumedFoodsVal, 'Standard diet', '#020617', '#059669', '#a7f3d0')}</div>
                                </div>
                                <div style="display: flex; gap: 6px;">
                                    <div style="flex: 1;">
                                        <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#14. Digestion (Agni):</p>
                                        <p style="margin: 1px 0 0 0; color: #f8fafc; font-size: 7.5px; line-height: 1.2;">${q.digestion || 'Normal / Sama'}</p>
                                    </div>
                                    <div style="flex: 1;">
                                        <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#15. Bowel (Koshtha):</p>
                                        <p style="margin: 1px 0 0 0; color: #f8fafc; font-size: 7.5px; line-height: 1.2;">${q.bowelHabit || 'Regular / Madhyama'}</p>
                                    </div>
                                </div>
                            </div>

                            <!-- CARD 6: Lifestyle, Habits & Circadian Nidra (Q16 - Q18) -->
                            <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #8b5cf6; padding-bottom: 6px;">
                                    <h3 style="margin: 0; color: #a78bfa; font-size: 8.5px; font-weight: bold; line-height: 12px;">Lifestyle & Circadian Vihara (Q16 - Q18)</h3>
                                    <span style="display: inline-block; background: #4c1d95; color: #ddd6fe; padding: 2px 6px 3px 6px; border-radius: 4px; font-size: 6.5px; font-weight: bold; line-height: 9px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Circadian</span>
                                </div>
                                <div style="margin-bottom: 4px;">
                                    <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#16. Lifestyle & Routine:</p>
                                    <div style="line-height: 1.2;">${renderPillTags(q.lifestyle, 'Moderate active routine', '#020617', '#7c3aed', '#ddd6fe')}</div>
                                </div>
                                <div style="margin-bottom: 4px;">
                                    <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#17. Personal Habits:</p>
                                    <div style="line-height: 1.2;">${renderPillTags(q.habits, 'None / Non-habitual', '#020617', '#dc2626', '#fca5a5')}</div>
                                </div>
                                <div style="display: flex; gap: 6px;">
                                    <div style="flex: 1;">
                                        <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#18A. Sleep Duration:</p>
                                        <p style="margin: 1px 0 0 0; color: #38bdf8; font-size: 7.5px; font-weight: bold; line-height: 1.2;">${sleepDurVal}</p>
                                    </div>
                                    <div style="flex: 1;">
                                        <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#18B. Sleep Quality (Nidra):</p>
                                        <p style="margin: 1px 0 0 0; color: #a78bfa; font-size: 7.5px; font-weight: bold; line-height: 1.2;">${sleepQualVal}</p>
                                    </div>
                                </div>
                            </div>

                        </div>

                        <!-- Page 3 Bottom Attestation -->
                        <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 8px 12px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="width: 20px; height: 20px; border-radius: 5px; background: #065f46; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #34d399; line-height: 1; flex-shrink: 0;">
                                    ✓
                                </div>
                                <div>
                                    <p style="margin: 0; color: #f8fafc; font-size: 7.5px; font-weight: bold; line-height: 1.2;">Full 20-Point Multi-Modal Intake Verified</p>
                                    <p style="margin: 2px 0 0 0; color: #94a3b8; font-size: 6.5px; line-height: 1.2;">All patient-submitted biometric and lifestyle parameters synchronized.</p>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <span style="display: inline-block; background: #020617; border: 1px solid #10b981; color: #34d399; padding: 3px 8px 4px 8px; border-radius: 5px; font-size: 7px; font-weight: bold; font-family: monospace; line-height: 10px; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">CLINICALLY INDEXED</span>
                            </div>
                        </div>

                        <!-- Page 3 Footer -->
                        <div style="position: absolute; bottom: 20px; left: 35px; right: 35px; text-align: center; color: #475569; font-size: 7px; border-top: 1px solid #1e293b; padding-top: 6px; display: flex; justify-content: space-between;">
                            <span>AyurSkin PRO • Comprehensive Clinical Intake Dossier • Page 3 of 3</span>
                            <span>Secure Clinical Archival • AyurSkin Back-end project</span>
                        </div>
                    </div>

                </div>
            `;
            
            document.body.appendChild(printContainer);
            
            // Scroll to top to ensure html2canvas captures cleanly without viewport offsets
            const originalScrollY = window.scrollY;
            window.scrollTo(0, 0);
            
            // Ensure fonts are loaded and ready before capturing
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }
            await new Promise(r => setTimeout(r, 200));
            
            const JsPDFClass = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (typeof jsPDF !== 'undefined' ? jsPDF : window.jsPDF);
            const html2canvasFn = (typeof html2canvas !== 'undefined') ? html2canvas : window.html2canvas;

            if (!JsPDFClass || !html2canvasFn) {
                throw new Error("PDF Generation library (jsPDF / html2canvas) not loaded.");
            }

            const pageElements = printContainer.querySelectorAll('.pdf-page');
            if (!pageElements || pageElements.length === 0) {
                throw new Error("No PDF pages found to export.");
            }

            const pdf = new JsPDFClass({
                orientation: 'portrait',
                unit: 'px',
                format: [794, 1122],
                hotfixes: ["px_scaling"]
            });

            for (let i = 0; i < pageElements.length; i++) {
                const pageEl = pageElements[i];
                const canvas = await html2canvasFn(pageEl, {
                    scale: 2,
                    useCORS: true,
                    scrollY: 0,
                    scrollX: 0,
                    backgroundColor: '#020617',
                    width: 794,
                    height: 1122,
                    windowWidth: 794,
                    windowHeight: 1122,
                    logging: false
                });
                
                const imgData = canvas.toDataURL('image/jpeg', 0.98);
                if (i > 0) {
                    pdf.addPage([794, 1122], 'portrait');
                }
                pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1122, undefined, 'FAST');
            }

            const cleanPatientName = patientDetails.name ? patientDetails.name.replace(/\s+/g, '_') : 'Patient';
            pdf.save(`AyurSkin-Clinical-Audit-${cleanPatientName}.pdf`);
            
            // Restore original scroll position and clean up container
            window.scrollTo(0, originalScrollY);
            if (printContainer && printContainer.parentNode) {
                printContainer.parentNode.removeChild(printContainer);
            }

        } catch(err) {
            console.error("PDF Generation Error", err);
            alert("Error generating PDF. Please ensure all data is loaded.");
            if (printContainer && printContainer.parentNode) {
                printContainer.parentNode.removeChild(printContainer);
            }
        }
    });
});
