const fs = require('fs');
const path = require('path');
const http = require('http');

console.log("Setting up 3-Page Full PDF Verification Test Server...");

// We will construct the 3 pages using our newly engineered layout and badge centering
function getFullHtml() {
    const p = {
        name: "Pratik Solanke",
        age: "22",
        gender: "Male",
        phone: "9405560764",
        city: "Pune"
    };
    const report = {
        id: "ASN-14047-TEST",
        timestamp: new Date().toISOString()
    };
    const diseaseType = "Acne Vulgaris [Yauvanapidaka / Mukhadushika]";
    const diagnosisPercentage = "Moderate to Severe (55% impacted)";
    const spread = 55;
    const severityColorCode = "#ef4444";
    const circleCircumference = 100;
    const strokeDashOffset = 45;

    const modernInfo = "A chronic inflammatory dermatosis of the pilosebaceous unit characterized by comedones, papules, pustules, and subsequent scarring, exacerbated by sebum overproduction and bacterial colonization.";
    const ayurvedicInfo = "A condition caused by the vitiation of Pitta and Kapha Doshas along with Rakta Dhatu (blood), leading to painful, eruptive lesions on the face resembling Shalmali thorns.";

    const symptomsList = `
        <li style="margin-bottom: 3px; display: flex; align-items: flex-start; gap: 6px;"><span style="color: #f59e0b;">•</span><span>Pus-filled lesions [Puyanishpatti]</span></li>
        <li style="margin-bottom: 3px; display: flex; align-items: flex-start; gap: 6px;"><span style="color: #f59e0b;">•</span><span>Painful inflammatory bumps [Ruja]</span></li>
        <li style="margin-bottom: 3px; display: flex; align-items: flex-start; gap: 6px;"><span style="color: #f59e0b;">•</span><span>Excess sebum and oiliness [Ati Snigdha]</span></li>
        <li style="margin-bottom: 3px; display: flex; align-items: flex-start; gap: 6px;"><span style="color: #f59e0b;">•</span><span>Post-inflammatory dark spots [Shyama Varna]</span></li>
        <li style="display: flex; align-items: flex-start; gap: 6px;"><span style="color: #f59e0b;">•</span><span>Itching and burning sensation [Kandu & Daha]</span></li>
    `;

    const modernHtml = `
        <div style="background: #020617; border-left: 3px solid #3b82f6; padding: 7px 10px; border-radius: 6px; margin-bottom: 8px;">
            <p style="margin: 0; color: #60a5fa; font-size: 8px; font-weight: bold; line-height: 1.2;">Topical Retinoid Therapy</p>
            <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7.5px; line-height: 1.3;">Apply thin layer of Adapalene (0.1%) gel to the entire face at night to promote cellular turnover and prevent comedone formation.</p>
        </div>
        <div style="background: #020617; border-left: 3px solid #3b82f6; padding: 7px 10px; border-radius: 6px; margin-bottom: 8px;">
            <p style="margin: 0; color: #60a5fa; font-size: 8px; font-weight: bold; line-height: 1.2;">Active Acne Control</p>
            <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7.5px; line-height: 1.3;">Use spot treatment containing Benzoyl Peroxide (2.5%) or Clindamycin gel on active inflammatory papules and pustules in the morning.</p>
        </div>
        <div style="background: #020617; border-left: 3px solid #3b82f6; padding: 7px 10px; border-radius: 6px;">
            <p style="margin: 0; color: #60a5fa; font-size: 8px; font-weight: bold; line-height: 1.2;">Chemical Exfoliation</p>
            <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7.5px; line-height: 1.3;">Incorporate a 2% Salicylic Acid cleanser twice daily to penetrate deep into pores, dissolve excess sebum, and reduce inflammation.</p>
        </div>
    `;

    const ayurvedicHtml = `
        <div style="background: #020617; border-left: 3px solid #10b981; padding: 7px 10px; border-radius: 6px; margin-bottom: 8px;">
            <p style="margin: 0; color: #34d399; font-size: 8px; font-weight: bold; line-height: 1.2;">Lepa (Herbal Paste) Application</p>
            <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7.5px; line-height: 1.3;">Apply a paste of Lodhra, Vacha, and Dhanyaka mixed with water or rose water on the affected areas daily for 15-20 minutes, then rinse with lukewarm water.</p>
        </div>
        <div style="background: #020617; border-left: 3px solid #10b981; padding: 7px 10px; border-radius: 6px; margin-bottom: 8px;">
            <p style="margin: 0; color: #34d399; font-size: 8px; font-weight: bold; line-height: 1.2;">Rakta Prasadana & Agni Deepana</p>
            <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7.5px; line-height: 1.3;">Consume 15ml of Khadirarishta mixed with equal water twice daily after meals to purify the blood and improve digestion.</p>
        </div>
        <div style="background: #020617; border-left: 3px solid #10b981; padding: 7px 10px; border-radius: 6px;">
            <p style="margin: 0; color: #34d399; font-size: 8px; font-weight: bold; line-height: 1.2;">Mridu Virechana (Mild Laxation)</p>
            <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7.5px; line-height: 1.3;">Take 1 teaspoon of Triphala Churna with warm water at bedtime to address Krura Koshtha (constipation) and eliminate systemic Ama.</p>
        </div>
    `;

    const renderPillTags = (val, emptyFallback = 'None reported', bg = '#020617', border = '#334155', text = '#cbd5e1') => {
        if (!val) return `<span style="color: #64748b; font-size: 7.5px; font-style: italic; line-height: 14px; vertical-align: middle;">${emptyFallback}</span>`;
        const arr = Array.isArray(val) ? val.filter(Boolean) : [val];
        if (arr.length === 0) return `<span style="color: #64748b; font-size: 7.5px; font-style: italic; line-height: 14px; vertical-align: middle;">${emptyFallback}</span>`;
        return arr.map(item => `
            <span style="display: inline-block; background: ${bg}; border: 1px solid ${border}; color: ${text}; height: 15px; line-height: 13px; padding: 0 6px; border-radius: 4px; font-size: 7px; font-weight: 600; margin: 1px 3px 2px 0; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">${item}</span>
        `).join('');
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>3-Page Full PDF Verification</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 20px; background: #0b0f19; font-family: 'Inter', -apple-system, sans-serif; color: #fff; }
        .pdf-page { width: 794px; height: 1122px; max-height: 1122px; min-height: 1122px; box-sizing: border-box; overflow: hidden; padding: 32px 35px; position: relative; background-color: #020617; margin-bottom: 30px; border: 1px solid #334155; }
    </style>
</head>
<body>
    <h1>Full 3-Page Diagnostic Dossier Render Test</h1>
    <div id="status" style="color: #34d399; font-weight: bold; margin-bottom: 20px;">Ready</div>
    
    <div id="pdf-root">
        <!-- ==================== PAGE 1: DIAGNOSTIC AUDIT & PROTOCOLS ==================== -->
        <div class="pdf-page" id="page-1">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #10b981; padding-bottom: 10px; margin-bottom: 14px;">
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div style="width: 52px; height: 52px; border-radius: 12px; overflow: hidden; border: 2px solid #10b981; background-color: #0f172a; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <span style="font-size: 24px; color: #34d399;">👤</span>
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
                            <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 10px; font-weight: bold; line-height: 1.2;">${p.name}</p>
                        </div>
                        <div style="width: 1px; background: #1e293b;"></div>
                        <div style="text-align: left;">
                            <p style="margin: 0; color: #94a3b8; font-size: 7px; text-transform: uppercase; line-height: 1.2;">Age / Gender</p>
                            <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 10px; font-weight: bold; line-height: 1.2;">${p.age} / ${p.gender}</p>
                        </div>
                        <div style="width: 1px; background: #1e293b;"></div>
                        <div style="text-align: left;">
                            <p style="margin: 0; color: #94a3b8; font-size: 7px; text-transform: uppercase; line-height: 1.2;">Contact / City</p>
                            <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 10px; font-weight: bold; line-height: 1.2;">${p.phone} • ${p.city}</p>
                        </div>
                    </div>
                    <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid #1e293b; display: flex; justify-content: space-between; align-items: center;">
                        <p style="margin: 0; color: #64748b; font-size: 7px; line-height: 1.2;">Scan ID: ${report.id}</p>
                        <p style="margin: 0; color: #64748b; font-size: 7px; line-height: 1.2;">Date: 08/08/2026</p>
                    </div>
                </div>
            </div>
            
            <!-- Diagnosis & Analytics Banner -->
            <div style="display: flex; gap: 10px; margin-bottom: 12px; height: 105px;">
                <div style="flex: 2; background: linear-gradient(135deg, #064e3b 0%, #022c22 100%); border: 1px solid #059669; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; justify-content: center;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <h2 style="margin: 0; color: #6ee7b7; font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; line-height: 1.2;">Primary Diagnosis</h2>
                        <span style="display: inline-block; background: #020617; border: 1px solid #10b981; color: #34d399; height: 18px; line-height: 16px; padding: 0 10px; border-radius: 20px; font-size: 8.5px; font-weight: bold; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">${diagnosisPercentage}</span>
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
                    <h2 style="margin: 0 0 2px 0; color: #94a3b8; font-size: 7.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">Deformities Distribution</h2>
                    <div style="font-size: 7px; color: #34d399; font-weight: bold;">Multi-Modal Verified</div>
                </div>
            </div>
            
            <!-- Modern & Ayurvedic Dual Perspectives -->
            <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                        <h2 style="margin: 0; color: #60a5fa; font-size: 9px; font-weight: bold; text-transform: uppercase; line-height: 1.2;">Modern Dermatology Perspective</h2>
                    </div>
                    <div style="height: 1.5px; background: #3b82f6; width: 100%; margin-bottom: 7px;"></div>
                    <p style="color: #cbd5e1; font-size: 8.5px; margin: 0; line-height: 1.35;">${modernInfo}</p>
                </div>
                <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                        <h2 style="margin: 0; color: #34d399; font-size: 9px; font-weight: bold; text-transform: uppercase; line-height: 1.2;">Ayurvedic Nidana (Dosha & Dhatu)</h2>
                    </div>
                    <div style="height: 1.5px; background: #10b981; width: 100%; margin-bottom: 7px;"></div>
                    <p style="color: #cbd5e1; font-size: 8.5px; margin: 0; line-height: 1.35;">${ayurvedicInfo}</p>
                </div>
            </div>

            <!-- Causes & Symptoms Row -->
            <div style="display: flex; gap: 10px; margin-bottom: 12px;">
                <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                        <h2 style="margin: 0; color: #f8fafc; font-size: 9px; font-weight: bold; line-height: 1.2;">Etiology & Root Causes</h2>
                    </div>
                    <div style="height: 1.5px; background: #ef4444; width: 100%; margin-bottom: 7px;"></div>
                    <h3 style="margin: 0 0 2px 0; color: #60a5fa; font-size: 7.5px; font-weight: bold; line-height: 1.2;">Modern Aspect:</h3>
                    <p style="color: #cbd5e1; font-size: 7.5px; margin: 0 0 4px 0; line-height: 1.25;">Sebaceous hyperactivity & barrier shifts.</p>
                    <h3 style="margin: 0 0 2px 0; color: #34d399; font-size: 7.5px; font-weight: bold; line-height: 1.2;">Ayurvedic Aspect:</h3>
                    <p style="color: #cbd5e1; font-size: 7.5px; margin: 0; line-height: 1.25;">Dosha aggravation & Ama Srotorodha.</p>
                </div>
                <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                        <h2 style="margin: 0; color: #f8fafc; font-size: 9px; font-weight: bold; line-height: 1.2;">Clinical Symptoms</h2>
                    </div>
                    <div style="height: 1.5px; background: #f59e0b; width: 100%; margin-bottom: 7px;"></div>
                    <ul style="color: #cbd5e1; font-size: 8px; list-style-type: none; padding: 0; margin: 0; line-height: 1.35;">${symptomsList}</ul>
                </div>
            </div>
            
            <!-- Dual Recovery Protocols -->
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="display: inline-flex; align-items: center; gap: 6px;">
                        <h2 style="color: #f8fafc; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; line-height: 12px;">Dual Recovery Regimen</h2>
                        <span style="display: inline-block; background: #064e3b; color: #34d399; border: 0.5px solid #10b981; height: 16px; line-height: 14px; padding: 0 8px; border-radius: 6px; font-size: 7px; font-weight: bold; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Dual Matrix</span>
                    </div>
                    <div style="display: inline-block; background: #064e3b; border: 1px solid #10b981; height: 18px; line-height: 16px; padding: 0 10px; border-radius: 8px; vertical-align: middle; box-sizing: border-box; box-shadow: 0 0 10px rgba(16,185,129,0.2);">
                        <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #34d399; vertical-align: middle; margin-right: 5px; margin-bottom: 2px;"></span>
                        <span style="color: #a7f3d0; font-size: 7.5px; font-weight: bold; letter-spacing: 0.2px; vertical-align: middle; display: inline-block;">Algorithmic Treatment Suggestions for Clinical Review.</span>
                    </div>
                </div>
                <div style="height: 1.5px; background: #1e293b; width: 100%; margin-bottom: 8px;"></div>
                
                <div style="display: flex; gap: 10px;">
                    <div style="flex: 1; background: #020617; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <h3 style="color: #60a5fa; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 12px;">Modern Science Protocols</h3>
                            <span style="display: inline-block; background: #1e3a8a; color: #93c5fd; height: 15px; line-height: 13px; padding: 0 7px; border-radius: 5px; font-size: 6.5px; font-weight: bold; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Dermatology</span>
                        </div>
                        <div style="height: 1.5px; background: #3b82f6; width: 100%; margin-bottom: 8px;"></div>
                        <div>${modernHtml}</div>
                    </div>
                    <div style="flex: 1; background: #020617; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <h3 style="color: #34d399; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 12px;">Ayurvedic Herbal Protocols</h3>
                            <span style="display: inline-block; background: #064e3b; color: #6ee7b7; height: 15px; line-height: 13px; padding: 0 7px; border-radius: 5px; font-size: 6.5px; font-weight: bold; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Natural Lepa</span>
                        </div>
                        <div style="height: 1.5px; background: #10b981; width: 100%; margin-bottom: 8px;"></div>
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
        <div class="pdf-page" id="page-2">
            <!-- Page 2 Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #10b981; padding-bottom: 10px; margin-bottom: 14px;">
                <div style="display: flex; gap: 12px; align-items: center;">
                    <div style="width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, #059669 0%, #0d9488 100%); display: flex; align-items: center; justify-content: center; font-size: 20px; color: #ffffff; flex-shrink: 0;">
                        🌿
                    </div>
                    <div>
                        <h1 style="margin: 0; color: #34d399; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1;">AyurSkin PRO</h1>
                        <p style="margin: 3px 0 0 0; color: #10b981; font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; line-height: 1.2;">Holistic Ahara & Vihara Blueprint • Page 2 of 3</p>
                    </div>
                </div>
                <div style="text-align: right; background: #0f172a; padding: 6px 12px; border-radius: 10px; border: 1px solid #1e293b; display: flex; gap: 10px; align-items: center;">
                    <div style="text-align: left;">
                        <p style="margin: 0; color: #94a3b8; font-size: 7px; text-transform: uppercase; line-height: 1.2;">Patient</p>
                        <p style="margin: 2px 0 0 0; color: #f8fafc; font-size: 9.5px; font-weight: bold; line-height: 1.2;">${p.name}</p>
                    </div>
                    <div style="width: 1px; height: 18px; background: #1e293b;"></div>
                    <div style="text-align: left;">
                        <p style="margin: 0; color: #94a3b8; font-size: 7px; text-transform: uppercase; line-height: 1.2;">Diagnosis</p>
                        <p style="margin: 2px 0 0 0; color: #34d399; font-size: 9.5px; font-weight: bold; line-height: 1.2;">Acne Vulgaris</p>
                    </div>
                    <div style="width: 1px; height: 18px; background: #1e293b;"></div>
                    <div style="text-align: left;">
                        <p style="margin: 0; color: #94a3b8; font-size: 7px; text-transform: uppercase; line-height: 1.2;">Dosha Target</p>
                        <p style="margin: 2px 0 0 0; color: #60a5fa; font-size: 9.5px; font-weight: bold; line-height: 1.2;">Pitta-Kapha Shaman</p>
                    </div>
                </div>
            </div>

            <!-- Section 1: Dietary Regimen (Ahara) -->
            <div style="margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="display: inline-flex; align-items: center; gap: 6px;">
                        <h2 style="color: #f8fafc; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; line-height: 12px;">Section 1: Ahara — Clinical Dietary & Nutritional Protocols</h2>
                    </div>
                    <span style="display: inline-block; background: #064e3b; color: #34d399; height: 16px; line-height: 14px; padding: 0 8px; border-radius: 6px; font-size: 6.5px; font-weight: bold; border: 0.5px solid #10b981; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Ayurvedic Pathya + Modern Nutrition</span>
                </div>
                <div style="height: 1.5px; background: #1e293b; width: 100%; margin-bottom: 8px;"></div>

                <div style="display: flex; gap: 10px;">
                    <!-- Ayurvedic Pathya & Apathya -->
                    <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <h3 style="color: #34d399; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 12px;">Ayurvedic Pathya & Apathya</h3>
                            <span style="display: inline-block; background: #064e3b; color: #6ee7b7; height: 15px; line-height: 13px; padding: 0 7px; border-radius: 5px; font-size: 6.5px; font-weight: bold; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Rasa & Agni</span>
                        </div>
                        <div style="height: 1.5px; background: #10b981; width: 100%; margin-bottom: 8px;"></div>
                        <div style="background: #020617; border-left: 3px solid #10b981; padding: 7px 10px; border-radius: 6px; margin-bottom: 8px;">
                            <p style="margin: 0; color: #34d399; font-size: 8px; font-weight: bold; line-height: 1.2;">Favorable Foods (Pathya)</p>
                            <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7.5px; line-height: 1.3;">Moong dal, barley, cucumber, bitter gourd (Karela), amla, coriander, mint, pomegranate, and cooling herbal teas.</p>
                        </div>
                        <div style="background: #020617; border-left: 3px solid #ef4444; padding: 7px 10px; border-radius: 6px;">
                            <p style="margin: 0; color: #f87171; font-size: 8px; font-weight: bold; line-height: 1.2;">Foods to Avoid (Apathya)</p>
                            <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7.5px; line-height: 1.3;">Excessive red chili, deep-fried snacks, fermented batters, curd/yogurt at night, and incompatible food combinations (Viruddha Ahara).</p>
                        </div>
                    </div>

                    <!-- Modern Clinical Nutrition -->
                    <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <h3 style="color: #22d3ee; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 12px;">Modern Clinical Nutrition</h3>
                            <span style="display: inline-block; background: #164e63; color: #a5f3fc; height: 15px; line-height: 13px; padding: 0 7px; border-radius: 5px; font-size: 6.5px; font-weight: bold; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Nutraceutical</span>
                        </div>
                        <div style="height: 1.5px; background: #06b6d4; width: 100%; margin-bottom: 8px;"></div>
                        <div style="background: #020617; border-left: 3px solid #06b6d4; padding: 7px 10px; border-radius: 6px; margin-bottom: 8px;">
                            <p style="margin: 0; color: #22d3ee; font-size: 8px; font-weight: bold; line-height: 1.2;">Low-Glycemic Anti-Inflammatory Diet</p>
                            <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7.5px; line-height: 1.3;">Eliminate high-glycemic carbohydrates and dairy whey protein to minimize IGF-1 signaling and reduce sebocyte proliferation.</p>
                        </div>
                        <div style="background: #020617; border-left: 3px solid #06b6d4; padding: 7px 10px; border-radius: 6px;">
                            <p style="margin: 0; color: #22d3ee; font-size: 8px; font-weight: bold; line-height: 1.2;">Targeted Micronutrient Support</p>
                            <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7.5px; line-height: 1.3;">Supplement with Zinc Picolinate (30mg/day) and Omega-3 fatty acids (EPA/DHA 1000mg) to reduce inflammatory leukotriene B4 synthesis.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Section 2: Vihara — Lifestyle & Circadian Protocols -->
            <div style="margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="display: inline-flex; align-items: center; gap: 6px;">
                        <h2 style="color: #f8fafc; font-size: 9.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; line-height: 12px;">Section 2: Vihara — Lifestyle & Circadian Protocols</h2>
                    </div>
                    <span style="display: inline-block; background: #78350f; color: #fde68a; height: 16px; line-height: 14px; padding: 0 8px; border-radius: 6px; font-size: 6.5px; font-weight: bold; border: 0.5px solid #d97706; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Dinacharya + Skin Barrier Hygiene</span>
                </div>
                <div style="height: 1.5px; background: #1e293b; width: 100%; margin-bottom: 8px;"></div>
                
                <div style="display: flex; gap: 10px;">
                    <!-- Ayurvedic Vihara Column -->
                    <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <h3 style="color: #fbbf24; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 12px;">Ayurvedic Dinacharya & Vihara</h3>
                            <span style="display: inline-block; background: #78350f; color: #fde68a; height: 15px; line-height: 13px; padding: 0 7px; border-radius: 5px; font-size: 6.5px; font-weight: bold; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Dinacharya</span>
                        </div>
                        <div style="height: 1.5px; background: #f59e0b; width: 100%; margin-bottom: 8px;"></div>
                        <div style="background: #020617; border-left: 3px solid #f59e0b; padding: 7px 10px; border-radius: 6px; margin-bottom: 8px;">
                            <p style="margin: 0; color: #fbbf24; font-size: 8px; font-weight: bold; line-height: 1.2;">Nidra & Vega Dharana</p>
                            <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7.5px; line-height: 1.3;">Avoid Divasvapna (day sleeping) and suppressive natural urges (Vega Dharana) to preserve digestive fire and hormonal balance.</p>
                        </div>
                        <div style="background: #020617; border-left: 3px solid #f59e0b; padding: 7px 10px; border-radius: 6px;">
                            <p style="margin: 0; color: #fbbf24; font-size: 8px; font-weight: bold; line-height: 1.2;">Mukha Prakshalana (Face Wash)</p>
                            <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7.5px; line-height: 1.3;">Wash face twice daily with cool Triphala or Neem decoction (Kashaya) to soothe inflammation and contract dilated pores.</p>
                        </div>
                    </div>

                    <!-- Modern Circadian Habits Column -->
                    <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                            <h3 style="color: #818cf8; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 12px;">Modern Circadian & Barrier Habits</h3>
                            <span style="display: inline-block; background: #312e81; color: #c7d2fe; height: 15px; line-height: 13px; padding: 0 7px; border-radius: 5px; font-size: 6.5px; font-weight: bold; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Circadian</span>
                        </div>
                        <div style="height: 1.5px; background: #6366f1; width: 100%; margin-bottom: 8px;"></div>
                        <div style="background: #020617; border-left: 3px solid #6366f1; padding: 7px 10px; border-radius: 6px; margin-bottom: 8px;">
                            <p style="margin: 0; color: #818cf8; font-size: 8px; font-weight: bold; line-height: 1.2;">Barrier Protection & Hygiene</p>
                            <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7.5px; line-height: 1.3;">Change pillowcases twice weekly, disinfect smartphone screens daily, and avoid physical picking or friction on active lesions.</p>
                        </div>
                        <div style="background: #020617; border-left: 3px solid #6366f1; padding: 7px 10px; border-radius: 6px;">
                            <p style="margin: 0; color: #818cf8; font-size: 8px; font-weight: bold; line-height: 1.2;">Circadian Sleep Optimization</p>
                            <p style="margin: 3px 0 0 0; color: #cbd5e1; font-size: 7.5px; line-height: 1.3;">Maintain consistent sleep-wake timing with minimum 7.5 hours nightly sleep to optimize nocturnal epidermal DNA repair cycles.</p>
                        </div>
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
        <div class="pdf-page" id="page-3">
            <!-- Page 3 Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; margin-bottom: 12px;">
                <div>
                    <h1 style="margin: 0; color: #60a5fa; font-size: 18px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.1;">Comprehensive Clinical Intake Dossier</h1>
                    <p style="margin: 2px 0 0 0; color: #94a3b8; font-size: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; line-height: 1.2;">20-Point Multi-Modal Patient Record • Page 3 of 3</p>
                </div>
                <div style="text-align: right; background: #0f172a; padding: 5px 12px; border-radius: 8px; border: 1px solid #1e293b; display: inline-flex; align-items: center;">
                    <span style="color: #f8fafc; font-size: 9px; font-weight: bold; line-height: 1.2;">${p.name}</span>
                    <span style="color: #64748b; font-size: 8px; margin: 0 5px; line-height: 1.2;">•</span>
                    <span style="color: #38bdf8; font-size: 8px; font-family: monospace; line-height: 1.2;">ID: ${report.id}</span>
                </div>
            </div>

            <!-- Bento Grid for 20 Questions (2 Columns x 3 Rows) -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                
                <!-- CARD 1: General Examination & Vitals (Q19) -->
                <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <h3 style="margin: 0; color: #60a5fa; font-size: 8.5px; font-weight: bold; line-height: 12px;">#19. General Examination & Vitals</h3>
                        <span style="display: inline-block; background: #1e3a8a; color: #93c5fd; height: 15px; line-height: 13px; padding: 0 7px; border-radius: 4px; font-size: 6.5px; font-weight: bold; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Physical</span>
                    </div>
                    <div style="height: 1.5px; background: #3b82f6; width: 100%; margin-bottom: 7px;"></div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 4px;">
                        <div style="background: #020617; padding: 5px 8px; border-radius: 6px; border: 1px solid #1e293b;">
                            <p style="margin: 0 0 2px 0; color: #94a3b8; font-size: 6.5px; text-transform: uppercase; line-height: 1.2;">Body Weight</p>
                            <p style="margin: 0; color: #f8fafc; font-size: 9.5px; font-weight: bold; line-height: 1.2;">48 kg</p>
                        </div>
                        <div style="background: #020617; padding: 5px 8px; border-radius: 6px; border: 1px solid #1e293b;">
                            <p style="margin: 0 0 2px 0; color: #94a3b8; font-size: 6.5px; text-transform: uppercase; line-height: 1.2;">Pulse Rate</p>
                            <p style="margin: 0; color: #f8fafc; font-size: 9.5px; font-weight: bold; line-height: 1.2;">88 bpm</p>
                        </div>
                    </div>
                    <div style="background: #020617; padding: 5px 8px; border-radius: 6px; border: 1px solid #1e293b;">
                        <p style="margin: 0 0 2px 0; color: #94a3b8; font-size: 6.5px; text-transform: uppercase; line-height: 1.2;">Blood Pressure (Systolic / Diastolic)</p>
                        <p style="margin: 0; color: #34d399; font-size: 9.5px; font-weight: bold; line-height: 1.2;">120/80 mmHg</p>
                    </div>
                </div>

                <!-- CARD 2: Presenting Complaints & Chronology (Q1 - Q4) -->
                <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <h3 style="margin: 0; color: #34d399; font-size: 8.5px; font-weight: bold; line-height: 12px;">Topography & Chronology (Q1 - Q4)</h3>
                        <span style="display: inline-block; background: #064e3b; color: #6ee7b7; height: 15px; line-height: 13px; padding: 0 7px; border-radius: 4px; font-size: 6.5px; font-weight: bold; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Chief Complaint</span>
                    </div>
                    <div style="height: 1.5px; background: #10b981; width: 100%; margin-bottom: 7px;"></div>
                    <div style="margin-bottom: 4px;">
                        <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#1. Affected Body Part(s):</p>
                        <div style="line-height: 1.2;">${renderPillTags(['Face (Cheeks)', 'Chest', 'Back', 'Arms'], 'Unspecified', '#020617', '#059669', '#6ee7b7')}</div>
                    </div>
                    <div style="margin-bottom: 4px;">
                        <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#2. Main Skin Concern(s):</p>
                        <div style="line-height: 1.2;">${renderPillTags(['Acne / Pimples', 'Blackheads', 'Dark spots', 'Redness', 'Itching', 'Oily skin'], 'Unspecified', '#020617', '#2563eb', '#93c5fd')}</div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <div style="flex: 1;">
                            <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#3. Duration:</p>
                            <p style="margin: 1px 0 0 0; color: #f8fafc; font-size: 7.5px; line-height: 1.2;">More than 1 year</p>
                        </div>
                        <div style="flex: 1;">
                            <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#4. Progression:</p>
                            <p style="margin: 1px 0 0 0; color: #f8fafc; font-size: 7.5px; line-height: 1.2;">Comes and goes</p>
                        </div>
                    </div>
                </div>

                <!-- CARD 3: Symptomatology & Triggers (Q5 - Q8) -->
                <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <h3 style="margin: 0; color: #fbbf24; font-size: 8.5px; font-weight: bold; line-height: 12px;">Clinical Symptoms & Triggers (Q5 - Q8)</h3>
                        <span style="display: inline-block; background: #78350f; color: #fde68a; height: 15px; line-height: 13px; padding: 0 7px; border-radius: 4px; font-size: 6.5px; font-weight: bold; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Symptom Matrix</span>
                    </div>
                    <div style="height: 1.5px; background: #f59e0b; width: 100%; margin-bottom: 7px;"></div>
                    <div style="margin-bottom: 4px;">
                        <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#5. Symptoms Reported:</p>
                        <div style="line-height: 1.2;">${renderPillTags(['Itching', 'Pain', 'Burning', 'Bleeding', 'Oozing', 'Pus', 'Swelling'], 'None reported', '#020617', '#d97706', '#fde68a')}</div>
                    </div>
                    <div style="margin-bottom: 4px;">
                        <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#6. Triggers & Aggravators:</p>
                        <div style="line-height: 1.2;">${renderPillTags(['Sunlight', 'Heat', 'Sweating', 'Stress', 'Certain foods'], 'None identified', '#020617', '#dc2626', '#fca5a5')}</div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <div style="flex: 1;">
                            <p style="margin: 0 0 2px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#7. Past Treatments:</p>
                            <div style="line-height: 1.2;">${renderPillTags(['Ayurvedic treatment', 'Cosmetic procedures'], 'None')}</div>
                        </div>
                        <div style="flex: 1;">
                            <p style="margin: 0 0 2px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#8. Allergies:</p>
                            <div style="line-height: 1.2;">${renderPillTags(['None reported'], 'None reported', '#020617', '#9333ea', '#d8b4fe')}</div>
                        </div>
                    </div>
                </div>

                <!-- CARD 4: Medical History & Heredity (Q9 - Q11, Q20) -->
                <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <h3 style="margin: 0; color: #f472b6; font-size: 8.5px; font-weight: bold; line-height: 12px;">Medical Profile & History (Q9 - Q11, Q20)</h3>
                        <span style="display: inline-block; background: #831843; color: #fbcfe8; height: 15px; line-height: 13px; padding: 0 7px; border-radius: 4px; font-size: 6.5px; font-weight: bold; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Systemic</span>
                    </div>
                    <div style="height: 1.5px; background: #ec4899; width: 100%; margin-bottom: 7px;"></div>
                    <div style="margin-bottom: 4px;">
                        <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#10. Existing Conditions:</p>
                        <div style="line-height: 1.2;">${renderPillTags(['Hypertension'], 'None reported')}</div>
                    </div>
                    <div style="margin-bottom: 4px;">
                        <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#11. Current Medications:</p>
                        <div style="line-height: 1.2;">${renderPillTags(['None reported'], 'None reported')}</div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <div style="flex: 1;">
                            <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#9. Family History:</p>
                            <p style="margin: 1px 0 0 0; color: #f8fafc; font-size: 7.5px; line-height: 1.2;">No family history</p>
                        </div>
                        <div style="flex: 1;">
                            <p style="margin: 0 0 2px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#20. Special Exposures:</p>
                            <div style="line-height: 1.2;">${renderPillTags(['Other (stress)'], 'None')}</div>
                        </div>
                    </div>
                </div>

                <!-- CARD 5: Ayurvedic Ahara & Agni / Metabolism (Q12 - Q15) -->
                <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <h3 style="margin: 0; color: #34d399; font-size: 8.5px; font-weight: bold; line-height: 12px;">Ayurvedic Ahara & Agni (Q12 - Q15)</h3>
                        <span style="display: inline-block; background: #064e3b; color: #6ee7b7; height: 15px; line-height: 13px; padding: 0 7px; border-radius: 4px; font-size: 6.5px; font-weight: bold; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Metabolism</span>
                    </div>
                    <div style="height: 1.5px; background: #10b981; width: 100%; margin-bottom: 7px;"></div>
                    <div style="display: flex; gap: 6px; margin-bottom: 4px;">
                        <div style="flex: 1;">
                            <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#12. Skin Prakriti:</p>
                            <p style="margin: 1px 0 0 0; color: #38bdf8; font-size: 7.5px; font-weight: bold; line-height: 1.2;">Oily</p>
                        </div>
                        <div style="flex: 1;">
                            <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#13A. Diet Type:</p>
                            <p style="margin: 1px 0 0 0; color: #34d399; font-size: 7.5px; font-weight: bold; line-height: 1.2;">Non-vegetarian</p>
                        </div>
                    </div>
                    <div style="margin-bottom: 4px;">
                        <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#13B. Frequently Consumed Foods:</p>
                        <div style="line-height: 1.2;">${renderPillTags(['Spicy food', 'Fried food', 'Oily food', 'Dairy products', 'Fermented foods'], 'Standard diet', '#020617', '#059669', '#a7f3d0')}</div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <div style="flex: 1;">
                            <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#14. Agni Status:</p>
                            <p style="margin: 1px 0 0 0; color: #f8fafc; font-size: 7.5px; line-height: 1.2;">Constipation</p>
                        </div>
                        <div style="flex: 1;">
                            <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#15. Bowel Habit:</p>
                            <p style="margin: 1px 0 0 0; color: #f8fafc; font-size: 7.5px; line-height: 1.2;">Krura Koshtha</p>
                        </div>
                    </div>
                </div>

                <!-- CARD 6: Lifestyle, Habits & Circadian Nidra (Q16 - Q18) -->
                <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 9px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <h3 style="margin: 0; color: #a78bfa; font-size: 8.5px; font-weight: bold; line-height: 12px;">Lifestyle & Circadian Vihara (Q16 - Q18)</h3>
                        <span style="display: inline-block; background: #4c1d95; color: #c4b5fd; height: 15px; line-height: 13px; padding: 0 7px; border-radius: 4px; font-size: 6.5px; font-weight: bold; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">Circadian</span>
                    </div>
                    <div style="height: 1.5px; background: #8b5cf6; width: 100%; margin-bottom: 7px;"></div>
                    <div style="margin-bottom: 4px;">
                        <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#16. Lifestyle & Routine:</p>
                        <div style="line-height: 1.2;">${renderPillTags(['Regular exercise', 'High stress'], 'Moderate', '#020617', '#7c3aed', '#ddd6fe')}</div>
                    </div>
                    <div style="margin-bottom: 4px;">
                        <p style="margin: 0 0 3px 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#17. Personal Habits & Addictions:</p>
                        <div style="line-height: 1.2;">${renderPillTags(['None'], 'None reported', '#020617', '#6366f1', '#c7d2fe')}</div>
                    </div>
                    <div style="display: flex; gap: 6px;">
                        <div style="flex: 1;">
                            <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#18A. Sleep Duration:</p>
                            <p style="margin: 1px 0 0 0; color: #38bdf8; font-size: 7.5px; font-weight: bold; line-height: 1.2;">6-8 hours</p>
                        </div>
                        <div style="flex: 1;">
                            <p style="margin: 0; color: #94a3b8; font-size: 6.5px; font-weight: bold; line-height: 1.2;">#18B. Sleep Quality:</p>
                            <p style="margin: 1px 0 0 0; color: #a78bfa; font-size: 7.5px; font-weight: bold; line-height: 1.2;">Average</p>
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
                    <span style="display: inline-block; background: #020617; border: 1px solid #10b981; color: #34d399; height: 16px; line-height: 14px; padding: 0 8px; border-radius: 5px; font-size: 7px; font-weight: bold; font-family: monospace; vertical-align: middle; box-sizing: border-box; white-space: nowrap;">CLINICALLY INDEXED</span>
                </div>
            </div>

            <!-- Page 3 Footer -->
            <div style="position: absolute; bottom: 20px; left: 35px; right: 35px; text-align: center; color: #475569; font-size: 7px; border-top: 1px solid #1e293b; padding-top: 6px; display: flex; justify-content: space-between; align-items: center;">
                <span>AyurSkin PRO Diagnostic Terminal • Practitioner Confidential Record</span>
                <span style="color: #38bdf8; font-weight: bold;">Page 3 of 3 • End of Clinical Dossier</span>
            </div>
        </div>
    </div>

    <script>
        window.addEventListener('load', async () => {
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }
            await new Promise(r => setTimeout(r, 200));

            const pages = [document.getElementById('page-1'), document.getElementById('page-2'), document.getElementById('page-3')];
            const capturedImages = [];

            for (let i = 0; i < pages.length; i++) {
                const canvas = await html2canvas(pages[i], {
                    scale: 2,
                    useCORS: true,
                    scrollY: 0,
                    scrollX: 0,
                    backgroundColor: '#020617',
                    width: 794,
                    height: 1122,
                    windowWidth: 794,
                    windowHeight: 1122
                });
                capturedImages.push(canvas.toDataURL('image/png'));
            }

            fetch('/save-full-test', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ page1: capturedImages[0], page2: capturedImages[1], page3: capturedImages[2] })
            }).then(() => {
                document.getElementById('status').innerText = 'ALL 3 PAGES SAVED SUCCESSFULLY!';
            });
        });
    </script>
</body>
</html>
    `;
}

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getFullHtml());
    } else if (req.method === 'POST' && req.url === '/save-full-test') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const data = JSON.parse(body);
            const p1 = data.page1.replace(/^data:image\/png;base64,/, "");
            const p2 = data.page2.replace(/^data:image\/png;base64,/, "");
            const p3 = data.page3.replace(/^data:image\/png;base64,/, "");
            fs.writeFileSync(path.join(__dirname, 'test_full_page1.png'), p1, 'base64');
            fs.writeFileSync(path.join(__dirname, 'test_full_page2.png'), p2, 'base64');
            fs.writeFileSync(path.join(__dirname, 'test_full_page3.png'), p3, 'base64');
            console.log("SUCCESS: All 3 pages saved to disk!");
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(3458, () => {
    console.log("Full PDF test server listening on port 3458");
});
