import re
import sqlite3
import json
import os
import requests
import dns.resolver
from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

DB_PATH = 'phishguard.db'
GOOGLE_SAFE_BROWSING_API_KEY = os.environ.get('GOOGLE_SAFE_BROWSING_API_KEY', '')

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT,
            sender TEXT,
            subject TEXT,
            body TEXT,
            score INTEGER,
            spf_pass BOOLEAN,
            attachment TEXT,
            findings TEXT,
            malicious_urls TEXT
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS threat_intel (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT,
            value TEXT,
            severity TEXT,
            date_added TEXT
        )
    ''')
    c.execute('PRAGMA table_info(history)')
    existing_columns = [row[1] for row in c.fetchall()]
    if 'findings' not in existing_columns:
        c.execute('ALTER TABLE history ADD COLUMN findings TEXT')
    if 'malicious_urls' not in existing_columns:
        c.execute('ALTER TABLE history ADD COLUMN malicious_urls TEXT')
    if 'body' not in existing_columns:
        c.execute('ALTER TABLE history ADD COLUMN body TEXT')

    c.execute('DROP TABLE IF EXISTS threat_intel')
    c.execute('''
        CREATE TABLE threat_intel (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT,
            value TEXT,
            severity TEXT,
            date_added TEXT
        )
    ''')
    threats = [
        ('domain', 'paypa1-support.com', 'HIGH', datetime.now().isoformat()),
        ('domain', 'secure-paypal-login.net', 'CRITICAL', datetime.now().isoformat()),
        ('domain', 'amazon-account-verify.xyz', 'HIGH', datetime.now().isoformat()),
        ('domain', 'bank-security-alert-update.net', 'HIGH', datetime.now().isoformat()),
        ('domain', 'appleid-locked-verify.com', 'CRITICAL', datetime.now().isoformat()),
        ('domain', 'netflix-billing-update.xyz', 'HIGH', datetime.now().isoformat()),
        ('domain', 'microsoft-security-alert.net', 'CRITICAL', datetime.now().isoformat()),
        ('domain', 'chase-online-verify.com', 'CRITICAL', datetime.now().isoformat()),
        ('domain', 'fedex-package-tracking.info', 'HIGH', datetime.now().isoformat()),
        ('domain', 'meta-security-support.org', 'HIGH', datetime.now().isoformat()),
        ('domain', 'dhl-delivery-tracking.biz', 'HIGH', datetime.now().isoformat()),
        ('domain', 'steam-community-promo.ru', 'CRITICAL', datetime.now().isoformat()),
        ('ip', '192.168.1.55', 'CRITICAL', datetime.now().isoformat()),
        ('ip', '185.234.219.47', 'CRITICAL', datetime.now().isoformat()),
        ('ip', '45.142.212.100', 'HIGH', datetime.now().isoformat()),
        ('ip', '193.109.133.25', 'CRITICAL', datetime.now().isoformat()),
        ('ip', '103.86.122.18', 'HIGH', datetime.now().isoformat()),
        ('ip', '85.25.120.44', 'HIGH', datetime.now().isoformat()),
        ('ip', '185.190.140.10', 'CRITICAL', datetime.now().isoformat()),
        ('keyword', 'immediate action required or account locked', 'MEDIUM', datetime.now().isoformat()),
        ('keyword', 'verify your account within 24 hours', 'MEDIUM', datetime.now().isoformat()),
        ('keyword', 'your account has been compromised', 'HIGH', datetime.now().isoformat()),
        ('keyword', 'urgently verify your identity', 'HIGH', datetime.now().isoformat()),
        ('keyword', 'billing info update required', 'MEDIUM', datetime.now().isoformat()),
        ('keyword', 'your visa card is suspended', 'HIGH', datetime.now().isoformat()),
        ('keyword', 'parcel delivery failed download receipt', 'HIGH', datetime.now().isoformat()),
        ('keyword', 'unauthorized login attempt detected', 'HIGH', datetime.now().isoformat()),
        ('keyword', 'win free iphone now', 'MEDIUM', datetime.now().isoformat()),
        ('keyword', 'action required: secure your password', 'HIGH', datetime.now().isoformat()),
        ('extension', '.scr', 'CRITICAL', datetime.now().isoformat()),
        ('extension', '.exe', 'CRITICAL', datetime.now().isoformat()),
        ('extension', '.vbs', 'CRITICAL', datetime.now().isoformat()),
        ('extension', '.bat', 'CRITICAL', datetime.now().isoformat()),
        ('extension', '.cmd', 'CRITICAL', datetime.now().isoformat()),
        ('extension', '.ps1', 'CRITICAL', datetime.now().isoformat()),
        ('extension', '.hta', 'CRITICAL', datetime.now().isoformat()),
        ('extension', '.msi', 'CRITICAL', datetime.now().isoformat()),
        ('shortener', 'bit.ly', 'MEDIUM', datetime.now().isoformat()),
        ('shortener', 'tinyurl.com', 'MEDIUM', datetime.now().isoformat()),
        ('shortener', 't.co', 'MEDIUM', datetime.now().isoformat()),
        ('shortener', 'goo.gl', 'MEDIUM', datetime.now().isoformat()),
        ('shortener', 'ow.ly', 'MEDIUM', datetime.now().isoformat()),
        ('shortener', 'rb.gy', 'MEDIUM', datetime.now().isoformat()),
    ]
    c.executemany('INSERT INTO threat_intel (type, value, severity, date_added) VALUES (?, ?, ?, ?)', threats)
    conn.commit()
    conn.close()

def check_spf(domain):
    if not domain:
        return False
    try:
        answers = dns.resolver.resolve(domain, 'TXT', lifetime=3)
        for rdata in answers:
            txt = rdata.to_text().strip('"')
            if txt.startswith('v=spf1'):
                return True
        return False
    except Exception:
        return False

def check_google_safe_browsing(urls):
    if not GOOGLE_SAFE_BROWSING_API_KEY or not urls:
        return []
    endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={GOOGLE_SAFE_BROWSING_API_KEY}"
    payload = {
        "client": {"clientId": "phishguard", "clientVersion": "1.0.0"},
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url} for url in urls]
        }
    }
    try:
        response = requests.post(endpoint, json=payload, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if 'matches' in data:
                return [match['threat']['url'] for match in data['matches']]
    except Exception:
        pass
    return []

@app.route('/api/analyze', methods=['POST'])
def analyze():
    data = request.json
    sender = data.get('sender', '')
    subject = data.get('subject', '')
    body = data.get('body', '')
    attachment = data.get('attachment', '')

    score = 0
    findings = []
    spf_pass = False

    if sender and '@' in sender:
        domain = sender.split('@')[-1].lower()
        spf_pass = check_spf(domain)
        if not spf_pass:
            score += 35
            findings.append(f'SPF check failed for domain "{domain}". No valid SPF record found — sender may be spoofed.')
        else:
            findings.append(f'SPF record verified for domain "{domain}".')

    sender_lower = sender.lower()
    public_domains = ['@gmail.com', '@yahoo.com', '@hotmail.com', '@outlook.com', '@live.com']
    org_keywords = ['support', 'admin', 'billing', 'security', 'service', 'paypal', 'bank', 'amazon', 'apple']
    if any(pd in sender_lower for pd in public_domains):
        if any(kw in sender_lower for kw in org_keywords):
            score += 30
            findings.append('Sender uses a generic public email domain but claims to be an official organization.')
        else:
            score += 5

    typo_domains = ['paypa1', 'g00gle', 'rnicrosoft', 'amaz0n', 'app1e', 'secrity', 'faceb00k']
    if any(td in sender_lower for td in typo_domains):
        score += 40
        findings.append('Sender domain contains deceptive character substitutions mimicking a well-known brand.')

    if attachment:
        ext = attachment.split('.')[-1].lower() if '.' in attachment else ''
        dangerous_exts = ['exe', 'scr', 'vbs', 'bat', 'cmd', 'jar', 'msi', 'ps1', 'hta', 'pif']
        archive_exts = ['zip', 'rar', '7z', 'gz', 'tar']
        if ext in dangerous_exts:
            score += 50
            findings.append(f'Attachment "{attachment}" uses a dangerous executable extension (.{ext}).')
        elif ext in archive_exts:
            score += 15
            findings.append(f'Attachment is a compressed archive (.{ext}) which may conceal malicious files.')

    combined_text = (subject + ' ' + body).lower()
    urgency_keywords = [
        'urgent', 'immediately', 'action required', 'account suspended', 'verify your account',
        'account locked', 'within 24 hours', 'your account will be closed', 'final notice',
        'warning:', 'click here now', 'respond immediately'
    ]
    urg_matches = [kw for kw in urgency_keywords if kw in combined_text]
    if urg_matches:
        score += min(len(urg_matches) * 12, 30)
        findings.append(f'Detected {len(urg_matches)} urgency trigger(s): "{", ".join(urg_matches[:3])}".')

    cred_keywords = ['password', 'social security', 'ssn', 'credit card', 'cvv', 'pin number', 'login credentials', 'banking details']
    cred_matches = [kw for kw in cred_keywords if kw in combined_text]
    if cred_matches:
        score += 25
        findings.append(f'Email solicits sensitive information: "{", ".join(cred_matches)}".')

    url_regex = r'(https?://[^\s<>"]+)'
    urls = re.findall(url_regex, body)
    has_ip = False
    has_shortener = False
    for url in urls:
        if re.search(r'https?://\d+\.\d+\.\d+\.\d+', url):
            has_ip = True
        if any(s in url for s in ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'rb.gy']):
            has_shortener = True

    if has_ip:
        score += 40
        findings.append('Body contains URLs using raw IP addresses instead of domain names.')
    if has_shortener:
        score += 20
        findings.append('Body contains URL shorteners which can mask malicious destinations.')

    malicious_urls = check_google_safe_browsing(urls)
    if malicious_urls:
        score += 80
        findings.append(f'Google Safe Browsing confirmed {len(malicious_urls)} malicious URL(s) in this email.')

    score = min(score, 100)

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        'INSERT INTO history (date, sender, subject, body, score, spf_pass, attachment, findings, malicious_urls) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        (datetime.now().isoformat(), sender, subject, body, score, spf_pass, attachment,
         json.dumps(findings), json.dumps(malicious_urls))
    )
    conn.commit()
    conn.close()

    return jsonify({
        'score': score,
        'findings': findings,
        'malicious_urls': malicious_urls,
        'spf_pass': spf_pass
    })

@app.route('/api/history', methods=['GET'])
def get_history():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM history ORDER BY id DESC')
    rows = c.fetchall()
    conn.close()
    result = []
    for row in rows:
        item = dict(row)
        item['findings'] = json.loads(item['findings']) if item.get('findings') else []
        item['malicious_urls'] = json.loads(item['malicious_urls']) if item.get('malicious_urls') else []
        result.append(item)
    return jsonify(result)

@app.route('/api/threats', methods=['GET'])
def get_threats():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute('SELECT * FROM threat_intel ORDER BY id DESC')
    rows = c.fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])

init_db()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
