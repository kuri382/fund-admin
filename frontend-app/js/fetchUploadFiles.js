function fetchUploadedFiles() {
    fetch(`${API_BASE_URL}/uploaded-files`)
        .then(response => response.json())
        .then(data => {
            const dropdown = document.getElementById('fileDropdown');
            dropdown.innerHTML = ''; // 既存のオプションをクリア

            const defaultOption = document.createElement('option');
            defaultOption.value = '';
            defaultOption.textContent = '-- ファイルを選択 --';
            dropdown.appendChild(defaultOption);

            data.files.forEach(file => {
                const option = document.createElement('option');
                option.value = file;
                option.textContent = file;
                dropdown.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching uploaded files:', error));
}

document.getElementById('fileDropdown').addEventListener('change', function() {
    const selectedFile = this.value;
    if (selectedFile) {
        localStorage.setItem('uploadedFileName', selectedFile);
        console.log(`Selected file ${selectedFile} saved to localStorage.`);
    }
});