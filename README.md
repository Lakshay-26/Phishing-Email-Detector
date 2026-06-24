# 🛡️ PhishGuard | Phishing Email Detector & Awareness System

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.8%2B-blue?style=for-the-badge&logo=python&logoColor=yellow" alt="Python Version">
  <img src="https://img.shields.io/badge/Flask-2.0%2B-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask Version">
  <img src="https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
</p>

---

**PhishGuard** is an interactive, full-stack cybersecurity application designed to scan email components (sender headers, email bodies, and file attachments) for phishing indicators. It computes real-time threat scores, displays detailed, color-coded findings, aggregates a live threat intelligence feed, and offers a cybersecurity awareness quiz to train users.

Developed as a **ReadyNest Week 2 Project**.

---

## 🔍 Architecture & Data Flow

When an email is analyzed by PhishGuard, it undergoes a multi-layer inspection:

```text
[ User Email Input ] ──> [ Heuristic Analyzer ] ──> [ DNS SPF Query ]
                                  │                       │
                                  ▼                       ▼
                         [ Keyword Parser ]      [ Domain Check ]
                                  │                       │
                                  ▼                       ▼
                      [ Safe Browsing Check ] ──> [ Scoring Engine ] ──> [ SQLite DB ]
                                                                               │
                                                                               ▼
                                                                     [ Live UI Display ]
```

---

## 📊 Heuristic Scoring Engine Matrix

The Python Flask backend parses email inputs and applies rules to calculate a cumulative risk score (capped at `100` max):

| Trigger Category | Suspicious Indicator | Risk Weight | Severity Level |
| :--- | :--- | :---: | :---: |
| **Authentication** | SPF Record Failure / Domain Spoofing | `+35` | **HIGH** |
| **Impersonation** | Typo-substituted domains (e.g. `paypa1.com`) | `+40` | **HIGH** |
| **Impersonation** | Free domain (Gmail/Yahoo) claiming official company identity | `+30` | **HIGH** |
| **File Safety** | Executable attachments (`.exe`, `.scr`, `.vbs`, `.bat`, etc.) | `+50` | **CRITICAL** |
| **File Safety** | Compressed archive attachments (`.zip`, `.rar`, `.7z`) | `+15` | **MEDIUM** |
| **Behavioral** | Solicitation of credentials/SSN/credit cards | `+25` | **HIGH** |
| **Behavioral** | Urgency triggers (e.g. "locked", "within 24 hours") | `+12 / kw` | **MEDIUM** |
| **Link Integrity** | Raw IP addresses in URL links | `+40` | **HIGH** |
| **Link Integrity** | Masked URL shorteners (`bit.ly`, `tinyurl.com`, etc.) | `+20` | **MEDIUM** |
| **Blacklist** | Google Safe Browsing confirmed malicious URL | `+80` | **CRITICAL** |

*   **Low Risk (`0 - 29`)**: Displayed in emerald green. Safe to read, but vigilance is advised.
*   **Medium Risk (`30 - 69`)**: Displayed in amber. Suspicious elements found, proceed with caution.
*   **High Risk (`70 - 100`)**: Displayed in crimson. Strong indicators of a phishing attempt.

---

## 🌟 Premium Features

### 1. Visual Finding & Explanation Cards
No more basic bullet points. Each detected vulnerability is rendered as a stylized card indicating:
*   Severity badge (Critical, High, Medium, Low)
*   The exact item flagged (e.g. the deceptive link)
*   A clear explanation of what the threat means and how it can harm your system

### 2. Contextual Email Body Highlighting
A robust parser scans the email body and highlights danger zones directly in the text reader (red for critical/high threats, yellow for medium/warnings) so users see exactly what triggered the scanner.

### 3. Live Threat Database Tab
Stores and renders live indicators of compromise (IOCs) from SQLite. Re-seeds fresh phishing domains, keywords, and malicious IPs on every backend reload.

### 4. Fisher-Yates Quiz Engine
An awareness module containing a 50-question database. Every retake shuffles the questions using the Fisher-Yates algorithm, providing 8 completely random challenges to keep training material fresh.

---

## 🛠️ Setup & Running Locally

### Step 1: Clone the Repo
```bash
git clone <your-repo-url>
cd phishguard
```

### Step 2: Install Python dependencies
```bash
pip install -r requirements.txt
```

### Step 3: Launch the Flask Backend
```bash
python app.py
```
The server runs on `http://127.0.0.1:5000`. On boot, it automatically initializes or migrates `phishguard.db` and loads threat database values.

### Step 4: Open the Frontend
Double-click `index.html` in your file explorer to launch the web dashboard.

---

## ⚙️ Google Safe Browsing API Setup
To activate real-time website reputation scanning:
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Enable the **Safe Browsing API**.
3.  Generate an API Key.
4.  Define `GOOGLE_SAFE_BROWSING_API_KEY` as an environment variable, or paste it directly in `app.py`:
    ```python
    GOOGLE_SAFE_BROWSING_API_KEY = "your-api-key-here"
    ```
