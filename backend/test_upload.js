const fs = require('fs');

async function testUpload() {
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const data = 
`--${boundary}\r
Content-Disposition: form-data; name="file"; filename="test.jpg"\r
Content-Type: image/jpeg\r
\r
dummy_image_data\r
--${boundary}--`;

  try {
    const res = await fetch('http://localhost:3001/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: data
    });
    
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Response:", text);
  } catch (err) {
    console.error(err);
  }
}

testUpload();
