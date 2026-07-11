# 🌿 AyurSkin PRO

**Clinical Microscopic Skin Audit & Ayurvedic AI Terminal**

AyurSkin PRO is an elite, high-performance web application that leverages Google's Gemini AI to perform microscopic facial skin analysis. It detects dermal infections, deformities, and impurities with high precision and cross-references them against ancient Ayurvedic medical databases to prescribe targeted, natural recovery protocols.

![AyurSkin PRO Demo](https://img.shields.io/badge/Status-Active-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue) ![Version](https://img.shields.io/badge/Version-1.0.0-emerald)

---

## ✨ Enterprise Features

- **Microscopic Neural Scanning**: Upload or capture a live photo of your face, and the AI will analyze skin deformities (Acne Vulgaris, Pigmentation, Scars, etc.).
- **Live Interactive Dashboard**: Displays real-time data including a visual severity spread ring and a dynamic Chart.js deformity breakdown.
- **Ayurvedic Integration**: AI prescribes highly specific Ayurvedic remedies (Lepas, Tailams, Detoxes) based on your unique skin condition.
- **Glassmorphic UI/UX**: Built with a stunning, ultra-premium dark theme utilizing advanced glassmorphism, dynamic glowing gradients, and magnetic button physics.
- **Single-Page Diagnostic PDF Export**: Generates a strictly formatted, dark-themed, A4 single-page medical infographic report that users can download.
- **WhatsApp Integration**: Floating animated CTA for immediate consultation.

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling Engine**: Tailwind CSS (via CDN for rapid prototyping)
- **Icons**: FontAwesome (v6.4.0)
- **Data Visualization**: Chart.js (v4.3.0) for interactive pie charts
- **PDF Generation Engine**: html2pdf.js & html2canvas for flawless vector-based infographic generation
- **AI Core**: Google Gemini 1.5 Flash (via Google Generative AI SDK)

## 🚀 Getting Started

### Prerequisites
To run this application locally, you only need a modern web browser and a Gemini API Key.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/ayurskin-pro.git
   cd ayurskin-pro
   ```

2. **Configure API Key**
   - Open `scan.js`.
   - Locate the API key configuration block at the top of the file:
     ```javascript
     const API_KEY = "YOUR_GEMINI_API_KEY"; // Replace this with your actual key
     ```

3. **Run the Application**
   - You can simply open `index.html` in any modern web browser (Chrome, Safari, Firefox).
   - *For best results (to prevent CORS issues during PDF generation), run a local live server:*
     ```bash
     npx serve .
     ```

## 📁 Repository Structure

```text
├── index.html        # Landing page with animated UI & WhatsApp integration
├── scan.html         # Diagnostic terminal and interactive dashboard
├── style.css         # Global styles, animations, and Tailwind custom utilities
├── script.js         # Landing page interactivity (magnetic buttons, observers)
├── scan.js           # Core logic: Webcam, Image Upload, Gemini AI, Chart.js, PDF Engine
└── README.md         # Documentation
```

## 🧠 How the PDF Engine Works

The PDF export system was rigorously engineered to bypass browser viewport restrictions. It mathematically locks a hidden DOM container to exact A4 pixel dimensions (`794px x 1122px` at 96 DPI). It dynamically compiles the AI results into a dark-themed Bento grid, slices the treatments to fit precisely onto a single page, and uses `html2pdf.js` to render a flawless, un-cropped document.

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
*Developed by Pratik Solanke*
