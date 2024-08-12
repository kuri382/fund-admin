const API_BASE_URL = 'http://localhost:8000';

document.getElementById('startAnalysis').addEventListener('click', async () => {
    // サマリーの検索と作成を開始
    updateStepStatus('step1-status', '進行中', 'is-info');
    await fetchMarkdownContent('get-summary', 'summary');
    updateStepStatus('step1-status', '詳細調査中', 'is-success');

    // 市場調査を開始
    updateStepStatus('step2-status', '進行中', 'is-info');
    await fetchMarkdownContent('get-market-status', 'marketStatus');
    updateStepStatus('step2-status', '詳細調査中', 'is-success');

    // 財務状況の解析を開始
    updateStepStatus('step3-status', '進行中', 'is-info');
    await fetchMarkdownContent('get-financial-status', 'financialStatus');
    updateStepStatus('step3-status', '詳細調査中', 'is-success');

    // 各種事業の状況確認を開始
    updateStepStatus('step4-status', '進行中', 'is-info');
    await fetchMarkdownContent('get-services-status', 'servicesStatus');
    updateStepStatus('step4-status', '詳細調査中', 'is-success');

    // 各種事業の状況確認を開始
    await fetchMarkdownContent('get-strong-point', 'servicesStatus');
});

document.querySelectorAll('.tabs li').forEach(tab => {
    tab.addEventListener('click', () => {
        const target = tab.dataset.target;

        // タブのアクティブ状態を切り替え
        document.querySelectorAll('.tabs li').forEach(t => t.classList.remove('is-active'));
        tab.classList.add('is-active');

        // コンテンツの表示を切り替え
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('is-active');
        });
        document.getElementById(target).classList.add('is-active');
    });
});

function updateStepStatus(stepId, statusText, statusClass) {
    const stepElement = document.getElementById(stepId);
    stepElement.textContent = statusText;
    stepElement.className = `tag ${statusClass}`;
}


function uploadPDF(file) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);

        fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            localStorage.setItem('uploadedFileName', data.filename); // アップロード後にファイル名をローカルストレージに保存
            console.log('Upload successful:', data);
            resolve();
        })
        .catch(error => {
            console.error('Error uploading PDF:', error);
            reject(error);
        });
    });
}

function fetchResults() {
    const summaryPromise = fetchSummary('get-summary', 'summary');
    const marketStatusPromise = fetchMarkdownContent('get-market-status', 'marketStatus');

    Promise.all([summaryPromise, marketStatusPromise])
        .then(() => {
            console.log('Both summary and market status fetched successfully.');
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}


document.addEventListener('DOMContentLoaded', function() {
    fetchUploadedFiles();
});

document.getElementById('pdfUpload').addEventListener('change', function() {
    const file = this.files[0];
    if (file) {
        console.log('Selected file:', file.name);

        // ファイル名をローカルストレージに保存
        localStorage.setItem('uploadedFileName', file.name);

        const fileNameElement = document.querySelector('.file-name');
        fileNameElement.textContent = file.name;
    } else {
        console.log('No file selected');
    }
});


function fetchMarkdownContent(endpoint, elementId) {
    const fileName = localStorage.getItem('uploadedFileName');
    fetch(`${API_BASE_URL}/${endpoint}?file_name=${encodeURIComponent(fileName)}`)
        .then(response => {
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let content = '';

            return reader.read().then(function processText({ done, value }) {
                if (done) {
                    console.log("Stream complete");
                    return;
                }
                // データをデコードし、内容を累積
                content += decoder.decode(value, { stream: true });
                // マークダウンをHTMLに変換
                const htmlContent = marked.parse(content);
                // 中間結果を更新
                document.querySelector(`#${elementId} .result-box`).innerHTML = htmlContent;
                // 再帰的に次のチャンクを処理
                return reader.read().then(processText);
            });
        })
        .catch(error => console.error(`Error fetching content from ${endpoint}:`, error));
}


function fetchSummary() {
    // ローカルストレージからファイル名を取得
    const fileName = localStorage.getItem('uploadedFileName');

    // ファイル名をクエリパラメータとしてAPIリクエストに追加
    fetch(`${API_BASE_URL}/get-summary?file_name=${encodeURIComponent(fileName)}`)
        .then(response => {
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let content = '';

            return reader.read().then(function processText({ done, value }) {
                if (done) {
                    console.log("Stream complete");
                    document.getElementById('summary').innerText = content;
                    return;
                }
                // データをデコードし、内容を累積
                content += decoder.decode(value, { stream: true });
                // 中間結果を更新
                document.getElementById('summary').innerText = content;
                // 再帰的に次のチャンクを処理
                return reader.read().then(processText);
            });
        })
        .catch(error => console.error('Error fetching summary:', error));
}

function fetchMarketStatus() {
    fetch(`${API_BASE_URL}/get-market-status`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('marketStatus').innerText = data.market_status;
        })
        .catch(error => console.error('Error fetching market status:', error));
}

function fetchFinancialStatus() {
    fetch(`${API_BASE_URL}/get-financial-status`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('financialStatus').innerText = data.financial_status;
        })
        .catch(error => console.error('Error fetching financial status:', error));
}

function fetchServicesStatus() {
    fetch(`${API_BASE_URL}/get-services-status`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('servicesStatus').innerText = data.services_status;
        })
        .catch(error => console.error('Error fetching services status:', error));
}
