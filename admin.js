document.addEventListener('DOMContentLoaded', () => {
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const reportsGrid = document.getElementById('reports-grid');
    const totalScans = document.getElementById('total-scans');
    const dbStatus = document.getElementById('db-status');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    
    const reportModal = document.getElementById('report-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-content');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalDownloadPdfBtn = document.getElementById('modal-download-pdf-btn');
    const modalBody = document.getElementById('modal-body');

    let allReports = [];
    let currentActiveReportId = null;

    // Fetch reports on load
    fetchReports();

    async function fetchReports() {
        try {
            const apiUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') 
                ? 'http://localhost:3000/api/reports' 
                : '/api/reports';

            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error("Failed to fetch reports");
            
            allReports = await response.json();
            renderDashboard();
        } catch (error) {
            console.error("Dashboard error:", error);
            dbStatus.innerText = "Offline";
            dbStatus.classList.replace('text-emerald-400', 'text-red-500');
            loadingState.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-4"></i><p class="text-red-400 font-medium">Database Connection Failed</p>`;
        }
    }

    function renderDashboard() {
        loadingState.classList.add('hidden');
        totalScans.innerText = allReports.length;

        if (allReports.length === 0) {
            emptyState.classList.remove('hidden');
            reportsGrid.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        reportsGrid.classList.remove('hidden');
        reportsGrid.innerHTML = '';

        allReports.forEach(report => {
            const date = new Date(report.timestamp).toLocaleString();
            const p = report.patientDetails || {};
            const analysisObj = report.analysisData?.analysis || {};
            const disease = analysisObj.overallDiseaseType || 'Clinical Skin Audit';

            // Determine spread color
            const spread = typeof analysisObj.spreadPercentage === 'number' ? analysisObj.spreadPercentage : 25;
            const severityColor = spread > 50 ? 'red' : (spread > 20 ? 'amber' : 'emerald');
            
            const avatarHtml = report.userImgData 
                ? `<img src="${report.userImgData}" class="w-full h-full object-cover" alt="Patient">`
                : `<i class="fa-solid fa-user"></i>`;

            const card = document.createElement('div');
            card.className = "glass-card rounded-3xl p-6 border border-white/5 hover:border-white/20 transition-all duration-300 hover:shadow-xl group flex flex-col";
            card.innerHTML = `
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <p class="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Patient Name</p>
                        <h3 class="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">${p.name || 'Anonymous'}</h3>
                        <p class="text-xs text-slate-400">${p.age || '--'} Yrs • ${p.gender || '--'} • ${p.city || 'City N/A'}</p>
                    </div>
                    <div class="w-12 h-12 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                        ${avatarHtml}
                    </div>
                </div>

                <div class="space-y-3 mb-6 flex-1">
                    <div class="flex items-center gap-3 text-sm text-slate-300">
                        <i class="fa-solid fa-phone text-slate-500 w-4 text-center"></i> 
                        ${p.phone || 'No Contact'}
                    </div>
                    <div class="flex items-center gap-3 text-sm text-slate-300">
                        <i class="fa-solid fa-virus text-slate-500 w-4 text-center"></i> 
                        <span class="truncate" title="${disease}">${disease}</span>
                    </div>
                    <div class="flex items-center gap-3 text-sm text-slate-300">
                        <i class="fa-solid fa-chart-pie text-slate-500 w-4 text-center"></i> 
                        Spread: <span class="text-${severityColor}-400 font-bold">${spread}%</span>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-slate-500">
                        <i class="fa-regular fa-clock w-4 text-center"></i> 
                        ${date}
                    </div>
                </div>

                <div class="flex gap-2 mt-auto pt-4 border-t border-white/5">
                    <button onclick="viewReport('${report.id}')" class="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/50 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer">
                        <i class="fa-solid fa-eye"></i> View Dossier
                    </button>
                    <button onclick="downloadPatientPDF('${report.id}')" class="flex-1 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer" title="Download Official Medical PDF">
                        <i class="fa-solid fa-file-pdf"></i> Download PDF
                    </button>
                    <button onclick="deleteReport('${report.id}')" class="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-white/5 hover:border-red-500/50 transition-all flex items-center justify-center shrink-0 cursor-pointer" title="Delete Record">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            reportsGrid.appendChild(card);
        });
    }

    // 1. Export All Patient Records to CSV / Excel
    window.exportToCSV = function() {
        if (!allReports || allReports.length === 0) {
            alert("No patient records available to export. The database is currently empty.");
            return;
        }

        try {
            const originalBtnHtml = exportCsvBtn ? exportCsvBtn.innerHTML : '';
            if (exportCsvBtn) {
                exportCsvBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin text-base"></i> <span>Compiling CSV...</span>`;
            }

            const headers = [
                "Record ID", "Timestamp", "Patient Name", "Age", "Gender", "Phone Number", "Email", "City",
                "Primary Diagnosis", "Diagnosis Status", "Spread Percentage (%)", "Vitals - Weight (kg)",
                "Vitals - Pulse (bpm)", "Vitals - Systolic BP (mmHg)", "Vitals - Diastolic BP (mmHg)", "Vitals - Combined BP",
                "Q1 Affected Body Part(s)", "Q2 Main Skin Concern(s)", "Q3 Duration", "Q4 Progression Rate",
                "Q5 Primary Clinical Symptoms", "Q6 Known Triggers & Aggravators", "Q7 Previous Treatments",
                "Q8 Allergies & Sensitivities", "Q9 Family History", "Q10 Diagnosed Medical Conditions",
                "Q11 Current Medications", "Q12 Skin Type (Prakriti/Vikriti)", "Q13A Diet Type",
                "Q13B Frequently Consumed Foods", "Q14 Digestion Status (Agni)", "Q15 Bowel Habit (Koshtha)",
                "Q16 Lifestyle & Daily Routine (Vihara)", "Q17 Personal Habits & Addictions",
                "Q18 Sleep Duration & Quality (Nidra)", "Q20 Special Conditions & Exposures",
                "Modern Medical Perspective", "Ayurvedic Perspective & Doshas",
                "Root Cause (Modern Cellular)", "Root Cause (Ayurvedic Samprapti)",
                "Identified Clinical Symptoms", "Ayurvedic Protocols (Clinical Suggestions)", "Modern Science Protocols (Clinical Suggestions)",
                "Ayurvedic Dietary Plan (Pathya & Apathya Ahara)", "Modern Nutritional Science (Dietary Guidance)",
                "Ayurvedic Lifestyle & Vihara (Dinacharya & Circadian)", "Modern Circadian & Skin Barrier Habits"
            ];

            const formatCell = (val) => {
                if (val === null || val === undefined) return '""';
                if (Array.isArray(val)) {
                    val = val.filter(Boolean).join('; ');
                } else if (typeof val === 'object') {
                    val = JSON.stringify(val);
                }
                const str = String(val).replace(/"/g, '""');
                return `"${str}"`;
            };

            const rows = [headers.map(h => `"${h}"`).join(',')];

            allReports.forEach(r => {
                const p = r.patientDetails || {};
                const q = r.questionnaireData || {};
                const a = r.analysisData?.analysis || {};
                const genExam = q.generalExamination || {};
                
                const dietTypeStr = q.dietType || '';
                const consumedFoodsStr = Array.isArray(q.consumedFoods) ? q.consumedFoods.join('; ') : (q.consumedFoods || '');

                const sleepStr = [];
                if (q.sleepDuration) sleepStr.push(`Duration: ${q.sleepDuration}`);
                if (q.sleepQuality) sleepStr.push(`Quality: ${q.sleepQuality}`);
                if (q.sleep && sleepStr.length === 0) sleepStr.push(Array.isArray(q.sleep) ? q.sleep.join('; ') : q.sleep);

                let bpCombined = '';
                if (genExam.bpSystolic && genExam.bpDiastolic) {
                    bpCombined = `${genExam.bpSystolic}/${genExam.bpDiastolic} mmHg`;
                } else if (genExam.bpMmHg) {
                    bpCombined = genExam.bpMmHg;
                }

                const ayurRemediesStr = (r.analysisData?.ayurvedicRemedies || [])
                    .map(rem => `${rem.title}: ${rem.instructions}`).join(' | ');

                const modernRemediesStr = (r.analysisData?.modernRemedies || [])
                    .map(rem => `${rem.title}: ${rem.instructions}`).join(' | ');

                const dietAyurStr = (r.analysisData?.dietaryAdvice?.ayurvedicPathya || [])
                    .map(d => `${d.item}: ${d.description}`).join(' | ');

                const dietModernStr = (r.analysisData?.dietaryAdvice?.modernNutrition || [])
                    .map(d => `${d.item}: ${d.description}`).join(' | ');

                const lifeAyurStr = (r.analysisData?.lifestyleAdvice?.ayurvedicVihara || [])
                    .map(l => `${l.item}: ${l.description}`).join(' | ');

                const lifeModernStr = (r.analysisData?.lifestyleAdvice?.modernHabits || [])
                    .map(l => `${l.item}: ${l.description}`).join(' | ');

                const rootModern = (a.detailedRootCause && typeof a.detailedRootCause === 'object') 
                    ? a.detailedRootCause.modern 
                    : (a.causes ? (Array.isArray(a.causes) ? a.causes.join('; ') : a.causes) : (a.detailedRootCause || ''));

                const rootAyur = (a.detailedRootCause && typeof a.detailedRootCause === 'object') 
                    ? a.detailedRootCause.ayurvedic 
                    : '';

                const row = [
                    formatCell(r.id), formatCell(r.timestamp ? new Date(r.timestamp).toLocaleString() : ''),
                    formatCell(p.name), formatCell(p.age), formatCell(p.gender), formatCell(p.phone),
                    formatCell(p.email), formatCell(p.city), formatCell(a.overallDiseaseType),
                    formatCell(a.diagnosisPercentage), formatCell(a.spreadPercentage),
                    formatCell(genExam.weightKg), formatCell(genExam.pulseBpm), formatCell(genExam.bpSystolic),
                    formatCell(genExam.bpDiastolic), formatCell(bpCombined), formatCell(q.affectedBodyParts),
                    formatCell(q.mainConcerns), formatCell(q.duration), formatCell(q.progression),
                    formatCell(q.symptoms), formatCell(q.triggers), formatCell(q.treatments),
                    formatCell(q.allergies), formatCell(q.familyHistory), formatCell(q.medicalConditions),
                    formatCell(q.medications), formatCell(q.skinType), formatCell(dietTypeStr),
                    formatCell(consumedFoodsStr), formatCell(q.digestion), formatCell(q.bowelHabit),
                    formatCell(q.lifestyle), formatCell(q.habits), formatCell(sleepStr.join('; ')),
                    formatCell(q.specialConditions || q.femaleHealth), formatCell(a.modernInfo),
                    formatCell(a.ayurvedicInfo), formatCell(rootModern), formatCell(rootAyur),
                    formatCell(a.symptoms), formatCell(ayurRemediesStr), formatCell(modernRemediesStr),
                    formatCell(dietAyurStr), formatCell(dietModernStr), formatCell(lifeAyurStr), formatCell(lifeModernStr)
                ];

                rows.push(row.join(','));
            });

            const csvContent = '\uFEFF' + rows.join('\r\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            link.setAttribute('href', url);
            link.setAttribute('download', `AyurSkin-Patient-Database-${dateStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            setTimeout(() => {
                if (exportCsvBtn) exportCsvBtn.innerHTML = originalBtnHtml;
            }, 600);

        } catch (err) {
            console.error("CSV Export error:", err);
            alert("Error exporting patient database to CSV. Please try again.");
            if (exportCsvBtn) {
                exportCsvBtn.innerHTML = `<i class="fa-solid fa-file-excel text-base"></i> <span>Export to CSV / Excel</span>`;
            }
        }
    };

    // 2. Single-Click 3-Page Clinical Medical PDF Export for Any Patient
    window.downloadPatientPDF = async function(id) {
        const report = allReports.find(r => r.id === id);
        if (!report) {
            alert("Report record not found.");
            return;
        }

        const JsPDFClass = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : (typeof jsPDF !== 'undefined' ? jsPDF : window.jsPDF);
        const html2canvasFn = (typeof html2canvas !== 'undefined') ? html2canvas : window.html2canvas;

        if (!JsPDFClass || !html2canvasFn) {
            alert("PDF Generation engine is initializing. Please check your network and try again.");
            return;
        }

        const p = report.patientDetails || {};
        const q = report.questionnaireData || {};
        const a = report.analysisData?.analysis || {};
        const genExam = q.generalExamination || {};

        const diseaseType = a.overallDiseaseType || 'Clinical Skin Evaluation';
        const diagnosisPercentage = a.diagnosisPercentage || 'Diagnostic Complete';
        const spread = typeof a.spreadPercentage === 'number' ? a.spreadPercentage : 25;
        const modernInfo = a.modernInfo || 'Detailed multi-modal tensor evaluation completed.';
        const ayurvedicInfo = a.ayurvedicInfo || 'Prakriti and Vikriti dosha assessment completed.';
        const detailedRootCause = a.detailedRootCause || {};
        const symptomsList = (a.symptoms || ['Skin inflammation', 'Sebaceous balance variation']).map(s => `<li style="margin-bottom: 2px;">• ${s}</li>`).join('');

        const severityColorCode = spread > 50 ? '#ef4444' : (spread > 20 ? '#f59e0b' : '#10b981');
        const circleCircumference = 2 * Math.PI * 15.9155; 
        const strokeDashOffset = circleCircumference - (spread / 100) * circleCircumference;

        // Remedies HTML for Page 1 - Render ALL remedies provided (Modern + Ayurvedic)
        let ayurvedicHtml = '';
        if (report.analysisData?.ayurvedicRemedies && report.analysisData.ayurvedicRemedies.length > 0) {
            report.analysisData.ayurvedicRemedies.forEach(t => {
                ayurvedicHtml += `
                    <div style="background: #020617; border-left: 3px solid #10b981; border-radius: 6px; padding: 5px 8px; margin-bottom: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.2);">
                        <h4 style="margin: 0 0 2px 0; color: #34d399; font-size: 8px; font-weight: bold;">${t.title}</h4>
                        <p style="margin: 0; color: #94a3b8; font-size: 7px; line-height: 1.2;">${t.instructions}</p>
                    </div>`;
            });
        } else {
            ayurvedicHtml = `<p style="color: #94a3b8; font-size: 7.5px; margin: 0;">Standard Ayurvedic Lepa & Shodhana recommended.</p>`;
        }

        let modernHtml = '';
        if (report.analysisData?.modernRemedies && report.analysisData.modernRemedies.length > 0) {
            report.analysisData.modernRemedies.forEach(t => {
                modernHtml += `
                    <div style="background: #020617; border-left: 3px solid #3b82f6; border-radius: 6px; padding: 5px 8px; margin-bottom: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.2);">
                        <h4 style="margin: 0 0 2px 0; color: #60a5fa; font-size: 8px; font-weight: bold;">${t.title}</h4>
                        <p style="margin: 0; color: #94a3b8; font-size: 7px; line-height: 1.2;">${t.instructions}</p>
                    </div>`;
            });
        } else {
            modernHtml = `<p style="color: #94a3b8; font-size: 7.5px; margin: 0;">Barrier restoration & non-comedogenic hydration recommended.</p>`;
        }

        // Dietary & Lifestyle Advice for Page 2
        const dietAdvice = report.analysisData?.dietaryAdvice || {};
        const lifeAdvice = report.analysisData?.lifestyleAdvice || {};

        const ayurPathyaList = (dietAdvice.ayurvedicPathya && dietAdvice.ayurvedicPathya.length > 0) ? dietAdvice.ayurvedicPathya : [
            {
                item: "Pathya Ahara (Wholesome Diet)",
                description: "Favor cooling, bitter (Tikta) and astringent (Kashaya) rasas such as bottle gourd, mung dal, cucumber, and cilantro with digestive spices (fennel, coriander).",
                icon: "fa-solid fa-bowl-food"
            },
            {
                item: "Apathya Ahara (Restricted Foods)",
                description: "Avoid Viruddha Ahara (incompatible food combinations), heavy fermented foods, spicy/deep-fried items, and night curd consumption.",
                icon: "fa-solid fa-ban"
            }
        ];

        const modernNutritionList = (dietAdvice.modernNutrition && dietAdvice.modernNutrition.length > 0) ? dietAdvice.modernNutrition : [
            {
                item: "Low Glycemic Index Nutrition",
                description: "Eliminate high-GI refined sugars, processed snacks, and excessive dairy to suppress IGF-1 induced sebocyte hyperproliferation.",
                icon: "fa-solid fa-apple-whole"
            },
            {
                item: "Microbiome & Barrier Nutrients",
                description: "Incorporate Zinc, Vitamin E, and Omega-3 rich foods to strengthen epidermal tight junctions and modulate inflammatory cytokines.",
                icon: "fa-solid fa-seedling"
            }
        ];

        const ayurViharaList = (lifeAdvice.ayurvedicVihara && lifeAdvice.ayurvedicVihara.length > 0) ? lifeAdvice.ayurvedicVihara : [
            {
                item: "Dinacharya (Daily Regimen)",
                description: "Wake during Brahma Muhurta, practice gentle face washing with cool water, and avoid direct exposure to harsh midday sun (Atapa) and wind.",
                icon: "fa-solid fa-sun"
            },
            {
                item: "Nidra & Pranayama",
                description: "Maintain regular sleep cycles avoiding late nights (Ratrijagarana). Practice 10 minutes of Sheetali and Anulom Vilom Pranayama daily.",
                icon: "fa-solid fa-moon"
            }
        ];

        const modernHabitsList = (lifeAdvice.modernHabits && lifeAdvice.modernHabits.length > 0) ? lifeAdvice.modernHabits : [
            {
                item: "Circadian Sleep Regularity",
                description: "Maintain 7.5-8 hours of continuous nocturnal rest in dark environment to lower cortisol spikes and promote nocturnal cellular regeneration.",
                icon: "fa-solid fa-bed"
            },
            {
                item: "Photoprotection & Skin Hygiene",
                description: "Apply broad-spectrum non-comedogenic SPF 50+ sunscreen daily, practice gentle double cleansing, and minimize friction.",
                icon: "fa-solid fa-shield-halved"
            }
        ];

        let pdfAyurPathyaHtml = '';
        ayurPathyaList.forEach(item => {
            pdfAyurPathyaHtml += `
                <div style="background: #020617; border-left: 3px solid #10b981; border-radius: 6px; padding: 6px 9px; margin-bottom: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
                    <h4 style="margin: 0 0 2px 0; color: #34d399; font-size: 8px; font-weight: bold;">${item.item}</h4>
                    <p style="margin: 0; color: #cbd5e1; font-size: 7px; line-height: 1.25;">${item.description}</p>
                </div>
            `;
        });

        let pdfModernNutriHtml = '';
        modernNutritionList.forEach(item => {
            pdfModernNutriHtml += `
                <div style="background: #020617; border-left: 3px solid #06b6d4; border-radius: 6px; padding: 6px 9px; margin-bottom: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
                    <h4 style="margin: 0 0 2px 0; color: #22d3ee; font-size: 8px; font-weight: bold;">${item.item}</h4>
                    <p style="margin: 0; color: #cbd5e1; font-size: 7px; line-height: 1.25;">${item.description}</p>
                </div>
            `;
        });

        let pdfAyurViharaHtml = '';
        ayurViharaList.forEach(item => {
            pdfAyurViharaHtml += `
                <div style="background: #020617; border-left: 3px solid #f59e0b; border-radius: 6px; padding: 6px 9px; margin-bottom: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
                    <h4 style="margin: 0 0 2px 0; color: #fbbf24; font-size: 8px; font-weight: bold;">${item.item}</h4>
                    <p style="margin: 0; color: #cbd5e1; font-size: 7px; line-height: 1.25;">${item.description}</p>
                </div>
            `;
        });

        let pdfModernHabitsHtml = '';
        modernHabitsList.forEach(item => {
            pdfModernHabitsHtml += `
                <div style="background: #020617; border-left: 3px solid #6366f1; border-radius: 6px; padding: 6px 9px; margin-bottom: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.2);">
                    <h4 style="margin: 0 0 2px 0; color: #818cf8; font-size: 8px; font-weight: bold;">${item.item}</h4>
                    <p style="margin: 0; color: #cbd5e1; font-size: 7px; line-height: 1.25;">${item.description}</p>
                </div>
            `;
        });

        // Vitals formatting
        const weightStr = genExam.weightKg ? `${genExam.weightKg} kg` : 'Not recorded';
        const pulseStr = genExam.pulseBpm ? `${genExam.pulseBpm} bpm` : 'Not recorded';
        let bpStr = 'Not recorded';
        if (genExam.bpSystolic && genExam.bpDiastolic) {
            bpStr = `${genExam.bpSystolic} / ${genExam.bpDiastolic} mmHg`;
        } else if (genExam.bpMmHg) {
            bpStr = genExam.bpMmHg;
        }

        const renderPillTags = (val, emptyText = 'None reported', bg = '#0f172a', border = '#1e293b', text = '#cbd5e1') => {
            if (!val || (Array.isArray(val) && val.length === 0)) {
                return `<span style="font-size: 7.5px; color: #64748b; font-style: italic; line-height: 1.2;">${emptyText}</span>`;
            }
            const arr = Array.isArray(val) ? val : [val];
            return arr.map(item => `
                <span style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: ${bg}; border: 1px solid ${border}; color: ${text}; padding: 2.5px 6px; border-radius: 4px; font-size: 7px; font-weight: 600; margin: 1px 2px 2px 0; vertical-align: middle; box-sizing: border-box;">
                    ${item}
                </span>
            `).join('');
        };

        // Format Diet & Sleep for Page 3
        const dietTypeStr = q.dietType || (Array.isArray(q.diet) ? q.diet[0] : (q.diet || 'Standard'));
        const consumedFoodsVal = q.consumedFoods && q.consumedFoods.length > 0 
            ? q.consumedFoods 
            : (Array.isArray(q.diet) && q.diet.length > 1 ? q.diet.slice(1) : []);

        const sleepDurationStr = q.sleepDuration || (Array.isArray(q.sleep) ? q.sleep[0] : (q.sleep || '6-8 hrs'));
        const sleepQualityStr = q.sleepQuality || (Array.isArray(q.sleep) && q.sleep.length > 1 ? q.sleep[1] : 'Normal');

        // Avatar Image
        const patientImgSrc = report.userImgData 
            ? (report.userImgData.startsWith('data:image') ? report.userImgData : 'data:image/jpeg;base64,' + report.userImgData)
            : null;

        const printContainer = document.createElement('div');
        printContainer.style.position = 'fixed';
        printContainer.style.top = '0';
        printContainer.style.left = '0';
        printContainer.style.width = '794px';
        printContainer.style.zIndex = '999999';
        printContainer.style.backgroundColor = '#020617';

        printContainer.innerHTML = `
            <div id="admin-pdf-capture-root" style="width: 794px; background-color: #020617; color: #ffffff; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; line-height: 1.3;">
                
                <!-- ==================== PAGE 1: AI DIAGNOSTIC DOSSIER ==================== -->
                <div class="pdf-page" style="width: 794px; height: 1122px; max-height: 1122px; min-height: 1122px; box-sizing: border-box; padding: 32px 35px; position: relative; background-color: #020617; overflow: hidden;">
                    
                    <!-- Page 1 Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10b981; padding-bottom: 10px; margin-bottom: 14px;">
                        <div style="display: flex; gap: 12px; align-items: center;">
                            <div style="width: 52px; height: 52px; border-radius: 12px; overflow: hidden; border: 2px solid #10b981; background-color: #0f172a; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                ${patientImgSrc ? `<img src="${patientImgSrc}" style="width: 100%; height: 100%; object-fit: cover;" />` : `<span style="font-size: 22px; color: #64748b;">👤</span>`}
                            </div>
                            <div>
                                <h1 style="margin: 0; color: #34d399; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1;">AyurSkin PRO</h1>
                                <p style="margin: 3px 0 0 0; color: #10b981; font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; line-height: 1.2;">Official Clinical Skin Dossier • Page 1 of 3</p>
                            </div>
                        </div>
                        <div style="text-align: right; background: #0f172a; padding: 6px 12px; border-radius: 10px; border: 1px solid #1e293b;">
                            <div style="display: flex; gap: 10px;">
                                <div style="text-align: left;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 7px; text-transform: uppercase; line-height: 1.2;">Patient Name</p>
                                    <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 10px; font-weight: bold; line-height: 1.2;">${p.name || 'Anonymous'}</p>
                                </div>
                                <div style="width: 1px; background: #1e293b;"></div>
                                <div style="text-align: left;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 7px; text-transform: uppercase; line-height: 1.2;">Age / Gender</p>
                                    <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 10px; font-weight: bold; line-height: 1.2;">${p.age || '--'} / ${p.gender || '--'}</p>
                                </div>
                                <div style="width: 1px; background: #1e293b;"></div>
                                <div style="text-align: left;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 7px; text-transform: uppercase; line-height: 1.2;">Phone / City</p>
                                    <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 10px; font-weight: bold; line-height: 1.2;">${p.phone || 'N/A'} • ${p.city || 'N/A'}</p>
                                </div>
                            </div>
                            <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
                                <p style="margin: 0; color: #64748b; font-size: 7px; line-height: 1.2;">Scan ID: ${report.id.substring(0, 8).toUpperCase()}</p>
                                <p style="margin: 0; color: #64748b; font-size: 7px; line-height: 1.2;">Date: ${report.timestamp ? new Date(report.timestamp).toLocaleDateString() : 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Diagnosis & Analytics Banner -->
                    <div style="display: flex; gap: 10px; margin-bottom: 12px; height: 105px;">
                        <div style="flex: 2; background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); border: 1px solid #059669; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; justify-content: center;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                                <h2 style="margin: 0; color: #6ee7b7; font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; line-height: 1.2;">Primary Diagnosis</h2>
                                <div style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: #020617; padding: 3.5px 9px; border-radius: 20px; border: 1px solid #10b981; font-size: 8.5px; font-weight: bold; color: #34d399; white-space: nowrap; box-sizing: border-box;">${diagnosisPercentage}</div>
                            </div>
                            <h3 style="margin: 0; color: #ffffff; font-size: 16px; font-weight: bold; line-height: 1.25;">${diseaseType}</h3>
                        </div>

                        <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 6px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <h2 style="margin: 0 0 2px 0; color: #94a3b8; font-size: 7.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">Spread Area</h2>
                            <div style="width: 44px; height: 44px; position: relative;">
                                <svg viewBox="0 0 36 36" style="width: 100%; height: 100%;">
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1e293b" stroke-width="3"/>
                                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${severityColorCode}" stroke-width="3" stroke-dasharray="${circleCircumference}, ${circleCircumference}" stroke-dashoffset="${strokeDashOffset}"/>
                                </svg>
                                <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: ${severityColorCode}; line-height: 1;">${spread}%</div>
                            </div>
                        </div>

                        <div style="flex: 1.2; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 6px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                            <h2 style="margin: 0 0 2px 0; color: #94a3b8; font-size: 7.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">Tensor Analytics</h2>
                            ${report.chartImgData ? `<img src="${report.chartImgData}" style="width: 100%; max-height: 60px; object-fit: contain;" />` : `<p style="font-size: 7.5px; color: #64748b; margin: 0; line-height: 1.2;">Multi-Modal Verified</p>`}
                        </div>
                    </div>
                    
                    <!-- Modern & Ayurvedic Dual Perspectives -->
                    <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                        <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; border-bottom: 2px solid #3b82f6; padding-bottom: 5px;">
                                <h2 style="margin: 0; color: #60a5fa; font-size: 9px; font-weight: bold; text-transform: uppercase; line-height: 1.2;">Modern Dermatology</h2>
                            </div>
                            <p style="color: #cbd5e1; font-size: 8.5px; margin: 0; line-height: 1.35;">${modernInfo}</p>
                        </div>
                        <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; border-bottom: 2px solid #10b981; padding-bottom: 5px;">
                                <h2 style="margin: 0; color: #34d399; font-size: 9px; font-weight: bold; text-transform: uppercase; line-height: 1.2;">Ayurvedic Nidana</h2>
                            </div>
                            <p style="color: #cbd5e1; font-size: 8.5px; margin: 0; line-height: 1.35;">${ayurvedicInfo}</p>
                        </div>
                    </div>

                    <!-- Causes & Symptoms Row -->
                    <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                        <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; border-bottom: 2px solid #ef4444; padding-bottom: 5px;">
                                <h2 style="margin: 0; color: #f8fafc; font-size: 9px; font-weight: bold; line-height: 1.2;">Etiology & Root Causes</h2>
                            </div>
                            <h3 style="margin: 0 0 2px 0; color: #60a5fa; font-size: 7.5px; font-weight: bold; line-height: 1.2;">Modern Aspect:</h3>
                            <p style="color: #cbd5e1; font-size: 7.5px; margin: 0 0 4px 0; line-height: 1.25;">${detailedRootCause.modern || 'Sebaceous hyperactivity & barrier shifts.'}</p>
                            <h3 style="margin: 0 0 2px 0; color: #34d399; font-size: 7.5px; font-weight: bold; line-height: 1.2;">Ayurvedic Aspect:</h3>
                            <p style="color: #cbd5e1; font-size: 7.5px; margin: 0; line-height: 1.25;">${detailedRootCause.ayurvedic || 'Dosha aggravation & Ama Srotorodha.'}</p>
                        </div>
                        <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;">
                            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; border-bottom: 2px solid #f59e0b; padding-bottom: 5px;">
                                <h2 style="margin: 0; color: #f8fafc; font-size: 9px; font-weight: bold; line-height: 1.2;">Clinical Symptoms</h2>
                            </div>
                            <ul style="color: #cbd5e1; font-size: 8px; list-style-type: none; padding: 0; margin: 0; line-height: 1.35;">${symptomsList}</ul>
                        </div>
                    </div>
                    
                    <!-- Dual Recovery Protocols -->
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #1e293b; padding-bottom: 5px;">
                            <div style="display: inline-flex; align-items: center; gap: 6px;">
                                <h2 style="color: #f8fafc; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; line-height: 1.2;">Dual Recovery Regimen</h2>
                                <span style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: #064e3b; color: #34d399; padding: 2.5px 7px; border-radius: 8px; font-size: 6.5px; font-weight: bold; border: 0.5px solid #10b981; box-sizing: border-box;">Dual Matrix</span>
                            </div>
                            <div style="display: inline-flex; align-items: center; gap: 5px; background: #064e3b; border: 1px solid #10b981; padding: 3px 8px; border-radius: 10px; line-height: 1; box-sizing: border-box; box-shadow: 0 0 10px rgba(16,185,129,0.2);">
                                <span style="display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: #34d399; flex-shrink: 0;"></span>
                                <span style="color: #a7f3d0; font-size: 7.5px; font-weight: bold; letter-spacing: 0.2px; line-height: 1; display: inline-block;">Algorithmic Treatment Suggestions for Clinical Review.</span>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <div style="flex: 1; background: #020617; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; border-bottom: 1.5px solid #3b82f6; padding-bottom: 4px;">
                                    <h3 style="color: #60a5fa; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 1.2;">Modern Science Protocols</h3>
                                    <span style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: #1e3a8a; color: #93c5fd; padding: 2.5px 7px; border-radius: 8px; font-size: 6px; font-weight: bold; box-sizing: border-box;">Dermatology</span>
                                </div>
                                <div>${modernHtml}</div>
                            </div>
                            <div style="flex: 1; background: #020617; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; border-bottom: 1.5px solid #10b981; padding-bottom: 4px;">
                                    <h3 style="color: #34d399; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 1.2;">Ayurvedic Herbal Protocols</h3>
                                    <span style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: #064e3b; color: #6ee7b7; padding: 2.5px 7px; border-radius: 8px; font-size: 6px; font-weight: bold; box-sizing: border-box;">Natural Lepa</span>
                                </div>
                                <div>${ayurvedicHtml}</div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Page 1 Footer -->
                    <div style="position: absolute; bottom: 20px; left: 35px; right: 35px; text-align: center; color: #475569; font-size: 7px; border-top: 1px solid #1e293b; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
                        <span>AyurSkin PRO Diagnostic Terminal • Confidential Medical Dossier</span>
                        <span style="color: #10b981; font-weight: bold;">Page 1 of 3 • Continue to Page 2 for Holistic Dietary & Lifestyle Blueprint ➔</span>
                    </div>
                </div>


                <!-- ==================== PAGE 2: HOLISTIC DIETARY & LIFESTYLE BLUEPRINT ==================== -->
                <div class="pdf-page" style="width: 794px; height: 1122px; max-height: 1122px; min-height: 1122px; box-sizing: border-box; padding: 32px 35px; position: relative; background-color: #020617; overflow: hidden;">
                    
                    <!-- Page 2 Header -->
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #10b981; padding-bottom: 10px; margin-bottom: 14px;">
                        <div style="display: flex; gap: 12px; align-items: center;">
                            <div style="width: 48px; height: 48px; border-radius: 12px; border: 2px solid #10b981; background: #064e3b; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0;">
                                🌿
                            </div>
                            <div>
                                <h1 style="margin: 0; color: #34d399; font-size: 19px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1;">Holistic Dietary & Lifestyle Prescription</h1>
                                <p style="margin: 3px 0 0 0; color: #10b981; font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; line-height: 1.2;">Integrative Ahara (Diet) & Vihara (Lifestyle) Therapeutic Strategy • Page 2 of 3</p>
                            </div>
                        </div>
                        <div style="text-align: right; background: #0f172a; padding: 5px 12px; border-radius: 8px; border: 1px solid #1e293b; display: inline-flex; align-items: center;">
                            <span style="color: #f8fafc; font-size: 9px; font-weight: bold; line-height: 1.2;">${p.name || 'Anonymous'}</span>
                            <span style="color: #64748b; font-size: 8px; margin: 0 5px; line-height: 1.2;">•</span>
                            <span style="color: #34d399; font-size: 8px; font-family: monospace; line-height: 1.2;">ID: ${report.id.substring(0,8).toUpperCase()}</span>
                        </div>
                    </div>

                    <!-- Section 1: Ahara Guidance (Dietary Plan) -->
                    <div style="margin-bottom: 14px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #1e293b; padding-bottom: 5px;">
                            <div style="display: inline-flex; align-items: center; gap: 6px;">
                                <h2 style="color: #f8fafc; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; line-height: 1.2;">Section 1: Ahara — Dietary & Nutritional Guidance</h2>
                            </div>
                            <span style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: #064e3b; color: #34d399; padding: 2.5px 7px; border-radius: 8px; font-size: 6.5px; font-weight: bold; box-sizing: border-box;">Ayurvedic Pathya + Modern Nutrition</span>
                        </div>
                        
                        <div style="display: flex; gap: 10px;">
                            <!-- Ayurvedic Diet Column -->
                            <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #10b981; padding-bottom: 5px;">
                                    <h3 style="color: #34d399; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 1.2;">Ayurvedic Pathya & Apathya Ahara</h3>
                                    <span style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: #064e3b; color: #6ee7b7; padding: 2.5px 6px; border-radius: 8px; font-size: 6px; font-weight: bold; box-sizing: border-box;">Rasa & Agni</span>
                                </div>
                                ${pdfAyurPathyaHtml}
                            </div>

                            <!-- Modern Nutrition Column -->
                            <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #06b6d4; padding-bottom: 5px;">
                                    <h3 style="color: #22d3ee; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 1.2;">Modern Clinical Nutrition Plan</h3>
                                    <span style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: #164e63; color: #a5f3fc; padding: 2.5px 6px; border-radius: 8px; font-size: 6px; font-weight: bold; box-sizing: border-box;">Nutraceutical</span>
                                </div>
                                ${pdfModernNutriHtml}
                            </div>
                        </div>
                    </div>

                    <!-- Section 2: Vihara Guidance (Lifestyle Protocols) -->
                    <div style="margin-bottom: 14px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #1e293b; padding-bottom: 5px;">
                            <div style="display: inline-flex; align-items: center; gap: 6px;">
                                <h2 style="color: #f8fafc; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; line-height: 1.2;">Section 2: Vihara — Lifestyle & Circadian Protocols</h2>
                            </div>
                            <span style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: #78350f; color: #fde68a; padding: 2.5px 7px; border-radius: 8px; font-size: 6.5px; font-weight: bold; box-sizing: border-box;">Dinacharya + Skin Barrier Hygiene</span>
                        </div>
                        
                        <div style="display: flex; gap: 10px;">
                            <!-- Ayurvedic Vihara Column -->
                            <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #f59e0b; padding-bottom: 5px;">
                                    <h3 style="color: #fbbf24; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 1.2;">Ayurvedic Dinacharya & Vihara</h3>
                                    <span style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: #78350f; color: #fde68a; padding: 2.5px 6px; border-radius: 8px; font-size: 6px; font-weight: bold; box-sizing: border-box;">Dinacharya</span>
                                </div>
                                ${pdfAyurViharaHtml}
                            </div>

                            <!-- Modern Circadian Habits Column -->
                            <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #6366f1; padding-bottom: 5px;">
                                    <h3 style="color: #818cf8; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 1.2;">Modern Circadian & Barrier Habits</h3>
                                    <span style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: #312e81; color: #c7d2fe; padding: 2.5px 6px; border-radius: 8px; font-size: 6px; font-weight: bold; box-sizing: border-box;">Circadian</span>
                                </div>
                                ${pdfModernHabitsHtml}
                            </div>
                        </div>
                    </div>

                    <!-- Section 3: Recommended Daily Circadian Integration Rhythm -->
                    <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px 12px; margin-bottom: 12px;">
                        <h3 style="color: #e2e8f0; font-size: 8.5px; font-weight: bold; margin: 0 0 6px 0; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">Recommended Daily Circadian Integration Rhythm</h3>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;">
                            <div style="background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 5px 7px;">
                                <p style="margin: 0; color: #34d399; font-size: 7.5px; font-weight: bold; line-height: 1.2;">🌅 06:00 - Morning</p>
                                <p style="margin: 2px 0 0 0; color: #cbd5e1; font-size: 6.5px; line-height: 1.25;">Brahma Muhurta awakening, Ushapana (lukewarm water), cool herbal cleanse.</p>
                            </div>
                            <div style="background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 5px 7px;">
                                <p style="margin: 0; color: #22d3ee; font-size: 7.5px; font-weight: bold; line-height: 1.2;">☀️ 12:30 - Midday</p>
                                <p style="margin: 2px 0 0 0; color: #cbd5e1; font-size: 6.5px; line-height: 1.25;">Principal Pathya meal with digestive spices, high-fiber greens, SPF 50+ reapplication.</p>
                            </div>
                            <div style="background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 5px 7px;">
                                <p style="margin: 0; color: #fbbf24; font-size: 7.5px; font-weight: bold; line-height: 1.2;">🌆 19:30 - Evening</p>
                                <p style="margin: 2px 0 0 0; color: #cbd5e1; font-size: 6.5px; line-height: 1.25;">Light digestive dinner, botanical Mukhalepa application, 10 min Sheetali Pranayama.</p>
                            </div>
                            <div style="background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 5px 7px;">
                                <p style="margin: 0; color: #818cf8; font-size: 7.5px; font-weight: bold; line-height: 1.2;">🌙 22:00 - Night</p>
                                <p style="margin: 2px 0 0 0; color: #cbd5e1; font-size: 6.5px; line-height: 1.25;">Screen curfew, barrier moisture sealing, 7.5-8h restorative darkness sleep.</p>
                            </div>
                        </div>
                    </div>

                    <!-- Section 4: Clinical Advisory & Disclaimer -->
                    <div style="background: #064e3b; border: 1px solid #10b981; border-radius: 10px; padding: 7px 12px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex: 1; padding-right: 10px;">
                            <h4 style="margin: 0; color: #6ee7b7; font-size: 7.5px; font-weight: bold; text-transform: uppercase; line-height: 1.2;">Clinical Advisory Notice</h4>
                            <p style="margin: 2px 0 0 0; color: #a7f3d0; font-size: 6.5px; line-height: 1.25;">
                                This integrated dietary and lifestyle blueprint is algorithmically formulated from multi-angle neural tensor evaluations and the patient's 20-point clinical dossier. It serves as an assistive therapeutic guideline for holistic management.
                            </p>
                        </div>
                        <div style="text-align: center; border-left: 1px solid #10b981; padding-left: 10px; min-width: 105px;">
                            <div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; border: 1.5px dashed #34d399; border-radius: 6px; padding: 4px 8px; line-height: 1.2; box-sizing: border-box;">
                                <p style="margin: 0; color: #34d399; font-size: 6px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">Validated AI Dossier</p>
                                <p style="margin: 2px 0 0 0; color: #e2e8f0; font-size: 6.5px; font-weight: 800; line-height: 1.2;">AYURSKIN CLINICAL</p>
                            </div>
                        </div>
                    </div>

                    <!-- Page 2 Footer -->
                    <div style="position: absolute; bottom: 20px; left: 35px; right: 35px; text-align: center; color: #475569; font-size: 7px; border-top: 1px solid #1e293b; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
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
                            <span style="color: #f8fafc; font-size: 9px; font-weight: bold; line-height: 1.2;">${p.name || 'Anonymous'}</span>
                            <span style="color: #64748b; font-size: 8px; margin: 0 5px; line-height: 1.2;">•</span>
                            <span style="color: #38bdf8; font-size: 8px; font-family: monospace; line-height: 1.2;">ID: ${report.id.substring(0,8).toUpperCase()}</span>
                        </div>
                    </div>

                    <!-- Bento Grid for 20 Questions (2 Columns x 3 Rows) -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                        
                        <!-- CARD 1: General Examination & Vitals (Q19) -->
                        <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #3b82f6; padding-bottom: 5px;">
                                <h3 style="margin: 0; color: #60a5fa; font-size: 8.5px; font-weight: bold; line-height: 1.2;">#19. General Examination & Vitals</h3>
                                <span style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: #1e3a8a; color: #93c5fd; padding: 2.5px 6px; border-radius: 4px; font-size: 6.5px; font-weight: bold; box-sizing: border-box;">Physical</span>
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
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #10b981; padding-bottom: 5px;">
                                <h3 style="margin: 0; color: #34d399; font-size: 8.5px; font-weight: bold; line-height: 1.2;">Topography & Chronology (Q1 - Q4)</h3>
                                <span style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: #064e3b; color: #6ee7b7; padding: 2.5px 6px; border-radius: 4px; font-size: 6.5px; font-weight: bold; box-sizing: border-box;">Chief Complaint</span>
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
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #f59e0b; padding-bottom: 5px;">
                                <h3 style="margin: 0; color: #fbbf24; font-size: 8.5px; font-weight: bold; line-height: 1.2;">Clinical Symptoms & Triggers (Q5 - Q8)</h3>
                                <span style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: #78350f; color: #fde68a; padding: 2.5px 6px; border-radius: 4px; font-size: 6.5px; font-weight: bold; box-sizing: border-box;">Symptom Matrix</span>
                            </div>
                            <div style="margin-bottom: 4px;">
                                <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#5. Symptoms Reported:</p>
                                <div style="line-height: 1.2;">${renderPillTags(q.symptoms, 'None reported', '#020617', '#d97706', '#fde68a')}</div>
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
                                    <div style="line-height: 1.2;">${renderPillTags(q.allergies, 'None reported', '#020617', '#9333ea', '#d8b4fe')}</div>
                                </div>
                            </div>
                        </div>

                        <!-- CARD 4: Medical History & Heredity (Q9 - Q11, Q20) -->
                        <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #ec4899; padding-bottom: 5px;">
                                <h3 style="margin: 0; color: #f472b6; font-size: 8.5px; font-weight: bold; line-height: 1.2;">Medical Profile & History (Q9 - Q11, Q20)</h3>
                                <span style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: #831843; color: #fbcfe8; padding: 2.5px 6px; border-radius: 4px; font-size: 6.5px; font-weight: bold; box-sizing: border-box;">Systemic</span>
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
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #10b981; padding-bottom: 5px;">
                                <h3 style="margin: 0; color: #34d399; font-size: 8.5px; font-weight: bold; line-height: 1.2;">Ayurvedic Ahara & Agni (Q12 - Q15)</h3>
                                <span style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: #064e3b; color: #6ee7b7; padding: 2.5px 6px; border-radius: 4px; font-size: 6.5px; font-weight: bold; box-sizing: border-box;">Metabolism</span>
                            </div>
                            <div style="display: flex; gap: 6px; margin-bottom: 4px;">
                                <div style="flex: 1;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#12. Skin Prakriti:</p>
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
                                    <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#14. Agni Status:</p>
                                    <p style="margin: 1px 0 0 0; color: #f8fafc; font-size: 7.5px; line-height: 1.2;">${q.digestion || 'Normal / Sama'}</p>
                                </div>
                                <div style="flex: 1;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#15. Bowel Habit:</p>
                                    <p style="margin: 1px 0 0 0; color: #f8fafc; font-size: 7.5px; line-height: 1.2;">${q.bowelHabit || 'Regular / Madhyama'}</p>
                                </div>
                            </div>
                        </div>

                        <!-- CARD 6: Lifestyle, Habits & Circadian Nidra (Q16 - Q18) -->
                        <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #8b5cf6; padding-bottom: 5px;">
                                <h3 style="margin: 0; color: #a78bfa; font-size: 8.5px; font-weight: bold; line-height: 1.2;">Vihara, Lifestyle & Sleep (Q16 - Q18)</h3>
                                <span style="display: inline-flex; align-items: center; justify-content: center; line-height: 1; background: #4c1d95; color: #c4b5fd; padding: 2.5px 6px; border-radius: 4px; font-size: 6.5px; font-weight: bold; box-sizing: border-box;">Daily Habits</span>
                            </div>
                            <div style="margin-bottom: 4px;">
                                <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#16. Lifestyle & Activity:</p>
                                <p style="margin: 1px 0 0 0; color: #f8fafc; font-size: 7.5px; line-height: 1.2;">${q.lifestyle || 'Moderate'}</p>
                            </div>
                            <div style="margin-bottom: 4px;">
                                <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#17. Personal Habits & Addictions:</p>
                                <div style="line-height: 1.2;">${renderPillTags(q.habits, 'None reported', '#020617', '#6366f1', '#c7d2fe')}</div>
                            </div>
                            <div style="display: flex; gap: 6px;">
                                <div style="flex: 1;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#18. Sleep Duration:</p>
                                    <p style="margin: 1px 0 0 0; color: #38bdf8; font-size: 7.5px; font-weight: bold; line-height: 1.2;">${sleepDurationStr}</p>
                                </div>
                                <div style="flex: 1;">
                                    <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#18. Sleep Quality:</p>
                                    <p style="margin: 1px 0 0 0; color: #a78bfa; font-size: 7.5px; font-weight: bold; line-height: 1.2;">${sleepQualityStr}</p>
                                </div>
                            </div>
                        </div>

                    </div>

                    <!-- Clinical Review & Physician Sign-off Box -->
                    <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 10px 14px; margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 2;">
                                <h3 style="margin: 0 0 4px 0; color: #f8fafc; font-size: 8.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">Attending Practitioner / Vaidya Review</h3>
                                <p style="margin: 0; color: #94a3b8; font-size: 7.5px; line-height: 1.3;">
                                    Clinical assessment cross-verified against multi-modal tensor metrics and 20-point holistic intake data.
                                </p>
                                <div style="margin-top: 8px; border-bottom: 1px dashed #334155; width: 85%; height: 12px;"></div>
                                <p style="margin: 3px 0 0 0; color: #64748b; font-size: 6.5px; line-height: 1.2;">Clinical Observation Notes / Dosage Adjustments</p>
                            </div>
                            <div style="flex: 1; text-align: right; border-left: 1px solid #1e293b; padding-left: 12px;">
                                <div style="height: 25px;"></div>
                                <div style="border-top: 1px solid #475569; padding-top: 4px; display: inline-block; min-width: 130px; text-align: center;">
                                    <p style="margin: 0; color: #cbd5e1; font-size: 7.5px; font-weight: bold; line-height: 1.2;">Authorized Medical Stamp / Sign</p>
                                    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 6.5px; line-height: 1.2;">AyurSkin Clinical Network</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Page 3 Footer -->
                    <div style="position: absolute; bottom: 20px; left: 35px; right: 35px; text-align: center; color: #475569; font-size: 7px; border-top: 1px solid #1e293b; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
                        <span>AyurSkin PRO Diagnostic Terminal • Practitioner Confidential Record</span>
                        <span style="color: #38bdf8; font-weight: bold;">Page 3 of 3 • End of Clinical Dossier</span>
                    </div>
                </div>

            </div>
        `;

        document.body.appendChild(printContainer);

        const originalScrollY = window.scrollY;
        window.scrollTo(0, 0);

        try {
            await new Promise(r => setTimeout(r, 200));

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
                    letterRendering: true,
                    backgroundColor: '#020617',
                    width: 794,
                    height: 1122
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.98);
                if (i > 0) {
                    pdf.addPage([794, 1122], 'portrait');
                }
                pdf.addImage(imgData, 'JPEG', 0, 0, 794, 1122, undefined, 'FAST');
            }

            const patientNameClean = (p.name || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
            pdf.save(`AyurSkin-Clinical-Dossier-${patientNameClean}-${report.id.substring(0,6)}.pdf`);

        } catch (err) {
            console.error("PDF Generation error:", err);
            alert("Error exporting PDF. Please verify patient data is loaded.");
        } finally {
            window.scrollTo(0, originalScrollY);
            if (printContainer && printContainer.parentNode) {
                printContainer.parentNode.removeChild(printContainer);
            }
        }
    };

    // 3. View Full Clinical Dossier Modal
    window.viewReport = function(id) {
        const report = allReports.find(r => r.id === id);
        if(!report) return;

        currentActiveReportId = id;

        const p = report.patientDetails || {};
        const a = report.analysisData?.analysis || {};
        const spread = typeof a.spreadPercentage === 'number' ? a.spreadPercentage : 25;
        const severityColorCode = spread > 50 ? '#ef4444' : (spread > 20 ? '#f59e0b' : '#10b981');
        
        const circleCircumference = 2 * Math.PI * 15.9155; 
        const strokeDashOffset = circleCircumference - (spread / 100) * circleCircumference;

        let causesHtml = '';
        if (a.detailedRootCause && typeof a.detailedRootCause === 'object') {
            causesHtml = `
                <h4 class="text-blue-400 text-xs font-bold mb-1"><i class="fa-solid fa-stethoscope"></i> Modern Aspect</h4>
                <p class="text-slate-300 text-sm mb-3">${a.detailedRootCause.modern || 'N/A'}</p>
                <h4 class="text-emerald-400 text-xs font-bold mb-1"><i class="fa-solid fa-leaf"></i> Ayurvedic Aspect</h4>
                <p class="text-slate-300 text-sm">${a.detailedRootCause.ayurvedic || 'N/A'}</p>
            `;
        } else if (a.causes && Array.isArray(a.causes)) {
            causesHtml = `<ul class="space-y-1">` + a.causes.map(c => `<li class="mb-1 pl-2 border-l-2 border-red-500 text-slate-300 text-sm">${c}</li>`).join('') + `</ul>`;
        } else {
            causesHtml = `<p class="text-slate-300 text-sm">${a.detailedRootCause || 'N/A'}</p>`;
        }

        const symptomsList = (a.symptoms || []).map(s => `<li class="mb-1 pl-2 border-l-2 border-amber-500 text-slate-300 text-sm">${s}</li>`).join('');
        
        let ayurvedicRemediesHtml = '';
        if (report.analysisData?.ayurvedicRemedies && report.analysisData.ayurvedicRemedies.length > 0) {
            report.analysisData.ayurvedicRemedies.forEach((t) => {
                ayurvedicRemediesHtml += `
                <div class="bg-slate-950/70 border-l-4 border-emerald-500 rounded-r-2xl p-4 mb-3 border border-white/5 hover:border-emerald-500/30 transition-all shadow-md">
                    <h5 class="text-emerald-400 text-sm font-bold mb-1 flex items-center gap-2">
                        <i class="${t.icon || 'fa-solid fa-leaf'}"></i> ${t.title}
                    </h5>
                    <p class="text-xs text-slate-300 leading-relaxed">${t.instructions}</p>
                </div>`;
            });
        } else {
            ayurvedicRemediesHtml = `<p class="text-xs text-slate-400 italic">No specific Ayurvedic remedies recorded.</p>`;
        }

        let modernRemediesHtml = '';
        if (report.analysisData?.modernRemedies && report.analysisData.modernRemedies.length > 0) {
            report.analysisData.modernRemedies.forEach((t) => {
                modernRemediesHtml += `
                <div class="bg-slate-950/70 border-l-4 border-blue-500 rounded-r-2xl p-4 mb-3 border border-white/5 hover:border-blue-500/30 transition-all shadow-md">
                    <h5 class="text-blue-400 text-sm font-bold mb-1 flex items-center gap-2">
                        <i class="${t.icon || 'fa-solid fa-flask'}"></i> ${t.title}
                    </h5>
                    <p class="text-xs text-slate-300 leading-relaxed">${t.instructions}</p>
                </div>`;
            });
        } else {
            modernRemediesHtml = `<p class="text-xs text-slate-400 italic">No specific Modern science remedies recorded.</p>`;
        }

        // Build Dietary & Lifestyle HTML for Modal
        const dietAdvice = report.analysisData?.dietaryAdvice || {};
        const lifeAdvice = report.analysisData?.lifestyleAdvice || {};

        const ayurPathya = (dietAdvice.ayurvedicPathya && dietAdvice.ayurvedicPathya.length > 0) ? dietAdvice.ayurvedicPathya : [
            {
                item: "Pathya Ahara (Wholesome Foods & Agni Deepana)",
                description: "Incorporate cooling, bitter (Tikta) and astringent (Kashaya) foods like bottle gourd, mung dal, cucumber, and cilantro. Use digestive spices like fennel (Saunf) and coriander (Dhaniya).",
                icon: "fa-solid fa-bowl-food"
            },
            {
                item: "Apathya Ahara (Strictly Prohibited Items)",
                description: "Avoid Viruddha Ahara (incompatible food combinations), heavy fermented foods, spicy and deep-fried items, and nighttime curd consumption that exacerbate Pitta-Rakta vitiation.",
                icon: "fa-solid fa-ban"
            }
        ];

        const modernNutrition = (dietAdvice.modernNutrition && dietAdvice.modernNutrition.length > 0) ? dietAdvice.modernNutrition : [
            {
                item: "Low Glycemic Load & Insulin Regulation",
                description: "Eliminate high-GI refined sugars, processed snacks, and excessive dairy to suppress IGF-1 induced sebocyte hyperproliferation.",
                icon: "fa-solid fa-apple-whole"
            },
            {
                item: "Microbiome & Barrier Nutrients",
                description: "Consume foods rich in Zinc, Vitamin E, and Omega-3 fatty acids to strengthen epidermal tight junctions and modulate inflammatory cytokines.",
                icon: "fa-solid fa-seedling"
            }
        ];

        const ayurVihara = (lifeAdvice.ayurvedicVihara && lifeAdvice.ayurvedicVihara.length > 0) ? lifeAdvice.ayurvedicVihara : [
            {
                item: "Dinacharya & Ritucharya (Daily Routine)",
                description: "Wake during Brahma Muhurta, practice gentle face washing with cool water, and avoid direct exposure to strong midday sun (Atapa) and hot winds.",
                icon: "fa-solid fa-sun"
            },
            {
                item: "Nidra & Pranayama (Sleep & Stress Harmony)",
                description: "Maintain regular sleep cycles avoiding late nights (Ratrijagarana). Practice 10 minutes of Sheetali and Anulom Vilom Pranayama for Pitta pacification.",
                icon: "fa-solid fa-moon"
            }
        ];

        const modernHabits = (lifeAdvice.modernHabits && lifeAdvice.modernHabits.length > 0) ? lifeAdvice.modernHabits : [
            {
                item: "Circadian Rhythm & HPA Axis Modulation",
                description: "Aim for 7.5-8 hours of continuous nocturnal rest to promote tissue repair, optimize collagen synthesis, and lower systemic cortisol spikes.",
                icon: "fa-solid fa-bed"
            },
            {
                item: "Photoprotection & Barrier Hygiene",
                description: "Apply broad-spectrum non-comedogenic sunscreen daily (SPF 50+), maintain barrier moisture, and avoid touching the face with unwashed hands.",
                icon: "fa-solid fa-shield-halved"
            }
        ];

        let modalAyurPathyaHtml = '';
        ayurPathya.forEach(item => {
            modalAyurPathyaHtml += `
                <div class="bg-slate-950/70 border-l-4 border-emerald-500 rounded-r-2xl p-4 mb-3 border border-white/5 hover:border-emerald-500/30 transition-all shadow-md">
                    <h5 class="text-emerald-400 text-sm font-bold mb-1 flex items-center gap-2">
                        <i class="${item.icon || 'fa-solid fa-bowl-food'}"></i> ${item.item}
                    </h5>
                    <p class="text-xs text-slate-300 leading-relaxed">${item.description}</p>
                </div>
            `;
        });

        let modalModernNutriHtml = '';
        modernNutrition.forEach(item => {
            modalModernNutriHtml += `
                <div class="bg-slate-950/70 border-l-4 border-cyan-500 rounded-r-2xl p-4 mb-3 border border-white/5 hover:border-cyan-500/30 transition-all shadow-md">
                    <h5 class="text-cyan-400 text-sm font-bold mb-1 flex items-center gap-2">
                        <i class="${item.icon || 'fa-solid fa-apple-whole'}"></i> ${item.item}
                    </h5>
                    <p class="text-xs text-slate-300 leading-relaxed">${item.description}</p>
                </div>
            `;
        });

        let modalAyurViharaHtml = '';
        ayurVihara.forEach(item => {
            modalAyurViharaHtml += `
                <div class="bg-slate-950/70 border-l-4 border-amber-500 rounded-r-2xl p-4 mb-3 border border-white/5 hover:border-amber-500/30 transition-all shadow-md">
                    <h5 class="text-amber-400 text-sm font-bold mb-1 flex items-center gap-2">
                        <i class="${item.icon || 'fa-solid fa-sun'}"></i> ${item.item}
                    </h5>
                    <p class="text-xs text-slate-300 leading-relaxed">${item.description}</p>
                </div>
            `;
        });

        let modalModernHabitsHtml = '';
        modernHabits.forEach(item => {
            modalModernHabitsHtml += `
                <div class="bg-slate-950/70 border-l-4 border-indigo-500 rounded-r-2xl p-4 mb-3 border border-white/5 hover:border-indigo-500/30 transition-all shadow-md">
                    <h5 class="text-indigo-400 text-sm font-bold mb-1 flex items-center gap-2">
                        <i class="${item.icon || 'fa-solid fa-bed'}"></i> ${item.item}
                    </h5>
                    <p class="text-xs text-slate-300 leading-relaxed">${item.description}</p>
                </div>
            `;
        });

        const q = report.questionnaireData || {};
        
        // Helper to format sub-section values for display
        const dietValue = [];
        if (q.dietType) dietValue.push(`Type: ${q.dietType}`);
        if (q.consumedFoods && q.consumedFoods.length > 0) {
            dietValue.push(...(Array.isArray(q.consumedFoods) ? q.consumedFoods : [q.consumedFoods]));
        }
        if (q.diet && dietValue.length === 0) {
            dietValue.push(...(Array.isArray(q.diet) ? q.diet : [q.diet]));
        }

        const sleepValue = [];
        if (q.sleepDuration) sleepValue.push(`Duration: ${q.sleepDuration}`);
        if (q.sleepQuality) sleepValue.push(`Quality: ${q.sleepQuality}`);
        if (q.sleep && sleepValue.length === 0) {
            sleepValue.push(...(Array.isArray(q.sleep) ? q.sleep : [q.sleep]));
        }

        const genExamValue = [];
        if (q.generalExamination) {
            if (q.generalExamination.weightKg) genExamValue.push(`Weight: ${q.generalExamination.weightKg} kg`);
            if (q.generalExamination.pulseBpm) genExamValue.push(`Pulse: ${q.generalExamination.pulseBpm} bpm`);
            if (q.generalExamination.bpSystolic && q.generalExamination.bpDiastolic) {
                genExamValue.push(`BP: ${q.generalExamination.bpSystolic}/${q.generalExamination.bpDiastolic} mmHg`);
            } else if (q.generalExamination.bpMmHg) {
                const bpClean = q.generalExamination.bpMmHg.replace(/\s*mmHg$/i, '');
                genExamValue.push(`BP: ${bpClean} mmHg`);
            }
        }

        const qItems = [
            { num: 1, title: 'Affected Body Part(s)', val: q.affectedBodyParts, icon: 'fa-solid fa-child-reaching' },
            { num: 2, title: 'Main Skin Concern(s)', val: q.mainConcerns, icon: 'fa-solid fa-triangle-exclamation' },
            { num: 3, title: 'Duration of Problem', val: q.duration, icon: 'fa-solid fa-clock-rotate-left' },
            { num: 4, title: 'Progression Rate & Pattern', val: q.progression, icon: 'fa-solid fa-chart-line' },
            { num: 5, title: 'Primary Clinical Symptoms', val: q.symptoms, icon: 'fa-solid fa-heart-pulse' },
            { num: 6, title: 'Known Triggers & Aggravators', val: q.triggers, icon: 'fa-solid fa-fire' },
            { num: 7, title: 'Previous Treatments Used', val: q.treatments, icon: 'fa-solid fa-prescription-bottle-medical' },
            { num: 8, title: 'Allergies & Sensitivities', val: q.allergies, icon: 'fa-solid fa-shield-virus' },
            { num: 9, title: 'Family History', val: q.familyHistory, icon: 'fa-solid fa-users' },
            { num: 10, title: 'Existing Medical Conditions', val: q.medicalConditions, icon: 'fa-solid fa-notes-medical' },
            { num: 11, title: 'Current Medications', val: q.medications, icon: 'fa-solid fa-capsules' },
            { num: 12, title: 'Ayurvedic & Modern Skin Type', val: q.skinType, icon: 'fa-solid fa-hand-sparkles' },
            { num: 13, title: 'Usual Diet (Ahara)', val: dietValue, icon: 'fa-solid fa-utensils' },
            { num: 14, title: 'Digestion Status (Agni)', val: q.digestion, icon: 'fa-solid fa-wind' },
            { num: 15, title: 'Bowel Habit (Koshtha)', val: q.bowelHabit, icon: 'fa-solid fa-arrows-spin' },
            { num: 16, title: 'Lifestyle & Daily Vihara', val: q.lifestyle, icon: 'fa-solid fa-person-running' },
            { num: 17, title: 'Personal Habits & Addictions', val: q.habits, icon: 'fa-solid fa-smoking' },
            { num: 18, title: 'Sleep Pattern & Quality (Nidra)', val: sleepValue, icon: 'fa-solid fa-moon' },
            { num: 19, title: 'General Examination (Vitals)', val: genExamValue, icon: 'fa-solid fa-heart-pulse' },
            { num: 20, title: 'Special Conditions & Exposures', val: q.specialConditions || q.femaleHealth, icon: 'fa-solid fa-notes-medical' }
        ];

        const answeredItems = qItems.filter(item => {
            if (!item.val) return false;
            if (Array.isArray(item.val) && item.val.length === 0) return false;
            return true;
        });

        let questionnaireHtml = '';
        if (answeredItems.length > 0) {
            questionnaireHtml = `
                <div class="bg-slate-900 border border-white/10 rounded-2xl p-6 mb-8">
                    <div class="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                        <div>
                            <h3 class="text-white text-base font-bold flex items-center gap-2">
                                <i class="fa-solid fa-clipboard-list text-emerald-400"></i> Comprehensive Clinical Intake Dossier
                            </h3>
                            <p class="text-xs text-slate-400 mt-1">20-Point Multi-Modal Ayurvedic & Modern Medical Synthesis</p>
                        </div>
                        <span class="bg-emerald-900/50 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            ${answeredItems.length} Sections Captured
                        </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${answeredItems.map(item => {
                            let displayVal = '';
                            if (Array.isArray(item.val)) {
                                displayVal = item.val.map(v => `<span class="inline-block px-2.5 py-1 rounded-lg bg-slate-800 border border-white/10 text-xs text-slate-200 font-medium mr-1.5 mb-1.5">${v}</span>`).join('');
                            } else {
                                displayVal = `<span class="text-xs text-slate-200 font-medium">${item.val}</span>`;
                            }
                            return `
                                <div class="bg-slate-950/60 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between">
                                    <div class="flex items-center gap-2 mb-2">
                                        <div class="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[10px] text-emerald-400 shrink-0">
                                            <i class="${item.icon}"></i>
                                        </div>
                                        <h4 class="text-xs font-semibold text-slate-300">#${item.num}. ${item.title}</h4>
                                    </div>
                                    <div class="mt-1 flex flex-wrap items-center">
                                        ${displayVal}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        modalBody.innerHTML = `
            <div class="space-y-6">
                <!-- Patient Overview Header -->
                <div class="flex flex-col md:flex-row gap-6 items-center bg-slate-900/50 p-6 rounded-2xl border border-white/5">
                    <div class="w-24 h-24 rounded-2xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400 overflow-hidden shrink-0">
                        ${report.userImgData 
                            ? `<img src="${report.userImgData}" class="w-full h-full object-cover">` 
                            : `<i class="fa-solid fa-user text-3xl"></i>`}
                    </div>
                    <div class="flex-1 text-center md:text-left">
                        <div class="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                            <h2 class="text-2xl font-bold text-white">${p.name || 'Anonymous'}</h2>
                            <span class="px-3 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                                ${p.age || '--'} Yrs • ${p.gender || '--'}
                            </span>
                        </div>
                        <p class="text-xs text-slate-400 mb-4">${p.email || 'No email'} • ${p.phone || 'No phone'} • ${p.city || 'No city'}</p>
                        
                        <div class="flex flex-wrap gap-4 justify-center md:justify-start text-xs text-slate-300">
                            <div><span class="text-slate-500">Scan ID:</span> <span class="font-mono text-emerald-400">${report.id}</span></div>
                            <div><span class="text-slate-500">Date:</span> <span>${new Date(report.timestamp).toLocaleString()}</span></div>
                        </div>
                    </div>
                </div>

                <!-- Analysis Summary Bento -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/20 rounded-2xl p-6 flex flex-col justify-center">
                        <p class="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">Primary Diagnosis</p>
                        <h3 class="text-xl font-bold text-white leading-tight mb-2">${a.overallDiseaseType || 'N/A'}</h3>
                        <p class="text-xs text-slate-400">${a.diagnosisPercentage || 'Diagnostic Complete'}</p>
                    </div>

                    <div class="bg-slate-900 border border-white/10 rounded-2xl p-6 flex items-center gap-4">
                        <div class="w-16 h-16 relative flex items-center justify-center shrink-0">
                            <svg viewBox="0 0 36 36" class="w-full h-full -rotate-90">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1e293b" stroke-width="4"/>
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${severityColorCode}" stroke-width="4" stroke-dasharray="${circleCircumference}, ${circleCircumference}" stroke-dashoffset="${strokeDashOffset}"/>
                            </svg>
                            <span class="absolute text-sm font-bold text-white">${spread}%</span>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Spread Area</p>
                            <p class="text-sm font-semibold text-white">${spread > 50 ? 'High Impact' : (spread > 20 ? 'Moderate Impact' : 'Localized Area')}</p>
                        </div>
                    </div>

                    <div class="bg-slate-900 border border-white/10 rounded-2xl p-6 flex flex-col justify-center">
                        <p class="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">General Vitals</p>
                        <p class="text-sm font-semibold text-slate-200">${genExamValue.length > 0 ? genExamValue.join(' • ') : 'Vitals Standard'}</p>
                    </div>
                </div>

                <!-- 20-Point Intake Questionnaire Dossier -->
                ${questionnaireHtml}

                <!-- Detailed Breakdown -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div class="bg-slate-900 border border-white/10 rounded-2xl p-6">
                        <h3 class="text-white text-sm font-bold mb-4 border-b border-red-500/30 pb-2">Root Causes (Pathophysiology & Nidana)</h3>
                        ${causesHtml}
                    </div>
                    <div class="bg-slate-900 border border-white/10 rounded-2xl p-6">
                        <h3 class="text-white text-sm font-bold mb-4 border-b border-amber-500/30 pb-2">Clinical Symptoms</h3>
                        <ul class="space-y-1">${symptomsList}</ul>
                    </div>
                </div>

                <!-- Treatments / Dual Recovery Protocols -->
                <div class="bg-slate-900 border border-white/10 rounded-2xl p-6 mb-8">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-white/10 gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-base shrink-0 shadow-inner">
                                <i class="fa-solid fa-notes-medical"></i>
                            </div>
                            <div>
                                <h3 class="text-white text-base font-bold">Dual Recovery Protocol (Ayurveda + Modern Science)</h3>
                                <p class="text-xs text-slate-400 mt-0.5">Comprehensive multi-target therapeutic strategy</p>
                            </div>
                        </div>
                        
                        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/90 border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.25)] self-start sm:self-auto">
                            <span class="relative flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span class="text-xs font-bold text-emerald-300 tracking-wide">Algorithmic Treatment Suggestions for Clinical Review.</span>
                        </div>
                    </div>

                    <!-- Structured Subsections -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Ayurvedic Botanical Protocols -->
                        <div class="bg-slate-950/50 rounded-2xl p-5 border border-emerald-500/20">
                            <div class="flex items-center justify-between pb-3 mb-4 border-b border-emerald-500/20">
                                <h4 class="text-emerald-400 font-bold text-sm flex items-center gap-2">
                                    <i class="fa-solid fa-leaf"></i> Ayurvedic Botanical Protocols
                                </h4>
                                <span class="text-[10px] font-bold text-emerald-300 bg-emerald-900/40 px-2.5 py-0.5 rounded-full border border-emerald-500/30">Natural</span>
                            </div>
                            <div>
                                ${ayurvedicRemediesHtml}
                            </div>
                        </div>

                        <!-- Modern Science Protocols -->
                        <div class="bg-slate-950/50 rounded-2xl p-5 border border-blue-500/20">
                            <div class="flex items-center justify-between pb-3 mb-4 border-b border-blue-500/20">
                                <h4 class="text-blue-400 font-bold text-sm flex items-center gap-2">
                                    <i class="fa-solid fa-stethoscope"></i> Modern Science Protocols
                                </h4>
                                <span class="text-[10px] font-bold text-blue-300 bg-blue-900/40 px-2.5 py-0.5 rounded-full border border-blue-500/30">Dermatological</span>
                            </div>
                            <div>
                                ${modernRemediesHtml}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Holistic Dietary & Lifestyle Blueprint (Ahara & Vihara) -->
                <div class="bg-slate-900 border border-white/10 rounded-2xl p-6 mb-8">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-white/10 gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-base shrink-0 shadow-inner">
                                <i class="fa-solid fa-utensils"></i>
                            </div>
                            <div>
                                <h3 class="text-white text-base font-bold">Personalized Dietary & Lifestyle Blueprint (Ahara & Vihara)</h3>
                                <p class="text-xs text-slate-400 mt-0.5">Integrative clinical nutrition and circadian biorhythm synchronization</p>
                            </div>
                        </div>
                        
                        <div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-950/90 via-slate-900 to-emerald-950/90 border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.25)] self-start sm:self-auto">
                            <span class="relative flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span class="text-xs font-bold text-emerald-300 tracking-wide">Derived from Questionnaire & Neural Skin Audit</span>
                        </div>
                    </div>

                    <!-- Ahara Section -->
                    <div class="mb-6">
                        <div class="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
                            <i class="fa-solid fa-bowl-food text-emerald-400 text-sm"></i>
                            <h4 class="text-white font-bold text-sm">Section 1: Ahara — Dietary & Nutritional Guidance</h4>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- Ayurvedic Diet -->
                            <div class="bg-slate-950/50 rounded-2xl p-5 border border-emerald-500/20">
                                <div class="flex items-center justify-between pb-3 mb-4 border-b border-emerald-500/20">
                                    <h5 class="text-emerald-400 font-bold text-sm flex items-center gap-2">
                                        <i class="fa-solid fa-leaf"></i> Ayurvedic Pathya & Apathya
                                    </h5>
                                    <span class="text-[10px] font-bold text-emerald-300 bg-emerald-900/40 px-2.5 py-0.5 rounded-full border border-emerald-500/30">Rasa & Agni</span>
                                </div>
                                <div>
                                    ${modalAyurPathyaHtml}
                                </div>
                            </div>

                            <!-- Modern Nutrition -->
                            <div class="bg-slate-950/50 rounded-2xl p-5 border border-cyan-500/20">
                                <div class="flex items-center justify-between pb-3 mb-4 border-b border-cyan-500/20">
                                    <h5 class="text-cyan-400 font-bold text-sm flex items-center gap-2">
                                        <i class="fa-solid fa-apple-whole"></i> Modern Nutritional Dermatology
                                    </h5>
                                    <span class="text-[10px] font-bold text-cyan-300 bg-cyan-900/40 px-2.5 py-0.5 rounded-full border border-cyan-500/30">Metabolic</span>
                                </div>
                                <div>
                                    ${modalModernNutriHtml}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Vihara Section -->
                    <div class="mb-6">
                        <div class="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
                            <i class="fa-solid fa-person-running text-amber-400 text-sm"></i>
                            <h4 class="text-white font-bold text-sm">Section 2: Vihara — Lifestyle & Circadian Protocols</h4>
                        </div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <!-- Ayurvedic Vihara -->
                            <div class="bg-slate-950/50 rounded-2xl p-5 border border-amber-500/20">
                                <div class="flex items-center justify-between pb-3 mb-4 border-b border-amber-500/20">
                                    <h5 class="text-amber-400 font-bold text-sm flex items-center gap-2">
                                        <i class="fa-solid fa-sun"></i> Ayurvedic Dinacharya & Vihara
                                    </h5>
                                    <span class="text-[10px] font-bold text-amber-300 bg-amber-900/40 px-2.5 py-0.5 rounded-full border border-amber-500/30">Dinacharya</span>
                                </div>
                                <div>
                                    ${modalAyurViharaHtml}
                                </div>
                            </div>

                            <!-- Modern Habits -->
                            <div class="bg-slate-950/50 rounded-2xl p-5 border border-indigo-500/20">
                                <div class="flex items-center justify-between pb-3 mb-4 border-b border-indigo-500/20">
                                    <h5 class="text-indigo-400 font-bold text-sm flex items-center gap-2">
                                        <i class="fa-solid fa-bed"></i> Modern Circadian & Barrier Habits
                                    </h5>
                                    <span class="text-[10px] font-bold text-indigo-300 bg-indigo-900/40 px-2.5 py-0.5 rounded-full border border-indigo-500/30">Circadian</span>
                                </div>
                                <div>
                                    ${modalModernHabitsHtml}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Daily Synchronization Rhythm -->
                    <div class="bg-slate-950/60 rounded-2xl p-5 border border-white/5">
                        <h4 class="text-slate-300 text-xs font-bold uppercase tracking-wider mb-3">Daily Circadian Synchronization Schedule</h4>
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div class="bg-slate-900/80 border border-emerald-500/20 rounded-xl p-3.5">
                                <p class="text-emerald-400 text-xs font-bold mb-1">🌅 06:00 - Morning</p>
                                <p class="text-slate-300 text-xs leading-relaxed">Brahma Muhurta awakening, Ushapana (lukewarm water), gentle cool cleanse.</p>
                            </div>
                            <div class="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-3.5">
                                <p class="text-cyan-400 text-xs font-bold mb-1">☀️ 12:30 - Midday</p>
                                <p class="text-slate-300 text-xs leading-relaxed">Principal Pathya meal with digestive spices, high-fiber greens, SPF 50+ reapplication.</p>
                            </div>
                            <div class="bg-slate-900/80 border border-amber-500/20 rounded-xl p-3.5">
                                <p class="text-amber-400 text-xs font-bold mb-1">🌆 19:30 - Evening</p>
                                <p class="text-slate-300 text-xs leading-relaxed">Light digestive dinner, botanical Mukhalepa application, 10 min Sheetali Pranayama.</p>
                            </div>
                            <div class="bg-slate-900/80 border border-indigo-500/20 rounded-xl p-3.5">
                                <p class="text-indigo-400 text-xs font-bold mb-1">🌙 22:00 - Night</p>
                                <p class="text-slate-300 text-xs leading-relaxed">Screen curfew, barrier moisture sealing, 7.5-8h restorative darkness sleep.</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                ${report.chartImgData ? `
                <div class="mt-8 text-center bg-slate-900 rounded-2xl p-6 border border-white/10">
                    <h3 class="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-4">Deformity Breakdown Chart</h3>
                    <img src="${report.chartImgData}" class="mx-auto max-h-40 rounded-lg">
                </div>
                ` : ''}
            </div>
        `;

        openModal();
    };

    window.deleteReport = async function(id) {
        if(!confirm("Are you sure you want to permanently delete this patient record?")) return;
        try {
            const apiUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') 
                ? 'http://localhost:3000/api/delete-report/' + id : '/api/delete-report/' + id;
            const response = await fetch(apiUrl, { method: 'DELETE' });
            if (!response.ok) throw new Error("Delete failed");
            allReports = allReports.filter(r => r.id !== id);
            renderDashboard();
            closeModal();
        } catch (error) {
            console.error("Delete error:", error);
            alert("Failed to delete the record.");
        }
    };

    function openModal() {
        reportModal.classList.remove('hidden');
        setTimeout(() => {
            modalBackdrop.classList.remove('opacity-0');
            modalContent.classList.remove('scale-95', 'opacity-0');
        }, 10);
    }

    function closeModal() {
        modalBackdrop.classList.add('opacity-0');
        modalContent.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            reportModal.classList.add('hidden');
            modalBody.innerHTML = '';
            currentActiveReportId = null;
        }, 300);
    }

    closeModalBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);

    if (modalDownloadPdfBtn) {
        modalDownloadPdfBtn.addEventListener('click', () => {
            if (currentActiveReportId) downloadPatientPDF(currentActiveReportId);
        });
    }

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCSV);
    }
});
