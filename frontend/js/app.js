const API_BASE_URL = 'http://localhost:8000';

document.getElementById('startAnalysis').addEventListener('click', function() {
    const fileInput = document.getElementById('pdfUpload');
    const file = fileInput.files[0];

    if (file) {
        const formData = new FormData();
        formData.append('file', file);

        // PDFをアップロードして解析を開始
        fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Upload successful:', data);
            fetchResults();
        })
        .catch(error => {
            console.error('Error uploading PDF:', error);
        });
    } else {
        alert('PDFファイルを選択してください。');
    }
});

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

/*
function fetchResults() {
    fetchSummary('get-summary', 'summary');
    fetchMarkdownContent('get-market-status', 'marketStatus');
    //fetchMarketStatus();
    //fetchFinancialStatus();
    //fetchServicesStatus();
}
*/
function fetchResults() {
    const summaryPromise = fetchSummary('get-summary', 'summary');
    const marketStatusPromise = fetchMarkdownContent('get-market-status', 'marketStatus');

    // Promise.allで並列に処理
    Promise.all([summaryPromise, marketStatusPromise])
        .then(() => {
            console.log('Both summary and market status fetched successfully.');
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
}

function fetchMarkdownContent(endpoint, elementId) {
    // ローカルストレージからファイル名を取得
    const fileName = localStorage.getItem('uploadedFileName');

    // ファイル名をクエリパラメータとしてAPIリクエストに追加
    fetch(`${API_BASE_URL}/${endpoint}?file_name=${encodeURIComponent(fileName)}`)
        .then(response => {
            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let content = '';

            return reader.read().then(function processText({ done, value }) {
                if (done) {
                    console.log("Stream complete");
                    document.getElementById(elementId).innerText = content;
                    return;
                }
                // データをデコードし、内容を累積
                content += decoder.decode(value, { stream: true });
                // 中間結果を更新
                document.getElementById(elementId).innerText = content;
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
