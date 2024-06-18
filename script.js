document.addEventListener('DOMContentLoaded', function() {
  const searchButton = document.getElementById('searchButton');

  searchButton.addEventListener('click', async function() {
    const urlInput = document.getElementById('searchQuery').value.trim();

    if (!urlInput) {
      console.error('Please enter a valid image URL.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3002/images?imageurl=${encodeURIComponent(urlInput)}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const images = await response.json();

      if (images.error) {
        console.error('Error:', images.error);
        alert(`Error: ${images.error}`);
        return;
      }

      const imageUrls = images.map(image => ({ url: image.url, name: image.originalName }));

      if (imageUrls.length === 0) {
        alert("No images to download.");
        return;
      }

      const zip = new JSZip();
      const imgFolder = zip.folder('House_Images/Roof'); // Note: Adjust folder structure as needed

      let fetchedCount = 0;

      function addImageToZip(imageUrl, name) {
        fetch(imageUrl)
          .then(response => response.blob())
          .then(blob => {
            imgFolder.file(name, blob);

            fetchedCount++;

            if (fetchedCount === imageUrls.length) {
              zip.generateAsync({ type: 'blob' })
                .then(function(content) {
                  // Use FileSaver.js to prompt download
                  saveAs(content, 'House_Images_Roof.zip');
                })
                .catch(error => console.error("Error generating ZIP file:", error));
            }
          })
          .catch(error => console.error("Error fetching image:", error));
      }

      imageUrls.forEach(({ url, name }) => {
        addImageToZip(url, name);
      });
    } catch (error) {
      console.error('Error fetching or processing data:', error);
      alert('An error occurred while fetching or processing the image data. Please try again later.');
    }
  });
});
