document.addEventListener('DOMContentLoaded', () => {
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-state');
    const reportsGrid = document.getElementById('reports-grid');
    const totalScans = document.getElementById('total-scans');
    const dbStatus = document.getElementById('db-status');
    
    const reportModal = document.getElementById('report-modal');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalContent = document.getElementById('modal-content');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const modalBody = document.getElementById('modal-body');

    let allReports = [];

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
            const p = report.patientDetails;
            const a = report.analysisData.analysis;

            // Determine spread color
            const spread = a.spreadPercentage;
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
                        <p class="text-xs text-slate-400">${p.age || '--'} Yrs • ${p.gender || '--'}</p>
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
                        <span class="truncate" title="${a.overallDiseaseType}">${a.overallDiseaseType}</span>
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

                <div class="flex gap-3 mt-auto pt-4 border-t border-white/5">
                    <button onclick="viewReport('${report.id}')" class="flex-1 py-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 border border-white/5 hover:border-emerald-500/50 transition-all text-sm font-medium flex items-center justify-center gap-2">
                        <i class="fa-solid fa-eye"></i> View PDF Data
                    </button>
                    <button onclick="deleteReport('${report.id}')" class="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 border border-white/5 hover:border-red-500/50 transition-all flex items-center justify-center" title="Delete Record">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            reportsGrid.appendChild(card);
        });
    }

    window.viewReport = function(id) {
        const report = allReports.find(r => r.id === id);
        if(!report) return;

        const p = report.patientDetails;
        const a = report.analysisData.analysis;
        const spread = a.spreadPercentage;
        const severityColorCode = spread > 50 ? '#ef4444' : (spread > 20 ? '#f59e0b' : '#10b981');
        
        const circleCircumference = 2 * Math.PI * 15.9155; 
        const strokeDashOffset = circleCircumference - (spread / 100) * circleCircumference;

        const causesList = a.causes.map(c => `<li class="mb-1 pl-2 border-l-2 border-red-500 text-slate-300 text-sm">${c}</li>`).join('');
        const symptomsList = a.symptoms.map(s => `<li class="mb-1 pl-2 border-l-2 border-amber-500 text-slate-300 text-sm">${s}</li>`).join('');
        
        let treatmentsHtml = '';
        report.analysisData.treatments.forEach((t) => {
            treatmentsHtml += `
            <div class="bg-[#0f172a] border-l-4 border-emerald-500 rounded-r-xl p-4 mb-3 shadow-lg">
                <h4 class="text-emerald-400 text-sm font-bold mb-1 flex items-center gap-2">
                    <i class="${t.icon || 'fa-solid fa-leaf'}"></i> ${t.title}
                </h4>
                <p class="text-xs text-slate-400 leading-relaxed">${t.instructions}</p>
            </div>`;
        });

        // Reconstruct the PDF look directly in HTML
        modalBody.innerHTML = `
            <div class="bg-[#020617] rounded-2xl p-6 md:p-8 border border-white/5 shadow-inner">
                
                <!-- Header Info -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-emerald-500 pb-6 mb-8 gap-4">
                    <div class="flex gap-6 items-center">
                        <div class="w-20 h-20 rounded-2xl bg-slate-800 border border-emerald-500/30 overflow-hidden shrink-0 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            ${report.userImgData ? `<img src="${report.userImgData}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center text-3xl text-slate-600"><i class="fa-solid fa-user"></i></div>`}
                        </div>
                        <div>
                            <p class="text-emerald-500 text-[10px] font-bold uppercase tracking-widest mb-1">Clinical Microscopic Skin Audit</p>
                            <h2 class="text-3xl font-bold text-white tracking-tight">${p.name || 'Anonymous'}</h2>
                            <p class="text-slate-400 text-sm mt-1">${p.age || '--'} Years Old • ${p.gender || '--'} • ${p.phone || '--'}</p>
                        </div>
                    </div>
                    <div class="text-left md:text-right bg-slate-900 px-4 py-3 rounded-xl border border-white/10 w-full md:w-auto">
                        <p class="text-slate-500 text-[10px] uppercase tracking-widest">Report Generated</p>
                        <p class="text-slate-200 text-sm font-bold">${new Date(report.timestamp).toLocaleString()}</p>
                        <p class="text-slate-500 text-[10px] mt-1">ID: ${report.id.split('-')[0]}</p>
                    </div>
                </div>

                <!-- Diagnosis row -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div class="md:col-span-2 bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden">
                        <div class="absolute -right-4 -bottom-4 text-emerald-500/10 text-8xl"><i class="fa-solid fa-microscope"></i></div>
                        <h3 class="text-emerald-400 text-[10px] uppercase tracking-widest font-bold mb-2">Primary Diagnosis</h3>
                        <h2 class="text-2xl md:text-3xl font-bold text-white relative z-10">${a.overallDiseaseType}</h2>
                    </div>

                    <div class="bg-slate-900 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center relative">
                        <h3 class="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-2 absolute top-4 left-4 w-full text-left">Spread</h3>
                        <div class="w-24 h-24 relative mt-4">
                            <svg viewBox="0 0 36 36" class="w-full h-full transform -rotate-90">
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1e293b" stroke-width="3"/>
                                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${severityColorCode}" stroke-width="3" stroke-dasharray="${circleCircumference}, ${circleCircumference}" stroke-dashoffset="${strokeDashOffset}" class="transition-all duration-1000"/>
                            </svg>
                            <div class="absolute inset-0 flex items-center justify-center font-bold text-lg" style="color: ${severityColorCode}">${spread}%</div>
                        </div>
                    </div>
                </div>

                <!-- Detailed Breakdown -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div class="bg-slate-900 border border-white/10 rounded-2xl p-6">
                        <h3 class="text-white text-sm font-bold mb-4 border-b border-red-500/30 pb-2">Root Causes</h3>
                        <ul class="space-y-1">${causesList}</ul>
                    </div>
                    <div class="bg-slate-900 border border-white/10 rounded-2xl p-6">
                        <h3 class="text-white text-sm font-bold mb-4 border-b border-amber-500/30 pb-2">Clinical Symptoms</h3>
                        <ul class="space-y-1">${symptomsList}</ul>
                    </div>
                </div>

                <!-- Treatments -->
                <div class="bg-slate-900 border border-white/10 rounded-2xl p-6">
                    <div class="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
                        <h3 class="text-white text-base font-bold">Ayurvedic Recovery Protocol</h3>
                        <span class="bg-emerald-900/50 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">AI Prescribed</span>
                    </div>
                    <div class="grid grid-cols-1 gap-0">
                        ${treatmentsHtml}
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
        if(!confirm("Are you sure you want to permanently delete this patient record? This action cannot be undone.")) return;
        
        try {
            const apiUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') 
                ? 'http://localhost:3000/api/delete-report/' + id
                : '/api/delete-report/' + id;

            const response = await fetch(apiUrl, { method: 'DELETE' });
            if (!response.ok) throw new Error("Delete failed");
            
            // Optimistic UI update
            allReports = allReports.filter(r => r.id !== id);
            renderDashboard();
            
        } catch (error) {
            console.error("Delete error:", error);
            alert("Failed to delete the record. Please ensure the server is running.");
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
        }, 300);
    }

    closeModalBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', closeModal);
});
