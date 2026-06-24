# PhishGuard | Phishing Email Detector & Security Awareness System

**PhishGuard** is a premium, full-stack cybersecurity application designed to analyze emails for phishing signals, track analysis history, compile live threat intelligence, and educate users about digital threats through interactive quizzes. Developed as a **ReadyNest Week 2 Assignment**.

---

## 🚀 Key Features

*   **Multi-Layered Heuristic Analysis Engine**: Inspects emails for suspicious indicators including deceptive typo-substituted domains, urgency cues, requests for credentials, raw IP addresses, and link shorteners.
*   **Automatic SPF Verification**: Queries real DNS records to authenticate sender domains and flag spoofed emails.
*   **Google Safe Browsing Integration**: Queries Google’s real-time threat intelligence list to verify URL reputations.
*   **Detailed Threat Reporting & Contextual Highlighting**: Uses an index-safe offset highlighter to display flagged threat triggers directly within the email body on both the results card and history detail overlays.
*   **Live Threat Intelligence Feed**: Dynamically aggregates known malicious assets (IPs, keywords, domains, file extensions) from an SQLite database and presents them in a live database tab.
*   **Security Awareness Quiz**: An interactive training module backed by a 50-question bank utilizing the Fisher-Yates shuffle algorithm to generate unique learning sessions.
*   **Glassmorphic Design System**: Supports interactive responsive design, smooth custom gauge animations, and real photography backgrounds styled for both Deep Space Purple (Dark) and Warm Pearl (Light) themes.

---

## 🛠️ Tech Stack

*   **Frontend**: HTML5, Vanilla CSS3, Modern ES6+ JavaScript
*   **Backend**: Python, Flask, Flask-CORS
*   **DNS Resolution**: Dnspython resolver
*   **Database**: SQLite (`phishguard.db`)

---

## 💻 Installation & Local Run

### Prerequisites
*   Python 3.8 or higher installed on your system.

### Steps
1.  **Clone the Repository**:
    ```bash
    git clone <your-repository-url>
    cd <repository-directory>
    ```

2.  **Install Python Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Run the Flask Server**:
    ```bash
    python app.py
    ```
    The server will startup in debug mode, running locally on `http://127.0.0.1:5000`.

4.  **Launch the App UI**:
    Open the `index.html` file in your preferred web browser.

---

## 🔒 Configuration (Google Safe Browsing API)

To enable live Google Safe Browsing URL checking:
1.  Obtain an API key from the [Google Cloud Console](https://console.cloud.google.com/).
2.  Open `app.py`.
3.  Assign your API key to the `GOOGLE_SAFE_BROWSING_API_KEY` constant (or set the environment variable).

---

## 📁 File Structure

```text
├── app.py              # Flask server and heuristics detection engine
├── index.html          # Dashboard, Analyze, History, Awareness, and Quiz tabs
├── style.css           # Styling rules for glassmorphism, animations, and dark/light modes
├── script.js           # Client-side routing, quiz controller, history handlers, and highlighting
├── requirements.txt    # Python dependency list
├── .gitignore          # Exclusions for local databases, caches, and IDE folders
└── README.md           # Documentation
```
