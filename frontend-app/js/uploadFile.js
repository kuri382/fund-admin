// ファイルアップロード機能を追加
document.getElementById('pdfUpload').addEventListener('change', async function() {
    const file = this.files[0];
    if (file) {
        console.log('Selected file:', file.name);

        const fileNameElement = document.querySelector('.file-name');
        fileNameElement.textContent = file.name;

        // アップロード状態を表示
        fileNameElement.textContent = `${file.name} (アップロード中...)`;

        try {
            await uploadPDF(file);
            // アップロード成功時の処理
            fileNameElement.textContent = `${file.name} (アップロード完了)`;
            console.log('File uploaded successfully');
        } catch (error) {
            // アップロード失敗時の処理
            fileNameElement.textContent = `${file.name} (アップロード失敗)`;
            console.error('Error uploading file:', error);
            alert('ファイルのアップロードに失敗しました。もう一度お試しください。');
        }
    } else {
        console.log('No file selected');
    }
});

function uploadPDF(file) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);

        fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            localStorage.setItem('uploadedFileName', data.filename);
            console.log('Upload successful:', data);
            resolve(data);
        })
        .catch(error => {
            console.error('Error uploading PDF:', error);
            reject(error);
        });
    });
}