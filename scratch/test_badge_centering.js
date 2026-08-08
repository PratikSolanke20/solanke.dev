const fs = require('fs');
const path = require('path');
const http = require('http');

console.log("Starting Badge Centering Visual Test Server...");

const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Badge Centering Test</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 20px; background: #020617; font-family: 'Inter', -apple-system, sans-serif; color: #fff; }
        .grid { display: flex; flex-direction: column; gap: 15px; margin-top: 20px; }
        .row { background: #0f172a; padding: 15px; border-radius: 8px; border: 1px solid #1e293b; }
        .label { font-size: 11px; color: #94a3b8; margin-bottom: 8px; font-family: monospace; }
    </style>
</head>
<body>
    <h2>html2canvas Badge Vertical Centering Matrix</h2>
    <div id="status">Testing...</div>
    <div id="test-root" style="width: 794px; background: #020617; padding: 20px;">
        
        <!-- VARIANT A: Current Code -->
        <div class="row">
            <div class="label">Variant A (Current in code: padding 2px 6px 3px 6px, line-height 10px)</div>
            <span style="display: inline-block; background: #064e3b; border: 1px solid #10b981; color: #34d399; padding: 3px 10px 4px 10px; border-radius: 20px; font-size: 8.5px; font-weight: bold; line-height: 12px; vertical-align: middle;">
                Moderate to Severe (55% impacted)
            </span>
            <span style="display: inline-block; background: #020617; border: 1px solid #059669; color: #6ee7b7; padding: 2px 6px 3px 6px; border-radius: 4px; font-size: 7px; font-weight: 600; line-height: 10px; vertical-align: middle;">
                Face (Cheeks)
            </span>
            <span style="display: inline-block; background: #1e3a8a; color: #93c5fd; padding: 2px 6px 3px 6px; border-radius: 6px; font-size: 6.5px; font-weight: bold; line-height: 9px; vertical-align: middle;">
                Dermatology
            </span>
            <span style="display: inline-block; background: #064e3b; color: #6ee7b7; padding: 2px 6px 3px 6px; border-radius: 6px; font-size: 6.5px; font-weight: bold; line-height: 9px; vertical-align: middle;">
                Natural Lepa
            </span>
        </div>

        <!-- VARIANT B: Explicit Height + Line-Height = Height (Zero Vertical Padding) -->
        <div class="row">
            <div class="label">Variant B (height: 16px, line-height: 16px, padding: 0 8px)</div>
            <span style="display: inline-block; background: #064e3b; border: 1px solid #10b981; color: #34d399; height: 18px; line-height: 17px; padding: 0 10px; border-radius: 20px; font-size: 8.5px; font-weight: bold; vertical-align: middle;">
                Moderate to Severe (55% impacted)
            </span>
            <span style="display: inline-block; background: #020617; border: 1px solid #059669; color: #6ee7b7; height: 15px; line-height: 14px; padding: 0 6px; border-radius: 4px; font-size: 7px; font-weight: 600; vertical-align: middle;">
                Face (Cheeks)
            </span>
            <span style="display: inline-block; background: #1e3a8a; color: #93c5fd; height: 14px; line-height: 13px; padding: 0 6px; border-radius: 5px; font-size: 6.5px; font-weight: bold; vertical-align: middle;">
                Dermatology
            </span>
            <span style="display: inline-block; background: #064e3b; color: #6ee7b7; height: 14px; line-height: 13px; padding: 0 6px; border-radius: 5px; font-size: 6.5px; font-weight: bold; vertical-align: middle;">
                Natural Lepa
            </span>
        </div>

        <!-- VARIANT C: Negative Margin / Transform or Shift Offset for html2canvas -->
        <div class="row">
            <div class="label">Variant C (Line-height equal to height - 2px, padding: 0 6px)</div>
            <span style="display: inline-block; background: #064e3b; border: 1px solid #10b981; color: #34d399; height: 18px; line-height: 16px; padding: 0 10px; border-radius: 20px; font-size: 8.5px; font-weight: bold; vertical-align: middle;">
                Moderate to Severe (55% impacted)
            </span>
            <span style="display: inline-block; background: #020617; border: 1px solid #059669; color: #6ee7b7; height: 15px; line-height: 13px; padding: 0 6px; border-radius: 4px; font-size: 7px; font-weight: 600; vertical-align: middle;">
                Face (Cheeks)
            </span>
            <span style="display: inline-block; background: #1e3a8a; color: #93c5fd; height: 14px; line-height: 12px; padding: 0 6px; border-radius: 5px; font-size: 6.5px; font-weight: bold; vertical-align: middle;">
                Dermatology
            </span>
            <span style="display: inline-block; background: #064e3b; color: #6ee7b7; height: 14px; line-height: 12px; padding: 0 6px; border-radius: 5px; font-size: 6.5px; font-weight: bold; vertical-align: middle;">
                Natural Lepa
            </span>
        </div>

        <!-- VARIANT D: Inline-Flex with align-items center & justify-content center -->
        <div class="row">
            <div class="label">Variant D (display: inline-flex; align-items: center; justify-content: center; height: 16px; padding: 0 8px; line-height: 1;)</div>
            <span style="display: inline-flex; align-items: center; justify-content: center; background: #064e3b; border: 1px solid #10b981; color: #34d399; height: 18px; padding: 0 10px; border-radius: 20px; font-size: 8.5px; font-weight: bold; line-height: 1;">
                Moderate to Severe (55% impacted)
            </span>
            <span style="display: inline-flex; align-items: center; justify-content: center; background: #020617; border: 1px solid #059669; color: #6ee7b7; height: 15px; padding: 0 6px; border-radius: 4px; font-size: 7px; font-weight: 600; line-height: 1;">
                Face (Cheeks)
            </span>
            <span style="display: inline-flex; align-items: center; justify-content: center; background: #1e3a8a; color: #93c5fd; height: 14px; padding: 0 6px; border-radius: 5px; font-size: 6.5px; font-weight: bold; line-height: 1;">
                Dermatology
            </span>
            <span style="display: inline-flex; align-items: center; justify-content: center; background: #064e3b; color: #6ee7b7; height: 14px; padding: 0 6px; border-radius: 5px; font-size: 6.5px; font-weight: bold; line-height: 1;">
                Natural Lepa
            </span>
        </div>

        <!-- VARIANT E: Table / Table-Cell Centering (Rock solid across all renderers) -->
        <div class="row">
            <div class="label">Variant E (display: inline-table / table-cell vertical-align: middle)</div>
            <div style="display: inline-table; background: #064e3b; border: 1px solid #10b981; border-radius: 20px; height: 18px; vertical-align: middle;">
                <span style="display: table-cell; vertical-align: middle; color: #34d399; padding: 0 10px; font-size: 8.5px; font-weight: bold; line-height: 1;">
                    Moderate to Severe (55% impacted)
                </span>
            </div>
            <div style="display: inline-table; background: #020617; border: 1px solid #059669; border-radius: 4px; height: 15px; vertical-align: middle;">
                <span style="display: table-cell; vertical-align: middle; color: #6ee7b7; padding: 0 6px; font-size: 7px; font-weight: 600; line-height: 1;">
                    Face (Cheeks)
                </span>
            </div>
            <div style="display: inline-table; background: #1e3a8a; border-radius: 5px; height: 14px; vertical-align: middle;">
                <span style="display: table-cell; vertical-align: middle; color: #93c5fd; padding: 0 6px; font-size: 6.5px; font-weight: bold; line-height: 1;">
                    Dermatology
                </span>
            </div>
            <div style="display: inline-table; background: #064e3b; border-radius: 5px; height: 14px; vertical-align: middle;">
                <span style="display: table-cell; vertical-align: middle; color: #6ee7b7; padding: 0 6px; font-size: 6.5px; font-weight: bold; line-height: 1;">
                    Natural Lepa
                </span>
            </div>
        </div>

        <!-- VARIANT F: Line & Underline tests -->
        <div class="row">
            <div class="label">Variant F: Heading Bottom Lines / Card Headers</div>
            
            <div style="display: flex; gap: 15px; margin-top: 10px;">
                <!-- Old style -->
                <div style="flex: 1; background: #020617; border: 1px solid #1e293b; padding: 10px; border-radius: 6px;">
                    <div style="font-size: 9px; color: #94a3b8; margin-bottom: 4px;">Old: border-bottom with line-height 12px</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #10b981; padding-bottom: 4px; margin-bottom: 6px;">
                        <h3 style="color: #34d399; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 12px;">Ayurvedic Herbal Protocols</h3>
                        <span style="display: inline-block; background: #064e3b; color: #6ee7b7; padding: 2px 6px 3px 6px; border-radius: 6px; font-size: 6.5px; font-weight: bold; line-height: 9px;">Natural Lepa</span>
                    </div>
                </div>

                <!-- New Hardened style with explicit spacing & separate decorative divider line -->
                <div style="flex: 1; background: #020617; border: 1px solid #1e293b; padding: 10px; border-radius: 6px;">
                    <div style="font-size: 9px; color: #94a3b8; margin-bottom: 4px;">New: separate horizontal divider + table-cell badges</div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                        <h3 style="color: #34d399; font-size: 8.5px; font-weight: bold; margin: 0; text-transform: uppercase; line-height: 1.3;">Ayurvedic Herbal Protocols</h3>
                        <div style="display: inline-table; background: #064e3b; border-radius: 5px; height: 15px; vertical-align: middle;">
                            <span style="display: table-cell; vertical-align: middle; color: #6ee7b7; padding: 0 6px; font-size: 6.5px; font-weight: bold; line-height: 1;">Natural Lepa</span>
                        </div>
                    </div>
                    <div style="height: 1.5px; background: #10b981; width: 100%; margin-bottom: 8px;"></div>
                    <p style="color: #cbd5e1; font-size: 8px; margin: 0; line-height: 13px;">Lodhradi Lepa botanical formulation with Rose water paste, 20 min application.</p>
                </div>
            </div>
        </div>

    </div>

    <script>
        window.addEventListener('load', async () => {
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }
            await new Promise(r => setTimeout(r, 200));

            const testEl = document.getElementById('test-root');
            const canvas = await html2canvas(testEl, {
                scale: 2,
                useCORS: true,
                scrollY: 0,
                scrollX: 0,
                backgroundColor: '#020617',
                width: 794
            });

            const dataUrl = canvas.toDataURL('image/png');
            fetch('/save-test-canvas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: dataUrl })
            }).then(() => {
                document.getElementById('status').innerText = 'RENDER COMPLETED & SAVED TO DISK!';
            });
        });
    </script>
</body>
</html>
`;

const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(htmlContent);
    } else if (req.method === 'POST' && req.url === '/save-test-canvas') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            const data = JSON.parse(body);
            const base64Data = data.image.replace(/^data:image\/png;base64,/, "");
            fs.writeFileSync(path.join(__dirname, 'badge_matrix_comparison.png'), base64Data, 'base64');
            console.log("SUCCESS: badge_matrix_comparison.png saved successfully!");
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});

server.listen(3457, () => {
    console.log("Badge test server listening on port 3457");
});
