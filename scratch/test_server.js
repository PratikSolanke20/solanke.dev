const fs = require('fs');
const path = require('path');
const http = require('http');

console.log("Setting up HTML verification test server...");

// Create a standalone HTML test file to render the exact 3 pages with html2canvas and capture screenshot
const testHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>PDF Test Render</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 20px; background: #111; font-family: 'Inter', -apple-system, sans-serif; }
        #canvas-preview { margin-top: 20px; border: 2px solid #10b981; }
    </style>
</head>
<body>
    <h1 style="color: white;">PDF Render Test</h1>
    <div id="status" style="color: #10b981; font-weight: bold;">Rendering...</div>
    <div id="test-container"></div>
    <div id="preview-output"></div>

    <script>
        window.addEventListener('load', async () => {
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }
            document.getElementById('status').innerText = 'Fonts loaded, generating test elements...';
            
            // Build test elements with both old and new styles to compare
            const testEl = document.createElement('div');
            testEl.style.width = '794px';
            testEl.style.padding = '30px';
            testEl.style.backgroundColor = '#020617';
            testEl.style.color = '#ffffff';
            testEl.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

            testEl.innerHTML = \`
                <!-- Test 1: Primary Diagnosis Badge -->
                <div style="background: #064e3b; padding: 15px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #059669;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="color: #6ee7b7; font-size: 9px; font-weight: 800; text-transform: uppercase;">Primary Diagnosis</span>
                        <span style="display: inline-block; background: #020617; border: 1px solid #10b981; color: #34d399; padding: 3px 10px 4px 10px; border-radius: 20px; font-size: 8.5px; font-weight: bold; line-height: 12px; vertical-align: middle; box-sizing: border-box;">
                            Severe Inflammatory Acne (35% Normal / 65% impacted)
                        </span>
                    </div>
                    <h3 style="margin: 0; color: #ffffff; font-size: 16px; font-weight: bold;">Yuvana Pidaka (Inflammatory Acne Vulgaris)</h3>
                </div>

                <!-- Test 2: Dual Recovery Regimen Row -->
                <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1.5px solid #1e293b; padding-bottom: 6px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <h2 style="color: #f8fafc; font-size: 10px; font-weight: 800; text-transform: uppercase; margin: 0; line-height: 14px;">Dual Recovery Regimen</h2>
                            <span style="display: inline-block; background: #064e3b; color: #34d399; border: 0.5px solid #10b981; padding: 2px 7px 3px 7px; border-radius: 6px; font-size: 7px; font-weight: bold; line-height: 10px; vertical-align: middle; box-sizing: border-box;">Dual Matrix</span>
                        </div>
                        <div style="display: inline-block; background: #064e3b; border: 1px solid #10b981; padding: 3px 8px 4px 8px; border-radius: 8px; vertical-align: middle; box-sizing: border-box;">
                            <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: #34d399; vertical-align: middle; margin-right: 4px;"></span>
                            <span style="color: #a7f3d0; font-size: 7.5px; font-weight: bold; line-height: 11px; vertical-align: middle; display: inline-block;">Algorithmic Treatment Suggestions for Clinical Review.</span>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px;">
                        <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #3b82f6; padding-bottom: 6px;">
                                <h3 style="color: #60a5fa; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 12px;">Modern Science Protocols</h3>
                                <span style="display: inline-block; background: #1e3a8a; color: #93c5fd; padding: 2px 6px 3px 6px; border-radius: 6px; font-size: 6.5px; font-weight: bold; line-height: 9px; vertical-align: middle; box-sizing: border-box;">Dermatology</span>
                            </div>
                            <p style="color: #cbd5e1; font-size: 8px; margin: 0; line-height: 13px;">Topical Adapalene 0.1% Gel & Clindamycin Phosphate 1% Lotion applied nightly.</p>
                        </div>
                        <div style="flex: 1; background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 10px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1.5px solid #10b981; padding-bottom: 6px;">
                                <h3 style="color: #34d399; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 12px;">Ayurvedic Herbal Protocols</h3>
                                <span style="display: inline-block; background: #064e3b; color: #6ee7b7; padding: 2px 6px 3px 6px; border-radius: 6px; font-size: 6.5px; font-weight: bold; line-height: 9px; vertical-align: middle; box-sizing: border-box;">Natural Lepa</span>
                            </div>
                            <p style="color: #cbd5e1; font-size: 8px; margin: 0; line-height: 13px;">Lodhradi Lepa botanical formulation with Rose water paste, 20 min application.</p>
                        </div>
                    </div>
                </div>

                <!-- Test 3: Pill Tags Grid -->
                <div style="background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 12px; margin-bottom: 20px;">
                    <h3 style="color: #38bdf8; font-size: 9px; font-weight: bold; margin: 0 0 8px 0; border-bottom: 1px solid #1e293b; padding-bottom: 4px;">Topography & Clinical Symptoms (Pills Test)</h3>
                    <div style="margin-bottom: 6px;">
                        <span style="display: inline-block; background: #020617; border: 1px solid #059669; color: #6ee7b7; padding: 2px 6px 3px 6px; border-radius: 4px; font-size: 7px; font-weight: 600; line-height: 10px; margin: 1px 3px 2px 0; vertical-align: middle;">Face (Cheeks)</span>
                        <span style="display: inline-block; background: #020617; border: 1px solid #059669; color: #6ee7b7; padding: 2px 6px 3px 6px; border-radius: 4px; font-size: 7px; font-weight: 600; line-height: 10px; margin: 1px 3px 2px 0; vertical-align: middle;">Forehead</span>
                        <span style="display: inline-block; background: #020617; border: 1px solid #2563eb; color: #93c5fd; padding: 2px 6px 3px 6px; border-radius: 4px; font-size: 7px; font-weight: 600; line-height: 10px; margin: 1px 3px 2px 0; vertical-align: middle;">Erythema / Redness</span>
                        <span style="display: inline-block; background: #020617; border: 1px solid #d97706; color: #fde68a; padding: 2px 6px 3px 6px; border-radius: 4px; font-size: 7px; font-weight: 600; line-height: 10px; margin: 1px 3px 2px 0; vertical-align: middle;">Sebum Overproduction</span>
                    </div>
                </div>
            \`;

            document.getElementById('test-container').appendChild(testEl);

            const canvas = await html2canvas(testEl, {
                scale: 2,
                useCORS: true,
                scrollY: 0,
                scrollX: 0,
                backgroundColor: '#020617',
                width: 794
            });

            document.getElementById('status').innerText = 'Canvas generated successfully! Sending to server...';
            
            const dataUrl = canvas.toDataURL('image/png');
            
            // Post data URL back to node server
            fetch('/save-canvas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: dataUrl })
            }).then(() => {
                document.getElementById('status').innerText = 'Canvas saved to disk for inspection!';
            });

            // Display on page as well
            const img = document.createElement('img');
            img.src = dataUrl;
            img.style.width = '794px';
            img.style.border = '2px solid #10b981';
            document.getElementById('preview-output').appendChild(img);
        });
    </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(testHtml);
    } else if (req.method === 'POST' && req.url === '/save-canvas') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const data = JSON.parse(body);
            const base64Data = data.image.replace(/^data:image\/png;base64,/, "");
            fs.writeFileSync(path.join(__dirname, 'test_canvas_output.png'), base64Data, 'base64');
            console.log("SUCCESS: test_canvas_output.png saved!");
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(3456, () => {
    console.log("Test server listening on port 3456");
});
