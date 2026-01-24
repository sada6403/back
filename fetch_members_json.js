const http = require('http');
const fs = require('fs');

const file = fs.createWriteStream("members_response.json");
http.get("http://127.0.0.1:3001/api/members?fieldVisitorId=skipauth", function (response) {
    response.pipe(file);
    file.on('finish', function () {
        file.close(() => {
            console.log("Download complete.");
            process.exit(0);
        });
    });
}).on('error', function (err) {
    console.error("Full Error:", err);
    process.exit(1);
});
