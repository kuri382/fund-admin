const API_BASE_URL = 'http://localhost:8000';

export const fetchUploadedFiles = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/uploaded-files`);
    if (!response.ok) {
      throw new Error('Failed to fetch uploaded files');
    }
    const data = await response.json();
    return data.files;
  } catch (error) {
    console.error('Error fetching uploaded files:', error);
    return [];
  }
};

export const uploadPDF = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    localStorage.setItem('uploadedFileName', data.filename);
    console.log('Upload successful:', data);
    return data.filename;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
};
