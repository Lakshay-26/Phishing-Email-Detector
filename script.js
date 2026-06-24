document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    const bgLayer = document.getElementById('bg-layer');

    let currentTheme = localStorage.getItem('phishGuardTheme') || 'dark';
    htmlElement.setAttribute('data-theme', currentTheme);

    const backgrounds = {
        dark: {
            'dashboard': 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1920&q=80',
            'analyze': 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1920&q=80',
            'history': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1920&q=80',
            'awareness': 'https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=1920&q=80',
            'quiz': 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1920&q=80',
            'database': 'https://images.unsplash.com/photo-1618060932014-4deda4932554?w=1920&q=80'
        },
        light: {
            'dashboard': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1920&q=80',
            'analyze': 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&q=80',
            'history': 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1920&q=80',
            'awareness': 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1920&q=80',
            'quiz': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1920&q=80',
            'database': 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1920&q=80'
        }
    };

    let currentTab = 'dashboard';

    function setBackground(tab) {
        currentTab = tab;
        const url = backgrounds[currentTheme][tab];
        if (url) bgLayer.style.backgroundImage = `url('${url}')`;
    }

    setBackground(currentTab);

    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        htmlElement.setAttribute('data-theme', currentTheme);
        localStorage.setItem('phishGuardTheme', currentTheme);
        setBackground(currentTab);
    });

    const navItems = document.querySelectorAll('.nav-links li');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            tabContents.forEach(t => t.classList.remove('active'));
            item.classList.add('active');
            const target = item.getAttribute('data-tab');
            document.getElementById(target).classList.add('active');
            setBackground(target);
            if (target === 'dashboard' || target === 'history') loadHistory();
            if (target === 'database') loadThreats();
        });
    });

    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : 'https://YOUR_USERNAME.pythonanywhere.com/api';

    let cachedHistory = [];

    const detailOverlay = document.getElementById('history-detail-overlay');
    const closeDetailBtn = document.getElementById('close-detail-btn');

    closeDetailBtn.addEventListener('click', () => {
        detailOverlay.classList.add('hidden');
    });

    detailOverlay.addEventListener('click', (e) => {
        if (e.target === detailOverlay) detailOverlay.classList.add('hidden');
    });

    async function loadHistory() {
        try {
            const res = await fetch(`${API_BASE}/history`);
            cachedHistory = await res.json();
            document.getElementById('stat-total').textContent = cachedHistory.length;
            const threats = cachedHistory.filter(h => h.score >= 50).length;
            document.getElementById('stat-threats').textContent = threats;
            document.getElementById('stat-clean').textContent = cachedHistory.length - threats;
            const historyList = document.getElementById('history-list');
            historyList.innerHTML = '';
            if (cachedHistory.length === 0) {
                historyList.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 2rem;">No analysis history found.</p>';
                return;
            }
            cachedHistory.forEach((item, idx) => {
                const el = document.createElement('div');
                el.className = 'history-item';
                let riskClass = item.score >= 70 ? 'high' : item.score >= 30 ? 'medium' : 'low';
                el.innerHTML = `
                    <div class="history-info">
                        <span class="history-subject">${item.subject || 'No Subject'}</span>
                        <span class="history-date">${new Date(item.date).toLocaleString()} | From: ${item.sender || 'Unknown'}</span>
                    </div>
                    <div class="history-score ${riskClass}">Score: ${item.score}</div>`;
                el.addEventListener('click', () => openHistoryDetail(idx));
                historyList.appendChild(el);
            });
        } catch (e) {
            document.getElementById('history-list').innerHTML = '<p style="color: var(--danger-color); text-align: center; padding: 2rem;">Could not connect to server. Make sure app.py is running.</p>';
        }
    }

    function openHistoryDetail(idx) {
        const item = cachedHistory[idx];
        if (!item) return;

        const riskClass = item.score >= 70 ? 'high' : item.score >= 30 ? 'medium' : 'low';
        const riskLabel = item.score >= 70 ? 'HIGH RISK' : item.score >= 30 ? 'MEDIUM RISK' : 'LOW RISK';

        const labelEl = document.getElementById('detail-risk-label');
        labelEl.textContent = riskLabel;
        labelEl.className = `detail-risk-label ${riskClass}`;

        document.getElementById('detail-score-num').textContent = `${item.score}/100`;

        const gaugeFill = document.getElementById('detail-gauge-fill');
        const gaugeParent = gaugeFill.parentElement;
        gaugeParent.className = `score-gauge`;
        gaugeFill.style.width = '0%';
        gaugeFill.className = 'score-gauge-fill';

        const fakeCard = document.createElement('div');
        fakeCard.className = `score-card ${riskClass}-risk`;
        const computedColor = getComputedStyle(document.documentElement).getPropertyValue(
            riskClass === 'high' ? '--danger-color' : riskClass === 'medium' ? '--warning-color' : '--safe-color'
        ).trim();
        gaugeFill.style.background = computedColor;
        gaugeFill.style.boxShadow = `0 0 10px ${computedColor}`;

        setTimeout(() => { gaugeFill.style.width = `${item.score}%`; }, 50);

        document.getElementById('detail-sender').textContent = item.sender || 'N/A';
        document.getElementById('detail-subject').textContent = item.subject || 'N/A';
        document.getElementById('detail-date').textContent = new Date(item.date).toLocaleString();

        const spfEl = document.getElementById('detail-spf');
        spfEl.textContent = item.spf_pass ? 'PASS ✓' : 'FAIL ✗';
        spfEl.style.color = item.spf_pass ? 'var(--safe-color)' : 'var(--danger-color)';

        document.getElementById('detail-attachment').textContent = item.attachment || 'None';

        const findingsList = document.getElementById('detail-findings');
        findingsList.innerHTML = '';
        const findings = (item.findings || []).filter(f => !f.startsWith('SPF record verified'));
        if (findings.length > 0) {
            findings.forEach(f => {
                const fd = getDetailedFinding(f);
                const card = document.createElement('div');
                card.className = `finding-detail-card ${fd.severity}`;
                card.innerHTML = `
                    <div class="finding-header">
                        <div class="finding-title-row">
                            <span class="finding-badge ${fd.severity}">${fd.severity}</span>
                            <span class="finding-title">${fd.title}</span>
                        </div>
                        <span class="finding-category">${fd.category}</span>
                    </div>
                    <div class="finding-message">${fd.message}</div>
                    <div class="finding-explanation">
                        <strong>What this means:</strong> ${fd.explanation}
                    </div>`;
                findingsList.appendChild(card);
            });
        } else {
            const card = document.createElement('div');
            card.className = 'finding-detail-card low';
            card.innerHTML = `
                <div class="finding-header">
                    <div class="finding-title-row">
                        <span class="finding-badge low">safe</span>
                        <span class="finding-title">No Suspicious Elements</span>
                    </div>
                    <span class="finding-category">Clean</span>
                </div>
                <div class="finding-message">No suspicious elements were detected in this analysis.</div>`;
            findingsList.appendChild(card);
        }

        const bodySection = document.getElementById('detail-body-section');
        const bodyEl = document.getElementById('detail-body');
        if (item.body) {
            bodySection.style.display = 'block';
            let highlightedSender = escapeHtml(item.sender);
            if (!item.spf_pass) {
                highlightedSender = `<span class="hl-danger">${highlightedSender} [SPF FAIL — POSSIBLY SPOOFED]</span>`;
            } else {
                highlightedSender = `<span style="color:var(--safe-color);font-weight:bold;">${highlightedSender} [SPF VERIFIED]</span>`;
            }
            const highlightedBody = highlightEmailBody(item.body, item.malicious_urls);
            bodyEl.innerHTML = `<strong>From:</strong> ${highlightedSender}<br><strong>Subject:</strong> ${escapeHtml(item.subject)}<br><br>${highlightedBody}`;
        } else {
            bodySection.style.display = 'none';
        }

        detailOverlay.classList.remove('hidden');
    }

    async function loadThreats() {
        try {
            const res = await fetch(`${API_BASE}/threats`);
            const threats = await res.json();
            const tbody = document.getElementById('threats-list');
            tbody.innerHTML = '';
            threats.forEach(t => {
                const tr = document.createElement('tr');
                const color = t.severity === 'CRITICAL' ? 'var(--danger-color)' : t.severity === 'HIGH' ? 'var(--warning-color)' : 'var(--text-secondary)';
                tr.innerHTML = `
                    <td style="text-transform:uppercase;font-size:0.85rem;color:var(--text-secondary);">${t.type}</td>
                    <td style="font-family:monospace;">${t.value}</td>
                    <td style="color:${color};font-weight:700;">${t.severity}</td>
                    <td style="color:var(--text-secondary);font-size:0.85rem;">${new Date(t.date_added).toLocaleDateString()}</td>`;
                tbody.appendChild(tr);
            });
        } catch (e) {}
    }

    const analyzeBtn = document.getElementById('analyze-btn');
    const newAnalysisBtn = document.getElementById('new-analysis-btn');
    const formContainer = document.querySelector('.form-container');
    const resultsContainer = document.getElementById('results-container');

    analyzeBtn.addEventListener('click', async () => {
        const sender = document.getElementById('sender').value.trim();
        const subject = document.getElementById('subject').value.trim();
        const body = document.getElementById('body').value.trim();
        const fileInput = document.getElementById('attachment');
        const attachmentName = fileInput.files.length > 0 ? fileInput.files[0].name : '';

        if (!sender && !subject && !body && !attachmentName) return;

        analyzeBtn.textContent = 'Analyzing…';
        analyzeBtn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sender, subject, body, attachment: attachmentName })
            });
            const results = await res.json();
            displayResults(results, sender, subject, attachmentName, body);
            formContainer.classList.add('hidden');
            resultsContainer.classList.remove('hidden');
        } catch (e) {
            alert('Failed to connect to the analysis server. Make sure app.py is running on port 5000.');
        } finally {
            analyzeBtn.textContent = 'Analyze Now';
            analyzeBtn.disabled = false;
        }
    });

    newAnalysisBtn.addEventListener('click', () => {
        document.getElementById('sender').value = '';
        document.getElementById('subject').value = '';
        document.getElementById('body').value = '';
        document.getElementById('attachment').value = '';
        document.getElementById('score-gauge-fill').style.width = '0%';
        resultsContainer.classList.add('hidden');
        formContainer.classList.remove('hidden');
    });

    function escapeHtml(text) {
        if (!text) return '';
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function getDetailedFinding(f) {
        let title = "Suspicious Indicator";
        let category = "General Security Check";
        let severity = "medium";
        let explanation = "This element is typical of unsolicited or suspicious email traffic and could indicate a threat.";

        const fLower = f.toLowerCase();

        if (fLower.includes("spf check failed") || fLower.includes("no valid spf record")) {
            title = "SPF Authentication Failure";
            category = "Sender Spoofing";
            severity = "high";
            explanation = "Sender Policy Framework (SPF) validation failed. SPF is a standard security protocol that verifies if an email was sent from an authorized server of the sender's domain. A failure indicates this email may be spoofed and sent by an attacker pretending to be someone else.";
        } else if (fLower.includes("generic public email domain")) {
            title = "Generic Domain for Official Sender";
            category = "Sender Verification";
            severity = "high";
            explanation = "The sender uses a public free email domain (like Gmail, Yahoo, or Outlook) but claims to represent an official organization. Legitimate organizations use their own registered business domains. This is a common tactic used by phishers to easily register realistic-looking addresses.";
        } else if (fLower.includes("deceptive character substitutions")) {
            title = "Deceptive Brand Lookalike (Typosquatting)";
            category = "Brand Impersonation";
            severity = "high";
            explanation = "The sender's domain contains deceptive character substitutions (like 'paypa1' instead of 'paypal' or 'rn' mimicking 'm'). This is called typosquatting and is a deliberate attempt to impersonate trusted companies and trick recipients into trusting the sender.";
        } else if (fLower.includes("dangerous executable extension")) {
            title = "Dangerous Executable Attachment";
            category = "Malware Delivery";
            severity = "critical";
            explanation = "The attached file has a dangerous executable extension (like .exe, .scr, .vbs). Executing these files can run malicious code that installs viruses, malware, or ransomware on your system. Legitimate companies almost never send executable files via email.";
        } else if (fLower.includes("compressed archive")) {
            title = "Compressed Archive Attachment";
            category = "Malware Defense Bypass";
            severity = "medium";
            explanation = "The attachment is a compressed archive file (like .zip, .rar). Attackers use archives to bundle and hide malicious files from email gateways and antivirus scanners. You should never extract or open files from unexpected archives.";
        } else if (fLower.includes("urgency trigger")) {
            title = "Psychological Pressure (Urgency)";
            category = "Social Engineering";
            severity = "medium";
            explanation = "The email contains words designed to induce panic, fear, or a sense of urgency (e.g., 'urgent', 'suspend', 'immediate'). Attackers use psychological triggers to make you act rashly without taking the time to verify the email through safe, external channels.";
        } else if (fLower.includes("solicits sensitive information")) {
            title = "Sensitive Data Request";
            category = "Credential Harvesting";
            severity = "high";
            explanation = "The email requests sensitive credentials such as passwords, social security numbers, PINs, or banking details. Legitimate organizations (especially banks) will never ask you to reply with or input sensitive credentials directly via email.";
        } else if (fLower.includes("raw ip address")) {
            title = "Raw IP Address in URL";
            category = "Suspicious Link";
            severity = "high";
            explanation = "The email body contains links that use raw IP addresses (e.g., 192.168.1.55) instead of standard, registered domain names (e.g., paypal.com). Attackers use IP addresses to hide the real destination of the link and to bypass simple web reputation systems.";
        } else if (fLower.includes("url shorteners")) {
            title = "Obfuscated Link (URL Shortener)";
            category = "Masked Link";
            severity = "medium";
            explanation = "The email body contains a shortened URL (e.g., bit.ly, tinyurl.com). URL shorteners are used to redirect users while hiding the final destination. Attackers use them to mask malicious domains, making it impossible to check the URL safety before clicking.";
        } else if (fLower.includes("google safe browsing confirmed")) {
            title = "Verified Malicious URL";
            category = "Blacklisted Domain";
            severity = "critical";
            explanation = "Google Safe Browsing has explicitly flagged one or more links in this email as dangerous, deceptive, or hosting malware. Clicking these links will almost certainly result in credential harvesting, phishing, or malware infection.";
        } else if (fLower.includes("spf record verified")) {
            title = "SPF Verified";
            category = "Authentication";
            severity = "low";
            explanation = "The email domain has a valid SPF record, and the sender's mail server is authorized to send email on its behalf. This confirms the email is authenticated, though the sender could still be malicious.";
        }

        return { title, category, severity, message: f, explanation };
    }

    function highlightEmailBody(body, maliciousUrls) {
        let text = body || '';
        if (!text) return '';

        const urgencyKeywords = [
            'urgent', 'immediately', 'action required', 'account suspended', 'verify your account',
            'account locked', 'within 24 hours', 'your account will be closed', 'final notice',
            'warning:', 'click here now', 'respond immediately'
        ];
        const credKeywords = [
            'password', 'social security', 'ssn', 'credit card', 'cvv', 'pin number', 'login credentials', 'banking details'
        ];
        const shorteners = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'rb.gy'];

        let matches = [];

        if (maliciousUrls && maliciousUrls.length > 0) {
            maliciousUrls.forEach(url => {
                let pos = 0;
                while ((pos = text.indexOf(url, pos)) !== -1) {
                    matches.push({
                        start: pos,
                        end: pos + url.length,
                        htmlStart: '<span class="hl-danger">',
                        htmlEnd: ' [MALICIOUS URL]</span>',
                        priority: 5
                    });
                    pos += url.length;
                }
            });
        }

        const ipRegex = /https?:\/\/\d+\.\d+\.\d+\.\d+[^\s<>"]*/gi;
        let m;
        while ((m = ipRegex.exec(text)) !== null) {
            matches.push({
                start: m.index,
                end: m.index + m[0].length,
                htmlStart: '<span class="hl-danger">',
                htmlEnd: ' [RAW IP LINK]</span>',
                priority: 4
            });
        }

        shorteners.forEach(sh => {
            const regex = new RegExp(`https?://[^\\s<>"]*${escapeRegExp(sh)}[^\\s<>"]*`, 'gi');
            let m;
            while ((m = regex.exec(text)) !== null) {
                matches.push({
                    start: m.index,
                    end: m.index + m[0].length,
                    htmlStart: '<span class="hl-warning">',
                    htmlEnd: ' [SHORTENED LINK]</span>',
                    priority: 3
                });
            }
        });

        credKeywords.forEach(kw => {
            const regex = new RegExp(escapeRegExp(kw), 'gi');
            let m;
            while ((m = regex.exec(text)) !== null) {
                matches.push({
                    start: m.index,
                    end: m.index + m[0].length,
                    htmlStart: '<span class="hl-danger">',
                    htmlEnd: ' [SENSITIVE INFO REQUEST]</span>',
                    priority: 2
                });
            }
        });

        urgencyKeywords.forEach(kw => {
            const regex = new RegExp(escapeRegExp(kw), 'gi');
            let m;
            while ((m = regex.exec(text)) !== null) {
                matches.push({
                    start: m.index,
                    end: m.index + m[0].length,
                    htmlStart: '<span class="hl-warning">',
                    htmlEnd: ' [URGENCY TRIGGER]</span>',
                    priority: 1
                });
            }
        });

        matches.sort((a, b) => {
            if (a.start !== b.start) return a.start - b.start;
            return b.priority - a.priority;
        });

        let filteredMatches = [];
        let lastEnd = 0;
        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            if (match.start >= lastEnd) {
                filteredMatches.push(match);
                lastEnd = match.end;
            }
        }

        let resultHtml = '';
        let cursor = 0;
        filteredMatches.forEach(match => {
            resultHtml += escapeHtml(text.substring(cursor, match.start));
            resultHtml += match.htmlStart + escapeHtml(text.substring(match.start, match.end)) + match.htmlEnd;
            cursor = match.end;
        });
        resultHtml += escapeHtml(text.substring(cursor));

        return resultHtml;
    }

    function displayResults(results, sender, subject, attachmentName, body) {
        document.getElementById('res-sender').textContent = sender || 'N/A';
        document.getElementById('res-subject').textContent = subject || 'N/A';
        const spfEl = document.getElementById('res-spf');
        spfEl.textContent = results.spf_pass ? 'PASS ✓' : 'FAIL ✗';
        spfEl.style.color = results.spf_pass ? 'var(--safe-color)' : 'var(--danger-color)';
        const attachEl = document.getElementById('res-attach');
        attachEl.textContent = attachmentName || 'None';
        if (attachmentName) {
            const ext = attachmentName.split('.').pop().toLowerCase();
            if (['exe','scr','vbs','bat','cmd','jar','msi','ps1','hta'].includes(ext)) {
                attachEl.style.color = 'var(--danger-color)';
            } else if (['zip','rar','7z'].includes(ext)) {
                attachEl.style.color = 'var(--warning-color)';
            }
        }

        const scoreCard = document.getElementById('score-card');
        document.getElementById('score-value').textContent = results.score;
        scoreCard.className = 'result-card score-card glass-panel';

        setTimeout(() => {
            document.getElementById('score-gauge-fill').style.width = `${results.score}%`;
        }, 100);

        const riskLevel = document.getElementById('risk-level');
        const scoreMessage = document.getElementById('score-message');
        const scoreIcon = document.getElementById('score-icon');

        if (results.score >= 70) {
            scoreCard.classList.add('high-risk');
            riskLevel.textContent = 'HIGH RISK';
            scoreMessage.textContent = 'Strong indicators of a phishing attempt detected!';
            scoreIcon.innerHTML = '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>';
        } else if (results.score >= 30) {
            scoreCard.classList.add('medium-risk');
            riskLevel.textContent = 'MEDIUM RISK';
            scoreMessage.textContent = 'Suspicious elements found. Proceed with caution.';
            scoreIcon.innerHTML = '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';
        } else {
            scoreCard.classList.add('low-risk');
            riskLevel.textContent = 'LOW RISK';
            scoreMessage.textContent = 'This email looks relatively safe. Stay vigilant.';
            scoreIcon.innerHTML = '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>';
        }

        const findingsList = document.getElementById('findings-list');
        findingsList.innerHTML = '';
        const displayFindings = results.findings.filter(f => !f.startsWith('SPF record verified'));
        if (displayFindings.length > 0) {
            displayFindings.forEach(f => {
                const fd = getDetailedFinding(f);
                const card = document.createElement('div');
                card.className = `finding-detail-card ${fd.severity}`;
                card.innerHTML = `
                    <div class="finding-header">
                        <div class="finding-title-row">
                            <span class="finding-badge ${fd.severity}">${fd.severity}</span>
                            <span class="finding-title">${fd.title}</span>
                        </div>
                        <span class="finding-category">${fd.category}</span>
                    </div>
                    <div class="finding-message">${fd.message}</div>
                    <div class="finding-explanation">
                        <strong>What this means:</strong> ${fd.explanation}
                    </div>`;
                findingsList.appendChild(card);
            });
        } else {
            const card = document.createElement('div');
            card.className = 'finding-detail-card low';
            card.innerHTML = `
                <div class="finding-header">
                    <div class="finding-title-row">
                        <span class="finding-badge low">safe</span>
                        <span class="finding-title">No Suspicious Elements</span>
                    </div>
                    <span class="finding-category">Clean</span>
                </div>
                <div class="finding-message">No suspicious elements detected by automated rules.</div>`;
            findingsList.appendChild(card);
        }

        const recList = document.getElementById('recommendations-list');
        recList.innerHTML = '';
        const recs = results.score >= 50
            ? ['Do not click any links in this email.', 'Do not open or download any attachments.', 'Report this email to your IT / security team.', 'Delete the email immediately.']
            : ['Email appears relatively clean — but always stay cautious.', 'Verify unexpected requests through official channels.'];
        recs.forEach(r => {
            const li = document.createElement('li');
            li.textContent = r;
            recList.appendChild(li);
        });

        let highlightedSender = escapeHtml(sender);
        if (!results.spf_pass) {
            highlightedSender = `<span class="hl-danger">${highlightedSender} [SPF FAIL — POSSIBLY SPOOFED]</span>`;
        } else {
            highlightedSender = `<span style="color:var(--safe-color);font-weight:bold;">${highlightedSender} [SPF VERIFIED]</span>`;
        }

        const highlightedBody = highlightEmailBody(body, results.malicious_urls);

        document.getElementById('highlighted-content').innerHTML =
            `<strong>From:</strong> ${highlightedSender}<br><strong>Subject:</strong> ${escapeHtml(subject)}<br><br>${highlightedBody}`;
    }

    const allQuizQuestions = [
        { q: "Which URL structure is the most suspicious?", options: ["https://www.paypal.com/login", "http://192.168.1.55/secure/login", "https://accounts.google.com"], correct: 1 },
        { q: "An email demands you act 'within 24 hours or your account will be deleted'. This is an example of:", options: ["Good customer service", "Creating a false sense of urgency", "Standard security protocol"], correct: 1 },
        { q: "A mismatch between the 'From' display name and actual email address often indicates:", options: ["A server error", "A spoofed sender address", "The sender changed their name"], correct: 1 },
        { q: "Which file attachment extension is highly dangerous to open unexpectedly?", options: [".txt", ".png", ".exe"], correct: 2 },
        { q: "A legitimate bank will NEVER ask you to:", options: ["Send a monthly statement", "Verify your account at a branch", "Provide your password via email"], correct: 2 },
        { q: "What is 'spear phishing'?", options: ["A generic attack sent to millions", "A targeted attack on a specific person or org", "A phishing attack using phone calls"], correct: 1 },
        { q: "Which is a strong indicator that a website may be fake?", options: ["The site has an HTTPS padlock", "The URL uses 'paypa1.com' instead of 'paypal.com'", "The site loads quickly"], correct: 1 },
        { q: "Your CEO urgently emails you to wire money. What should you do?", options: ["Wire it immediately", "Verify by calling your CEO on a known number", "Reply to the email for more details"], correct: 1 },
        { q: "What does 'SPF' stand for in email security?", options: ["Sender Policy Framework", "Secure Protocol Filter", "Server Protection Format"], correct: 0 },
        { q: "URL shorteners like bit.ly are sometimes dangerous because:", options: ["They make URLs harder to type", "They hide the real destination of a link", "They slow down your browser"], correct: 1 },
        { q: "Which is a sign of a phishing email?", options: ["Your name is correctly spelled in the greeting", "Generic greetings like 'Dear Customer'", "The email comes from a verified company domain"], correct: 1 },
        { q: "What is 'vishing'?", options: ["Phishing using email", "Phishing using voice calls or voicemail", "Phishing using fake websites"], correct: 1 },
        { q: "A login page using 'http://' instead of 'https://' means:", options: ["It is fine to log in", "The connection is unencrypted — be cautious", "Encryption doesn't matter for login"], correct: 1 },
        { q: "You receive an unexpected email with an attachment. The safest action is:", options: ["Open it to check what it is", "Delete it and report it to IT", "Forward it to colleagues for their opinion"], correct: 1 },
        { q: "Which tactic do phishers use to bypass spam filters?", options: ["Using their real company name", "Replacing letters with lookalikes (e.g. 'rn' for 'm')", "Sending emails during business hours"], correct: 1 },
        { q: "What does DKIM stand for?", options: ["Domain Keys Identified Mail", "Digital Key Identity Mechanism", "Data Key Integrity Monitoring"], correct: 0 },
        { q: "A phishing email is BEST identified by:", options: ["Its HTML formatting", "Unexpected requests combined with urgency and suspicious links", "The length of the message"], correct: 1 },
        { q: "Which of these is a safe practice when receiving a suspicious email?", options: ["Clicking the 'Unsubscribe' link", "Hovering over links to check the real URL before clicking", "Replying to ask if the email is legitimate"], correct: 1 },
        { q: "What is 'smishing'?", options: ["Phishing via social media", "Phishing via SMS text messages", "Phishing via email attachments"], correct: 1 },
        { q: "Which type of attachment is generally safest to open from unknown senders?", options: [".pdf (with caution)", ".exe", ".vbs"], correct: 0 },
        { q: "What is a 'watering hole' attack?", options: ["Infecting a website frequently visited by the target", "Sending phishing emails to many users at once", "A denial of service attack"], correct: 0 },
        { q: "Two-factor authentication (2FA) helps because:", options: ["It makes passwords unnecessary", "Even if your password is stolen, the attacker still needs a second factor", "It encrypts all your emails"], correct: 1 },
        { q: "Which of the following best describes a 'man-in-the-middle' attack?", options: ["An attacker physically intercepts your mail", "An attacker secretly intercepts and relays communications between two parties", "An attacker breaks your password by brute force"], correct: 1 },
        { q: "What does a DMARC policy do?", options: ["Encrypts email content", "Tells receiving mail servers how to handle emails that fail SPF or DKIM checks", "Scans attachments for viruses"], correct: 1 },
        { q: "An email from 'noreply@paypal.com.phishingsite.net' is suspicious because:", options: ["It uses 'noreply'", "The actual domain is 'phishingsite.net', not 'paypal.com'", "It does not contain images"], correct: 1 },
        { q: "Which is NOT a reliable way to verify a suspicious email?", options: ["Calling the company on a number from their official website", "Replying to the suspicious email and asking if it is real", "Typing the company's URL directly into your browser"], correct: 1 },
        { q: "Why should you be suspicious of an email with many spelling errors?", options: ["Legitimate companies proofread their communications; errors suggest hasty, automated phishing", "All emails from foreign countries have spelling errors", "Spelling errors are a sign of encryption"], correct: 0 },
        { q: "What is credential harvesting?", options: ["Collecting login usernames and passwords through deception", "Backing up your account credentials securely", "Changing your password frequently"], correct: 0 },
        { q: "What should you do with an email that passes all phishing checks but still feels wrong?", options: ["Trust it because the checks passed", "Trust your instincts and verify through official channels before acting", "Forward it to everyone to warn them"], correct: 1 },
        { q: "An email claims to be from your bank and includes your full name and partial account number. This means:", options: ["It is definitely legitimate since it has your details", "It may still be phishing — attackers can obtain partial info from data breaches", "It is definitely phishing"], correct: 1 },
        { q: "What is 'pretexting' in a social engineering attack?", options: ["Using prewritten email templates", "Creating a fabricated scenario to manipulate a victim into giving information", "Sending phishing links in text messages"], correct: 1 },
        { q: "Which action is BEST after accidentally clicking a suspicious link?", options: ["Wait and see if anything happens", "Disconnect from the internet, run a virus scan, and report it to IT", "Close the browser tab and ignore it"], correct: 1 },
        { q: "What does 'ransomware' typically do after infecting a system?", options: ["Steals your password list", "Encrypts your files and demands payment for the decryption key", "Slows down your internet connection"], correct: 1 },
        { q: "Why are public Wi-Fi networks risky for accessing email?", options: ["Public Wi-Fi is always slower", "Unencrypted traffic can be intercepted by attackers on the same network", "Public Wi-Fi blocks email ports"], correct: 1 },
        { q: "What does 'whaling' refer to in cybersecurity?", options: ["Phishing attacks targeted at senior executives (e.g., CEO, CFO)", "Large-scale phishing attacks targeting thousands of users", "Attacks on whale research institutions"], correct: 0 },
        { q: "A password manager is beneficial because:", options: ["It stores all your passwords in a single, easily guessable master password", "It generates and stores unique, strong passwords for every site", "It automatically changes your passwords every day"], correct: 1 },
        { q: "Which of the following is the MOST secure password?", options: ["Password123", "MyDog$Name!2024", "T7#mK!9pLq@3rW"], correct: 2 },
        { q: "What is the primary goal of a Business Email Compromise (BEC) attack?", options: ["To install ransomware on company computers", "To fraudulently transfer money or sensitive data by impersonating a trusted figure", "To disrupt a company's email server"], correct: 1 },
        { q: "How do attackers use 'open redirects' on legitimate websites?", options: ["To speed up their phishing websites", "To create a trusted-looking URL (e.g., google.com/redirect?url=evil.com) that forwards to a malicious site", "To bypass login screens"], correct: 1 },
        { q: "A friend's email account suddenly sends you a message asking for gift card codes. You should:", options: ["Buy the gift cards as it is urgent", "Assume their account was hacked and contact them via phone to verify", "Reply asking for more details"], correct: 1 },
        { q: "What is an 'email header' and why is it useful?", options: ["It is the email subject line — useful for identifying topics", "It contains routing metadata showing the email's true origin — useful for spotting spoofing", "It contains the email's encryption key"], correct: 1 },
        { q: "What is 'typosquatting'?", options: ["Sending emails with deliberate typos", "Registering misspelled domain names to trap users who make typing errors", "Squatting in a server room to intercept traffic"], correct: 1 },
        { q: "Which of these domains is the most suspicious impersonation of 'microsoft.com'?", options: ["microsoft.com", "rnicrosoft.com (uses 'rn' instead of 'm')", "microsoft-support.com"], correct: 1 },
        { q: "What is the purpose of email sandboxing?", options: ["To send emails without revealing your identity", "To run email attachments in an isolated environment to detect malware before delivery", "To delay emails until a scheduled time"], correct: 1 },
        { q: "Which attachment type can execute code embedded inside a document?", options: [".jpg", ".mp3", ".docm (macro-enabled Word document)"], correct: 2 },
        { q: "What is 'clone phishing'?", options: ["Creating an exact replica of a legitimate email but replacing links with malicious ones", "Using AI to clone a person's voice for vishing attacks", "Phishing using identical-looking websites"], correct: 0 },
        { q: "An attacker sends you a LinkedIn connection request and then a phishing link. This is an example of:", options: ["Spear phishing using social media research", "Random phishing", "Email bombing"], correct: 0 },
        { q: "What makes phishing simulations run by an IT department valuable?", options: ["They punish employees for clicking links", "They train employees to recognize phishing in a safe, controlled environment", "They replace the need for antivirus software"], correct: 1 },
        { q: "Why is it dangerous to reuse passwords across multiple sites?", options: ["It is not dangerous if the password is strong", "A breach at one site gives attackers access to all accounts with the same password", "It causes websites to load more slowly"], correct: 1 },
        { q: "What should you do if you receive an email that your CEO's email account sends a strange file?", options: ["Open it since it is from the CEO", "Verify with the CEO through a separate communication channel before opening", "Forward it to colleagues to see if they got it too"], correct: 1 }
    ];

    let quizQuestions = [];
    let currentQuizIndex = 0;
    let quizScore = 0;

    function shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function pickQuizQuestions() {
        quizQuestions = shuffleArray(allQuizQuestions).slice(0, 8);
    }

    const startQuizBtn = document.getElementById('start-quiz-btn');
    const nextQuestionBtn = document.getElementById('next-question-btn');
    const restartQuizBtn = document.getElementById('restart-quiz-btn');
    const quizStartDiv = document.getElementById('quiz-start');
    const quizQuestionContainer = document.getElementById('quiz-question-container');
    const quizResultDiv = document.getElementById('quiz-result');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const quizFeedback = document.getElementById('quiz-feedback');

    startQuizBtn.addEventListener('click', () => {
        quizStartDiv.classList.add('hidden');
        quizQuestionContainer.classList.remove('hidden');
        pickQuizQuestions();
        currentQuizIndex = 0;
        quizScore = 0;
        loadQuestion();
    });

    restartQuizBtn.addEventListener('click', () => {
        quizResultDiv.classList.add('hidden');
        pickQuizQuestions();
        currentQuizIndex = 0;
        quizScore = 0;
        quizStartDiv.classList.remove('hidden');
    });

    nextQuestionBtn.addEventListener('click', () => {
        currentQuizIndex++;
        if (currentQuizIndex < quizQuestions.length) {
            loadQuestion();
        } else {
            showQuizResults();
        }
    });

    function loadQuestion() {
        nextQuestionBtn.classList.add('hidden');
        quizFeedback.textContent = '';
        const qData = quizQuestions[currentQuizIndex];
        questionText.textContent = `Question ${currentQuizIndex + 1} of ${quizQuestions.length}: ${qData.q}`;
        optionsContainer.innerHTML = '';
        qData.options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-option';
            btn.textContent = opt;
            btn.addEventListener('click', () => handleQuizAnswer(index, btn));
            optionsContainer.appendChild(btn);
        });
    }

    function handleQuizAnswer(selectedIndex, btnElement) {
        const qData = quizQuestions[currentQuizIndex];
        const allOptions = optionsContainer.querySelectorAll('.quiz-option');
        allOptions.forEach(btn => btn.disabled = true);
        if (selectedIndex === qData.correct) {
            btnElement.classList.add('correct');
            quizFeedback.textContent = 'Correct!';
            quizFeedback.style.color = 'var(--safe-color)';
            quizScore++;
        } else {
            btnElement.classList.add('wrong');
            allOptions[qData.correct].classList.add('correct');
            quizFeedback.textContent = 'Incorrect!';
            quizFeedback.style.color = 'var(--danger-color)';
        }
        nextQuestionBtn.classList.remove('hidden');
    }

    function showQuizResults() {
        quizQuestionContainer.classList.add('hidden');
        quizResultDiv.classList.remove('hidden');
        document.getElementById('final-quiz-score').textContent = `${quizScore} / ${quizQuestions.length}`;
        const msg = document.getElementById('quiz-final-message');
        if (quizScore === quizQuestions.length) {
            msg.textContent = 'Perfect score! You are a certified phishing detection expert.';
        } else if (quizScore >= Math.ceil(quizQuestions.length * 0.7)) {
            msg.textContent = 'Great job! A few more sessions and you will be unphishable.';
        } else if (quizScore >= Math.ceil(quizQuestions.length * 0.4)) {
            msg.textContent = 'Good effort. Review the Security Awareness section to strengthen your knowledge.';
        } else {
            msg.textContent = 'You may be at risk. Please study the Awareness tips and retake the quiz.';
        }
    }

    loadHistory();
});
